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


def answer(
    file: Path,
    source: Path,
    *,
    csv_mapping: str | None = None,
    csv_account: str | None = None,
    date_format: str | None = None,
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
    from beancount import loader
    from beancount.core.data import Transaction

    from bea_engine.csv_mapper import CsvImporter, load_rules, parse_mapping

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
    existing, errors, options = loader.load_file(file)
    if not allow_errors and errors:
        raise LedgerError(
            f"Ledger has {len(errors)} error(s). Pass --allow-errors to preview and apply anyway.",
            details=[format_error(error) for error in errors],
        )

    logs = io.StringIO()
    notes: list[str] = []
    csv_mode = csv_mapping is not None
    if csv_mode:
        if csv_account is None or csv_mapping is None:
            raise UsageError(
                "--csv needs --account ACCOUNT for the source account, for example --account Assets:Checking."
            )
        mapping = parse_mapping(csv_mapping)
        default_account = default_account or "Expenses:Uncategorized"
        resolved_date_format = date_format or "%Y-%m-%d"
        operating = options.get("operating_currency") or []
        importer: Any = CsvImporter(
            account=csv_account,
            mapping=mapping,
            date_format=resolved_date_format,
            rules=load_rules(Path(rules_file)) if rules_file is not None else None,
            default_account=default_account,
            currency=operating[0] if len(operating) == 1 else None,
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
                f"Importer failed ({type(exc).__name__}): {exc}. Pass --debug before the command for a traceback.",
                traceback=_traceback(exc),
            ) from exc
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
            raise UsageError(
                f"Importer dependency is unavailable: {exc}. Run bea in an environment containing your importer's "
                "dependencies; see docs/IMPORTING.md. Pass --debug before the command for a traceback.",
                traceback=_traceback(exc),
            ) from exc
        except Exception as exc:
            raise LedgerError(
                f"Importer failed ({type(exc).__name__}): {exc}. Pass --debug before the command for a traceback.",
                traceback=_traceback(exc),
            ) from exc
        finally:
            sys.path.pop(0)

    keys = id_keys or _DEFAULT_ID_KEYS
    identities: dict[tuple[str, str, str], Any] = {}
    fingerprints: dict[tuple[Any, ...], Any] = {}
    for entry in existing:
        entry = normalize_entry_strings(entry)
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
        if isinstance(entry, Transaction):
            if not any(p.account == account for p in entry.postings):
                raise LedgerError(f"Importer row {index + 1} has no posting to its source account {account}.")
            fingerprint = _fingerprint(entry, account)
            if not entry.meta.get("import-id"):
                native = _native_import_id(entry.meta, keys)
                entry.meta["import-id"] = native if native is not None else _hash_import_id(entry, account, seen_inputs)
            ids = _identities(entry, account, keys)
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
        if include:
            texts.append(text)
        row_dict: dict[str, Any] = {
            "row": index + 1,
            "status": status,
            "reason": reason,
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

    proposed = ledger_write.appended_content(original, texts)
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
        if conflicts or (preview["possible_duplicates"] and duplicates == "review"):
            review = [
                f"Row {row['row']} ({row['status']}): {row['reason']}"
                for row in rows
                if row["status"] == "conflict" or (row["status"] == "possible_duplicate" and duplicates == "review")
            ]
            raise ConflictError(
                "Import needs review; nothing was written. Resolve ID conflicts or choose --duplicates skip/include.",
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
    return (
        entry.date,
        " ".join((entry.payee or "").casefold().split()),
        " ".join((entry.narration or "").casefold().split()),
        amounts,
    )


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


def _native_import_id(meta: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = meta.get(key)
        if value not in (None, ""):
            return f"{_IDENTITY_KINDS.get(key, key)}:{value}"
    return None


def _hash_import_id(entry: Any, account: str, seen: dict[str, int]) -> str:
    amounts = sorted((p.units.number, p.units.currency) for p in _source_postings(entry, account))
    if len(amounts) == 1:
        normalized_amount = f"{amounts[0][0]:.2f}"
    else:
        normalized_amount = "+".join(f"{number} {currency}" for number, currency in amounts)
    description = " ".join(str(entry.narration or entry.payee or "").upper().split())
    base = f"{entry.date.isoformat()}|{normalized_amount}|{description}|{account}"
    seen[base] = seen.get(base, 0) + 1
    digest_input = base if seen[base] == 1 else f"{base}|{seen[base]}"
    return "csv:sha256:" + hashlib.sha256(digest_input.encode("utf-8")).hexdigest()[:16]


def _candidate_key(entry: Any, account: str) -> tuple[Any, ...]:
    date, payee, _narration, amounts = _fingerprint(entry, account)
    return date, payee, amounts


def _source_amounts(entry: Any, account: str) -> str:
    return ", ".join(f"{p.units.number} {p.units.currency}" for p in _source_postings(entry, account))


def _traceback(exc: BaseException) -> str:
    import traceback

    return "".join(traceback.format_exception(exc))
