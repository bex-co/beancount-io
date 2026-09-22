"""Preview and apply bank-export entries — the accounting side of `bea import`.

The frontend owns option parsing, remembered importer/CSV paths, and the human
preview table. This module loads the ledger, runs a CSV mapper or configured
Beangulp importer, deduplicates, validates, and optionally appends.
"""

from __future__ import annotations

import copy
import difflib
import hashlib
import io
import runpy
import sys
import unicodedata
from contextlib import redirect_stderr, redirect_stdout
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.writer import format_entry, normalize_entry_strings
from bea_engine.protocol import ConflictError, EngineError, LedgerError, UsageError
from bea_engine.query import format_error

_IDENTITY_KINDS = {
    "bank_id": "bank",
    "fitid": "ofx",
    "transaction_id": "bank",
    "imported_id": "bank",
}

_DEFAULT_ID_KEYS = ["bank_id", "fitid", "transaction_id", "imported_id"]


def _effective_id_keys(id_keys: list[str] | None) -> list[str]:
    """Resolve `--id-key` values to metadata keys the CSV mapper actually writes.

    CSV `id=` always lands in `bank_id` metadata. Agents often pass `--id-key id`
    after naming the column that way; treat that alias as `bank_id` so bank-ID
    dedupe stays on instead of falling back to content hashes.
    """
    if not id_keys:
        return list(_DEFAULT_ID_KEYS)
    resolved: list[str] = []
    seen: set[str] = set()
    for key in id_keys:
        mapped = "bank_id" if key == "id" else key
        if mapped not in seen:
            seen.add(mapped)
            resolved.append(mapped)
    return resolved


def answer(
    file: Path,
    source: Path,
    *,
    csv_mapping: str | None = None,
    csv_account: str | None = None,
    date_format: str | None = None,
    delimiter: str | None = None,
    encoding: str | None = None,
    rules_file: Path | None = None,
    default_account: str | None = None,
    config: Path | None = None,
    importer_name: str | None = None,
    apply: bool = False,
    duplicates: str = "review",
    id_keys: list[str] | None = None,
    into: Path | None = None,
    allow_errors: bool = False,
    config_source: str = "--config",
) -> dict[str, Any]:
    """Extract, review, optionally write, and answer with the preview payload.

    `duplicates` is `review`, `skip`, or `include`. Exact stable-ID matches are
    always skipped. Nothing is written unless `--apply` is set and the preview
    is free of conflicts / unresolved possible duplicates / validation errors.
    """
    from beancount.core.data import Open, Transaction

    from bea_engine import managed_load
    from bea_engine.csv_mapper import CsvImporter, load_rules, parse_delimiter, parse_encoding, parse_mapping

    if duplicates not in {"review", "skip", "include"}:
        raise UsageError(f"--duplicates must be review, skip, or include; got {duplicates!r}.")
    if csv_mapping is not None and config is not None:
        raise UsageError("Pass --csv or --config, not both.")

    file = file.resolve()
    source = source.expanduser().resolve()
    if not source.is_file():
        raise UsageError(f"Export file not found: {source}")

    source_bytes = source.read_bytes()
    snapshot = ledger_write.LedgerSnapshot.capture(file)
    target = ledger_write.destination(file, into)
    snapshot.require_target(target)
    original = target.read_bytes()
    existing, errors, options = managed_load.load_file(file)
    if not allow_errors and errors:
        raise LedgerError(
            f"Ledger has {len(errors)} error(s). Pass --allow-errors to preview and apply anyway.",
            details=[format_error(error, ledger_file=file) for error in errors],
        )

    logs = io.StringIO()
    notes: list[str] = []
    csv_mode = csv_mapping is not None
    skipped_blank = 0
    if csv_mode:
        if csv_account is None or csv_mapping is None:
            raise UsageError(
                "--csv needs --account ACCOUNT for the source account, for example --account Assets:Checking."
            )
        mapping = parse_mapping(csv_mapping)
        default_account = default_account or "Expenses:Uncategorized"
        resolved_date_format = date_format or "%Y-%m-%d"
        resolved_delimiter = parse_delimiter(delimiter) if delimiter is not None else None
        resolved_encoding = parse_encoding(encoding) if encoding is not None else "utf-8"
        operating = options.get("operating_currency") or []
        importer: Any = CsvImporter(
            account=csv_account,
            mapping=mapping,
            date_format=resolved_date_format,
            rules=load_rules(Path(rules_file)) if rules_file is not None else None,
            default_account=default_account,
            currency=operating[0] if len(operating) == 1 else None,
            delimiter=resolved_delimiter,
            encoding=resolved_encoding,
        )
        preview_config = csv_mapping
        try:
            account = str(importer.account(str(source)))
            with redirect_stdout(logs), redirect_stderr(logs):
                entries = copy.deepcopy(list(importer.extract(str(source), existing)))
        except EngineError:
            raise
        except Exception as exc:
            raise LedgerError(
                f"Importer failed ({type(exc).__name__}): {exc}.",
                traceback=_traceback(exc),
            ) from exc
        skipped_blank = importer.skipped_blank_rows
        if importer.rejected_categories:
            examples = ", ".join(repr(name) for name in list(importer.rejected_categories)[:3])
            count = sum(importer.rejected_categories.values())
            notes.append(
                f"{count} row(s) carry a category that is not an account name ({examples}); they post to "
                f"{default_account} with flag '!'. Categorize them with --rules, or map a column of full "
                "account names with --csv category=Column."
            )
    else:
        if config is None:
            raise UsageError("Choose a Python importer with --config FILE, or use --csv for a column mapping.")
        config = config.expanduser().resolve()
        preview_config = str(config)
        sys.path.insert(0, str(config.parent))
        try:
            with redirect_stdout(logs), redirect_stderr(logs):
                importer = _importer(config, source, importer_name)
                account = str(importer.account(str(source)))
                entries = copy.deepcopy(list(importer.extract(str(source), existing)))
        except EngineError:
            raise
        except ImportError as exc:
            # This handler runs inside the engine, so the module is missing from
            # the engine's environment — not from whatever launched `bea`.
            # Installing it beside the frontend changes nothing here.
            raise UsageError(
                f"Importer dependency is unavailable: {exc}. Importer configurations are executed by the "
                "managed engine, not the environment you run bea from, so the package has to be installed "
                "there; 'bea engine status' prints which engine serves and where it lives. "
                "See docs/IMPORTING.md.",
                traceback=_traceback(exc),
            ) from exc
        except Exception as exc:
            raise LedgerError(
                f"Importer failed ({type(exc).__name__}): {exc}.",
                traceback=_traceback(exc),
            ) from exc
        finally:
            sys.path.pop(0)

    keys = _effective_id_keys(id_keys)
    identities: dict[tuple[str, str, str], Any] = {}
    fingerprints: dict[tuple[Any, ...], Any] = {}
    open_currencies: dict[str, set[str] | None] = {}
    for entry in existing:
        entry = normalize_entry_strings(entry)
        if isinstance(entry, Open):
            if not entry.currencies:
                open_currencies[entry.account] = None
            else:
                previous = open_currencies.get(entry.account, set())
                if previous is not None:
                    open_currencies[entry.account] = previous | set(entry.currencies)
        if isinstance(entry, Transaction) and any(p.account == account for p in entry.postings):
            for identity in _identities(entry, account, keys):
                identities[identity] = entry
            fingerprints[_candidate_key(entry, account)] = entry
    if source.read_bytes() != source_bytes:
        raise ConflictError("The export changed during extraction; nothing was written. Retry.")
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    other_entries = {format_entry(entry) for entry in existing if not isinstance(entry, Transaction)}
    rows: list[dict[str, Any]] = []
    texts: list[str] = []
    conflicts = False
    seen_inputs: dict[str, int] = {}
    batch_rows: dict[int, int] = {}
    for index, entry in enumerate(entries):
        entry = normalize_entry_strings(entry)
        status, reason, match = "new", None, None
        id_source: str | None = None
        legacy_id: str | None = None
        if isinstance(entry, Transaction):
            if not any(p.account == account for p in entry.postings):
                raise LedgerError(f"Importer row {index + 1} has no posting to its source account {account}.")
            fingerprint = _fingerprint(entry, account)
            if entry.meta.get("import-id"):
                id_source = "importer"
            else:
                native = _native_import_id(entry.meta, keys)
                if native is not None:
                    entry.meta["import-id"] = native
                    id_source = "bank"
                else:
                    entry.meta["import-id"], legacy_id = _hash_import_ids(entry, account, seen_inputs)
                    id_source = "hash"
            ids = _identities(entry, account, keys)
            if legacy_id is not None:
                ids.append((account, "import-id", legacy_id))
            ids.append((account, "file", hashlib.sha256(f"{account}:{source_hash}:{index}".encode()).hexdigest()))
            hits = [(key, identities[key]) for key in ids if key in identities]
            if hits:
                (_, kind, matched_value), match = hits[0]
                if any(_fingerprint(m, account) != fingerprint for _, m in hits):
                    status, reason, conflicts = (
                        "conflict",
                        "Stable ID matches an entry with different transaction data.",
                        True,
                    )
                elif kind == "file":
                    status, reason = "duplicate", "Previously imported source row matches."
                else:
                    status, reason = "duplicate", f"import-id {matched_value} is already in the ledger."
            elif _candidate_key(entry, account) in fingerprints:
                status, reason, match = (
                    "possible_duplicate",
                    "Date, payee and source amount match; different bank IDs or narration do not rule out a duplicate.",
                    fingerprints[_candidate_key(entry, account)],
                )
            if status == "new" or (status == "possible_duplicate" and duplicates == "include"):
                for identity in ids:
                    identities[identity] = entry
                fingerprints[_candidate_key(entry, account)] = entry
                batch_rows[id(entry)] = index + 1
        rule = entry.meta.pop("_csv_rule", None) if isinstance(entry, Transaction) else None
        text = format_entry(entry)
        if not isinstance(entry, Transaction):
            if text in other_entries:
                status, reason = "duplicate", "Identical directive already exists."
            other_entries.add(text)
        include = status == "new" or (status == "possible_duplicate" and duplicates == "include")
        if include and isinstance(entry, Transaction):
            blocked_reason = _blocked_reason(entry, open_currencies)
            if blocked_reason is not None:
                status, reason, include = "blocked", blocked_reason, False
        if include:
            texts.append(text)
        row_dict: dict[str, Any] = {
            "row": index + 1,
            "status": status,
            "reason": reason,
            "id_source": id_source,
            "include": include,
            "entry": text,
            "accounts": [p.account for p in entry.postings] if isinstance(entry, Transaction) else [],
            "date": entry.date.isoformat(),
            "payee": entry.payee if isinstance(entry, Transaction) else None,
            "narration": entry.narration if isinstance(entry, Transaction) else None,
            "amount": _source_amounts(entry, account) if isinstance(entry, Transaction) else "",
            "match": {
                "filename": match.meta.get("filename"),
                "lineno": match.meta.get("lineno"),
                "row": batch_rows.get(id(match)),
                "entry": format_entry(match),
            }
            if match
            else None,
        }
        if csv_mode:
            row_dict["rule"] = rule
        rows.append(row_dict)

    shown = [row["entry"] for row in rows if row["include"] or row["status"] == "blocked"]
    proposed = ledger_write.appended_content(original, shown)
    validation_errors: list[str] = []
    validation_warnings: list[str] = []
    try:
        validation_warnings = ledger_write.validate_append(
            file, texts, allow_errors=allow_errors, into=into, snapshot=snapshot
        )
    except EngineError as exc:
        validation_errors = exc.details or [str(exc)]

    preview: dict[str, Any] = {
        "source": str(source),
        "config": preview_config,
        "config_source": config_source,
        "into": str(target),
        "importer": _name(importer),
        "account": account,
        "rows": rows,
        "ready": len(texts),
        "written": 0,
        "duplicates": sum(row["status"] == "duplicate" for row in rows),
        "possible_duplicates": sum(row["status"] == "possible_duplicate" for row in rows),
        # Conflicts were tracked only as the boolean that gates exit 4, so the
        # one status that forces a human to look was the one counted nowhere:
        # an all-conflict preview tallied as `0 ready, 0 … 0 …` and read as an
        # empty file to anything skimming the summary.
        "conflicts": sum(row["status"] == "conflict" for row in rows),
        "blocked": sum(row["status"] == "blocked" for row in rows),
        "skipped_blank": skipped_blank,
        "validation_errors": validation_errors,
        "validation_warnings": validation_warnings,
        "importer_output": logs.getvalue(),
        "notes": notes,
        "diff": "".join(
            difflib.unified_diff(
                original.decode("utf-8").splitlines(True),
                proposed.splitlines(True),
                fromfile=str(target),
                tofile=str(target),
            )
        ),
    }
    if apply:
        blocked = preview["blocked"]
        if conflicts or (preview["possible_duplicates"] and duplicates == "review") or blocked:
            review = [
                f"Row {row['row']} ({row['status']}): {row['reason']}"
                for row in rows
                if row["status"] == "conflict"
                or (row["status"] == "possible_duplicate" and duplicates == "review")
                or row["status"] == "blocked"
            ]
            if conflicts and not (preview["possible_duplicates"] and duplicates == "review"):
                guidance = (
                    "Import needs review; nothing was written. A stable ID already matches a ledger "
                    "entry with different data — edit or remove that entry, change the bank ID, or drop the row."
                )
            elif conflicts:
                guidance = (
                    "Import needs review; nothing was written. Resolve ID conflicts (stable ID with different "
                    "ledger data) and choose --duplicates skip/include for possible duplicates."
                )
            elif preview["possible_duplicates"] and duplicates == "review":
                guidance = (
                    "Import needs review; nothing was written. Choose --duplicates skip/include "
                    "for possible duplicates."
                )
            else:
                guidance = "Import needs review; nothing was written."
            if blocked == 1:
                guidance += " 1 row is blocked by an unopened account or a currency mismatch; resolve it first."
            elif blocked:
                guidance += (
                    f" {blocked} rows are blocked by unopened accounts or currency mismatches; resolve them first."
                )
            raise ConflictError(
                guidance,
                details=review,
                result=preview,
            )
        if validation_errors:
            raise LedgerError(
                "Import would leave the ledger invalid; nothing was written.",
                details=validation_errors,
                result=preview,
            )
        snapshot.verify()
        ledger_write.append(file, texts, allow_errors=allow_errors, expected=original, into=into, snapshot=snapshot)
        preview["written"] = len(texts)
    return preview


def _importer(config: Path, source: Path, name: str | None) -> Any:
    if not config.is_file():
        raise UsageError(f"Importer configuration not found: {config}")
    namespace = runpy.run_path(str(config))
    configured = namespace.get("CONFIG")
    if not isinstance(configured, list | tuple):
        raise UsageError("Importer configuration must export CONFIG = [importer, ...]. See docs/IMPORTING.md.")
    if name is not None:
        available = [_name(importer) for importer in configured]
        if name not in available:
            raise UsageError(f"No importer named {name!r}; available: {', '.join(available) or '(none)'}.")
        configured = [importer for importer in configured if _name(importer) == name]
    matches = [importer for importer in configured if importer.identify(str(source))]
    if not matches:
        selected = f"Importer {name!r} does not recognize" if name else "No configured importer recognizes"
        raise UsageError(f"{selected} {source.name}. Check --config and the export format.")
    if len(matches) > 1:
        raise UsageError("Multiple importers match; choose one with --importer.", details=[_name(i) for i in matches])
    return matches[0]


def _name(importer: Any) -> str:
    name = getattr(importer, "name", type(importer).__name__)
    if not isinstance(name, str):
        raise UsageError("Use the current Beangulp Importer interface (name property and file paths).")
    return name


def _has_explicit_units(posting: Any) -> bool:
    units = posting.units
    return units is not None and isinstance(getattr(units, "number", None), Decimal)


def _source_postings(entry: Any, account: str) -> list[Any]:
    return [p for p in entry.postings if p.account == account and _has_explicit_units(p)]


def _fingerprint(entry: Any, account: str) -> tuple[Any, ...]:
    if any(not _has_explicit_units(p) for p in entry.postings if p.account == account):
        raise LedgerError(f"The importer must supply explicit source amounts for {account} before duplicate matching.")
    amounts = tuple(
        sorted((str(p.units.number.normalize()), p.units.currency) for p in _source_postings(entry, account))
    )
    # Ledger text loads NFC-normalized but an export's rows arrive in whatever
    # form the bank wrote, so an accented description would otherwise compare
    # unequal to the identical entry already in the ledger.
    return (
        entry.date,
        _match_text(entry.payee),
        _match_text(entry.narration),
        amounts,
    )


def _match_text(value: str | None) -> str:
    return unicodedata.normalize("NFC", " ".join((value or "").casefold().split()))


def _identities(entry: Any, account: str, keys: list[str]) -> list[tuple[str, str, str]]:
    meta = entry.meta or {}
    identities = []
    for key in ["import-id", *keys]:
        value = meta.get(key)
        if value in (None, ""):
            continue
        if key == "import-id":
            identities.append((account, "import-id", str(value)))
        else:
            identities.append((account, "bank", f"{_IDENTITY_KINDS.get(key, key)}:{value}"))
    if meta.get("import-id-2") not in (None, ""):
        identities.append((account, "import-id", str(meta["import-id-2"])))
    if meta.get("bea_import_id"):
        identities.append((account, "file", str(meta["bea_import_id"])))
    return identities


def _blocked_reason(entry: Any, open_currencies: dict[str, set[str] | None]) -> str | None:
    """Why a transaction cannot be written, or None when its accounts allow it.

    Names each unopened account with the `bea add open` line that fixes it,
    and each currency the account's open directive does not allow.
    """
    missing = sorted({posting.account for posting in entry.postings if posting.account not in open_currencies})
    if missing:
        remedies = []
        for name in missing:
            currency = next(p.units.currency for p in entry.postings if p.account == name)
            remedies.append(f"bea add open --account {name} --date {entry.date.isoformat()} -c {currency}")
        quoted = ", ".join(f"'{name}'" for name in missing)
        noun = "Account" if len(missing) == 1 else "Accounts"
        verb = "is" if len(missing) == 1 else "are"
        return f"{noun} {quoted} {verb} not open. Run: {'; '.join(remedies)}."
    for posting in entry.postings:
        allowed = open_currencies.get(posting.account)
        if allowed is not None and posting.units.currency not in allowed:
            choices = ", ".join(sorted(allowed))
            return (
                f"Cannot post {posting.units.currency} to '{posting.account}' "
                f"(open for {choices} only). Add {posting.units.currency} to its open directive."
            )
    return None


def _native_import_id(meta: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = meta.get(key)
        if value not in (None, ""):
            return f"{_IDENTITY_KINDS.get(key, key)}:{value}"
    return None


def _hash_base(entry: Any, account: str, *, normalized: bool) -> str:
    amounts = sorted((p.units.number, p.units.currency) for p in _source_postings(entry, account))
    if len(amounts) == 1:
        normalized_amount = f"{amounts[0][0]:.2f}"
    else:
        normalized_amount = "+".join(f"{number} {currency}" for number, currency in amounts)
    description = " ".join(str(entry.narration or entry.payee or "").upper().split())
    if normalized:
        # Normalize after upper(): uppercasing NFD text can itself emit a
        # non-canonical form, and the digest has to be stable byte-for-byte.
        description = unicodedata.normalize("NFC", description)
        account = unicodedata.normalize("NFC", account)
    return f"{entry.date.isoformat()}|{normalized_amount}|{description}|{account}"


def _digest_import_id(base: str, occurrence: int) -> str:
    digest_input = base if occurrence == 1 else f"{base}|{occurrence}"
    return "csv:sha256:" + hashlib.sha256(digest_input.encode("utf-8")).hexdigest()[:16]


def _hash_import_ids(entry: Any, account: str, seen: dict[str, int]) -> tuple[str, str | None]:
    """The canonical import id, plus the pre-NFC id to also match on, if different.

    The description is hashed NFC-normalized so one bank row keeps one id
    across exports that differ only in Unicode normalization. Ledgers written
    before that carry the un-normalized digest, so it is returned alongside as
    a lookup-only key: matching it still recognizes the row as a duplicate,
    while anything newly written uses the canonical id.
    """
    canonical_base = _hash_base(entry, account, normalized=True)
    legacy_base = _hash_base(entry, account, normalized=False)
    seen[canonical_base] = seen.get(canonical_base, 0) + 1
    occurrence = seen[canonical_base]
    canonical = _digest_import_id(canonical_base, occurrence)
    if legacy_base == canonical_base:
        return canonical, None
    return canonical, _digest_import_id(legacy_base, occurrence)


def _candidate_key(entry: Any, account: str) -> tuple[Any, ...]:
    date, payee, _narration, amounts = _fingerprint(entry, account)
    return date, payee, amounts


def _source_amounts(entry: Any, account: str) -> str:
    return ", ".join(f"{p.units.number} {p.units.currency}" for p in _source_postings(entry, account))


def _traceback(exc: BaseException) -> str:
    import traceback

    return "".join(traceback.format_exception(exc))
