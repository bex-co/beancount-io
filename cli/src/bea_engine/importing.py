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
import os
import re
import runpy
import shlex
import sys
import tempfile
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager, redirect_stderr, redirect_stdout
from dataclasses import dataclass
from decimal import Context, Decimal
from pathlib import Path
from typing import Any

from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.text import ledger_roots, unknown_root_message
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


@contextmanager
def _capturing(logs: io.StringIO) -> Iterator[None]:
    """Collect everything the importer prints into `importer_output`.

    `redirect_stdout` swaps only the Python objects; a `subprocess.run` or an
    `os.write(1, …)` inside the importer writes to the inherited descriptors,
    which bypassed the capture (w1/061). Descriptors 1 and 2 point at a
    scratch file for the duration and its bytes are appended afterwards.
    """
    with tempfile.TemporaryFile() as sink:
        saved: list[tuple[int, int]] = []
        for stream in (sys.stdout, sys.stderr):
            try:
                stream.flush()
                fd = stream.fileno()
            except (AttributeError, OSError, ValueError):
                continue
            if fd in (1, 2) and all(fd != kept for kept, _ in saved):
                saved.append((fd, os.dup(fd)))
                os.dup2(sink.fileno(), fd)
        try:
            with redirect_stdout(logs), redirect_stderr(logs):
                yield
        finally:
            for fd, copy_fd in saved:
                os.dup2(copy_fd, fd)
                os.close(copy_fd)
            sink.seek(0)
            logs.write(sink.read().decode("utf-8", "replace"))


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

    file = Path(os.path.abspath(file))
    source = source.expanduser().resolve()
    if not source.is_file():
        raise UsageError(f"Export file not found: {source}")

    source_bytes = source.read_bytes()
    snapshot = ledger_write.LedgerSnapshot.capture(file)
    target = ledger_write.destination(file, into)
    original = snapshot.require_target(target)
    existing, errors, options = managed_load.load_file(file, snapshot=snapshot)
    if not allow_errors and errors:
        raise LedgerError(
            f"Ledger has {len(errors)} error(s). Pass --allow-errors to preview and apply anyway.",
            details=[format_error(error, ledger_file=file) for error in errors],
        )

    logs = io.StringIO()
    notes: list[str] = []
    roots = ledger_roots(options)
    csv_mode = csv_mapping is not None
    skipped_blank = 0
    if csv_mode:
        if csv_account is None or csv_mapping is None:
            raise UsageError(
                "--csv needs --account ACCOUNT for the source account, for example --account Assets:Checking."
            )
        mapping = parse_mapping(csv_mapping)
        # Before the preview, not after: an invalid name would otherwise block
        # every row with the wrong diagnosis instead of failing on the typo.
        csv_account = _valid_account(csv_account, "--account", roots)
        default_account = _valid_account(default_account or "Expenses:Uncategorized", "--default-account", roots)
        resolved_date_format = date_format or "%Y-%m-%d"
        resolved_delimiter = parse_delimiter(delimiter) if delimiter is not None else None
        resolved_encoding = parse_encoding(encoding) if encoding is not None else "utf-8"
        operating = options.get("operating_currency") or []
        importer: Any = CsvImporter(
            account=csv_account,
            mapping=mapping,
            date_format=resolved_date_format,
            rules=load_rules(Path(rules_file), roots) if rules_file is not None else None,
            default_account=default_account,
            currency=_row_currency(existing, csv_account, operating),
            known_currencies=_known_currencies(existing, operating),
            delimiter=resolved_delimiter,
            encoding=resolved_encoding,
            account_roots=roots,
        )
        preview_config = csv_mapping
        try:
            account = str(importer.account(str(source)))
            with _capturing(logs):
                entries = copy.deepcopy(list(importer.extract(str(source), existing)))
        except EngineError:
            raise
        except Exception as exc:
            raise LedgerError(
                f"Importer failed ({type(exc).__name__}): {exc}.",
                traceback=_traceback(exc),
            ) from exc
        skipped_blank = importer.skipped_blank_rows
        if importer.constant_currency is not None:
            notes.append(
                f"currency={importer.constant_currency} names no column of {source.name}, so every row "
                f"posts in {importer.constant_currency}."
            )
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
            with _capturing(logs):
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
    # Which side a conflicting id came from: the ledger, or an earlier row of
    # this same export (banks do reuse ids within one file).
    ledger_conflicts = False
    batch_conflicts = False
    hashed = _hash_rows(entries, account, keys, Transaction)
    claimed = _claim_payeeless_ids(hashed, identities, account)
    batch_rows: dict[int, int] = {}
    for index, entry in enumerate(entries):
        entry = normalize_entry_strings(entry)
        status, reason, match = "new", None, None
        id_source: str | None = None
        if isinstance(entry, Transaction):
            if not any(p.account == account for p in entry.postings):
                raise LedgerError(f"Importer row {index + 1} has no posting to its source account {account}.")
            fingerprint = _fingerprint(entry, account)
            legacy_ids: list[str] = []
            if entry.meta.get("import-id"):
                id_source = "importer"
            else:
                native = _native_import_id(entry.meta, keys)
                if native is not None:
                    entry.meta["import-id"] = native
                    id_source = "bank"
                else:
                    row_ids = hashed[index]
                    entry.meta["import-id"] = row_ids.canonical
                    legacy_ids = [*row_ids.older, *claimed.get(index, [])]
                    id_source = "hash"
            ids = _identities(entry, account, keys)
            legacy_keys = [(account, "import-id", value) for value in legacy_ids]
            legacy_keys += [(account, "digest", value.rsplit(":", 1)[1]) for value in legacy_ids]
            ids.extend(legacy_keys)
            lookup_only = set(legacy_keys)
            ids.append((account, "file", hashlib.sha256(f"{account}:{source_hash}:{index}".encode()).hexdigest()))
            # An older generated id is lookup-only *and* content-checked: that
            # format was lossy enough to hand two genuinely different rows one
            # digest, so a hit on it means "already imported" only when the
            # date and source amounts agree. Dropping the rest here, rather than
            # letting them reach the conflict test, is what keeps a reused
            # native id with changed source amounts a conflict.
            hits = [
                (key, found, same)
                for key in ids
                if (found := identities.get(key)) is not None
                and (
                    (same := _same_row(key, found, account, fingerprint, lookup_only=key in lookup_only))
                    or key not in lookup_only
                )
            ]
            if hits:
                # A canonical digest proves the original source row even if
                # a retained file/native ID disagrees with later ledger edits.
                canonical = next(
                    (hit for hit in hits if hit[0] not in lookup_only and _is_generated_identity(hit[0])), None
                )
                if canonical is not None:
                    hits = [canonical]
                (_, kind, matched_value), match, _ = hits[0]
                if not all(same for _, _, same in hits):
                    status, conflicts = "conflict", True
                    if id(match) in batch_rows:
                        batch_conflicts = True
                        reason = (
                            f"Stable ID repeats row {batch_rows[id(match)]} of this import with different "
                            "transaction data."
                        )
                    else:
                        ledger_conflicts = True
                        reason = "Stable ID matches an entry with different transaction data."
                elif kind == "file":
                    status, reason = "duplicate", "Previously imported source row matches."
                elif kind == "digest":
                    stored = next(
                        (
                            str(value)
                            for value in (match.meta.get("import-id"), match.meta.get("import-id-2"))
                            if str(value or "").endswith(f":sha256:{matched_value}")
                        ),
                        f"sha256:{matched_value}",
                    )
                    status, reason = "duplicate", f"import-id {stored} is already in the ledger."
                else:
                    status, reason = "duplicate", f"import-id {matched_value} is already in the ledger."
            elif _candidate_key(entry, account) in fingerprints:
                status, reason, match = (
                    "possible_duplicate",
                    "Date, payee and source amount match; different bank IDs or narration do not rule out a duplicate."
                    if _match_text(entry.payee)
                    else "Date, narration and source amount match; different bank IDs do not rule out a duplicate.",
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
            blocked_reason = _blocked_reason(entry, open_currencies, roots)
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
    except LedgerError as exc:
        # Only a validation failure belongs in the preview as text. Catching
        # every EngineError here flattened the class away, so a concurrent edit
        # — a ConflictError carrying category "conflict" and exit 4 — came back
        # as "Import would leave the ledger invalid" at exit 1, with "retry"
        # demoted to a details line. Worse, it was a coin flip: the same race
        # caught at the `append` call below propagates intact, so identical
        # commands reported the same situation two different ways and a retry
        # wrapper keyed on exit 4 worked about half the time. An auth or usage
        # failure from the same call loses its category the same way.
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
            fixes = []
            if ledger_conflicts:
                fixes.append(
                    "a stable ID already matches a ledger entry with different data — edit or remove that "
                    "entry, change the bank ID, or drop the row"
                )
            if batch_conflicts:
                fixes.append(
                    "a stable ID repeats within this export with different data — correct or drop one of "
                    "those rows in the source file, or map a different id column"
                )
            conflict_fix = "; ".join(fixes)
            if conflicts and not (preview["possible_duplicates"] and duplicates == "review"):
                guidance = f"Import needs review; nothing was written. {conflict_fix[:1].upper()}{conflict_fix[1:]}."
            elif conflicts:
                guidance = (
                    f"Import needs review; nothing was written. Resolve ID conflicts ({conflict_fix}) and choose "
                    "--duplicates skip/include for possible duplicates."
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
    # The same rendering the generated id uses, so "is this the same amount"
    # has one answer in this module. `str(number.normalize())` would say
    # `1E+2` where the id says `100`; both sides of a comparison are built the
    # same way, so that was consistent rather than wrong — but two spellings of
    # one rule is how they drift apart.
    amounts = tuple(sorted(_exact_amount(p.units.number, p.units.currency) for p in _source_postings(entry, account)))
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
    # beancount-migrate writes the same digest under its source's prefix
    # (`monarch:sha256:…`), so a later bank import of that row must find it.
    for value in (meta.get("import-id"), meta.get("import-id-2")):
        if (match := _GENERATED_ID.fullmatch(str(value or ""))) is not None:
            identities.append((account, "digest", match.group(1)))
    return identities


# The generated-id prefixes skills/.../beancount-import/references/dedup.md
# defines: `bea import` writes `csv:`, beancount-migrate writes the others.
_GENERATED_ID = re.compile(r"(?:csv|mint|monarch|qbo):sha256:([0-9a-f]{16})")


def _is_generated_identity(key: tuple[str, str, str]) -> bool:
    return key[1] == "digest" or (key[1] == "import-id" and _GENERATED_ID.fullmatch(key[2]) is not None)


def _same_row(
    key: tuple[str, str, str], found: Any, account: str, fingerprint: tuple[Any, ...], *, lookup_only: bool
) -> bool:
    """Whether an id hit names the same source row rather than changed data.

    Canonical hashes already identify the original source row; mutable ledger
    fields cannot invalidate that proof. Older lookup-only hashes retain the
    date/amount guard against lossy collisions. Native IDs compare exact source
    amounts and commodities, allowing date and description cleanup. Pre-release
    file identities retain their full-content comparison.
    """
    generated = _is_generated_identity(key)
    if generated and not lookup_only:
        return True
    found_print = _fingerprint(found, account)
    if generated:
        return (found_print[0], found_print[3]) == (fingerprint[0], fingerprint[3])
    if key[1] in {"bank", "import-id"}:
        return bool(found_print[3] == fingerprint[3])
    return found_print == fingerprint


def _valid_account(name: str, option: str, roots: tuple[str, ...]) -> str:
    """Validate an account name the way the loader will, saying which option named it.

    Import used to skip this check entirely. An unopenable name — a space, a
    lowercase root, an illegal character — is trivially absent from the set of
    opened accounts, so every row came back `blocked` with "is not open" and a
    `bea add open` remedy that `add` itself refuses. A name no `open` directive
    could ever make valid is a usage error, not an unopened account, and this
    is the validator `add` has always used for it.
    """
    from bea_engine.ledger.text import parse_account

    try:
        return parse_account(name, roots)
    except UsageError as exc:
        raise UsageError(f"{option}: {exc}") from None


def _row_currency(existing: list[Any], account: str, operating: list[str]) -> str | None:
    """The commodity an imported row posts when no currency column names one.

    The source account decides before the ledger does: an account opened for a
    single currency *is* the commodity its statement is denominated in, and
    reaching for the ledger's single `operating_currency` instead booked every
    euro line of a euro account as dollars — exit 0, green `bea check`, wrong
    money. The operating currency stays the fallback for an account opened for
    any commodity; `None` leaves the row to the currency column or a refusal.
    """
    from beancount.core.data import Open

    opened: set[str] | None = set()
    for entry in existing:
        if isinstance(entry, Open) and entry.account == account:
            if not entry.currencies:
                opened = None
                break
            opened = (opened or set()) | set(entry.currencies)
    if opened is not None and len(opened) == 1:
        return next(iter(opened))
    return operating[0] if len(operating) == 1 else None


def _known_currencies(existing: list[Any], operating: list[str]) -> frozenset[str]:
    """Commodities the ledger names: declared, opened for, posted, priced, or operating."""
    from beancount.core.data import Commodity, Open, Price, Transaction

    known = set(operating)
    for entry in existing:
        if isinstance(entry, Commodity):
            known.add(entry.currency)
        elif isinstance(entry, Open):
            known.update(entry.currencies or ())
        elif isinstance(entry, Price):
            known.update((entry.currency, entry.amount.currency))
        elif isinstance(entry, Transaction):
            known.update(posting.units.currency for posting in entry.postings if posting.units is not None)
    return frozenset(currency for currency in known if isinstance(currency, str))


def _blocked_reason(entry: Any, open_currencies: dict[str, set[str] | None], roots: tuple[str, ...]) -> str | None:
    """Why a transaction cannot be written, or None when its accounts allow it.

    Names each unopened account with the `bea add open` line that fixes it,
    and each currency the account's open directive does not allow. An account
    under a root the ledger does not use (from a Python importer) gets no
    `add open` remedy: that command would refuse it too.
    """
    missing = sorted({posting.account for posting in entry.postings if posting.account not in open_currencies})
    foreign = [name for name in missing if name.split(":", 1)[0] not in roots]
    if foreign:
        return unknown_root_message(foreign[0], roots)
    if missing:
        remedies = []
        for name in missing:
            currency = next(p.units.currency for p in entry.postings if p.account == name)
            # Quoted so the line survives a paste into a shell. Valid account
            # names hold no spaces, so this is belt-and-braces now that invalid
            # names are refused up front — but a suggestion that only sometimes
            # pastes cleanly is worse than one that always does.
            remedies.append(f"bea add open --account {shlex.quote(name)} --date {entry.date.isoformat()} -c {currency}")
        quoted = ", ".join(f"'{name}'" for name in missing)
        noun = "Account" if len(missing) == 1 else "Accounts"
        verb = "is" if len(missing) == 1 else "are"
        return f"{noun} {quoted} {verb} not open. Run: {'; '.join(remedies)}."
    for posting in entry.postings:
        allowed = open_currencies.get(posting.account)
        if allowed is not None and posting.units.currency not in allowed:
            choices = ", ".join(sorted(allowed))
            instead = choices if len(allowed) == 1 else f"one of {choices}"
            # Widening the open directive is the last remedy offered, not the
            # first: following it relabels foreign money as the wrong commodity.
            return (
                f"Cannot post {posting.units.currency} to '{posting.account}' "
                f"(open for {choices} only). Post {instead} instead — name the row's commodity with "
                f"--csv currency=CODE — or add {posting.units.currency} to its open directive."
            )
    return None


def _native_import_id(meta: dict[str, Any], keys: list[str]) -> str | None:
    for key in keys:
        value = meta.get(key)
        if value not in (None, ""):
            return f"{_IDENTITY_KINDS.get(key, key)}:{value}"
    return None


def _exact_amount(number: Decimal, currency: str) -> str:
    """One source amount, rendered so equal values render identically.

    `normalize()` collapses the spellings of one value — `1.50`, `1.5` and
    `1.500` are the same amount and must hash the same — and `:f` keeps the
    result out of scientific notation, which `normalize()` otherwise produces
    for trailing zeros before the point (`100` becomes `1E+2`).

    It normalizes under a context as precise as the number itself. The
    default context keeps 28 significant digits, so `1.00…001` and
    `1.00…002` (29+ digits, written exactly to the ledger) rounded to one
    rendering, shared an id, and the second row was skipped as a duplicate.

    The currency is part of the identity. Without it, `1 ETH` and `1 BTC` on
    one date with one description shared a digest.
    """
    return f"{_exactly_normalized(number):f} {currency}"


def _exactly_normalized(number: Decimal) -> Decimal:
    """`number.normalize()` without rounding to the ambient context's precision."""
    return number.normalize(Context(prec=max(len(number.as_tuple().digits), 1)))


def _amounts_rounded(amounts: list[tuple[Decimal, str]]) -> str:
    """The exact-amount rendering as written before it stopped rounding to 28 digits."""
    return "+".join(f"{number.normalize():f} {currency}" for number, currency in amounts)


def _amounts_exact(amounts: list[tuple[Decimal, str]]) -> str:
    """The current rendering: every source amount, exact, with its commodity."""
    return "+".join(_exact_amount(number, currency) for number, currency in amounts)


def _amounts_two_decimal(amounts: list[tuple[Decimal, str]]) -> str:
    """The pre-exactness rendering, kept only to recognize ids already written.

    A lone amount was printed to two decimals with no commodity at all, so
    `-0.001 ETH` and `-0.002 ETH` both became `-0.00` and reordering an export
    swapped which row owned which digest.
    """
    if len(amounts) == 1:
        return f"{amounts[0][0]:.2f}"
    return "+".join(f"{number} {currency}" for number, currency in amounts)


def _hash_base(date: str, amount: str, description: str, account: str) -> str:
    """The string a generated import id is the digest of."""
    return f"{date}|{amount}|{description}|{account}"


def _digest_import_id(base: str, occurrence: int) -> str:
    digest_input = base if occurrence == 1 else f"{base}|{occurrence}"
    return "csv:sha256:" + hashlib.sha256(digest_input.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class _HashedRow:
    """One hashed row's generated ids.

    `canonical` is written; `older` are lookup-only spellings at the row's own
    occurrence. A row with both a payee and a narration hashes both, so the
    ids older releases wrote for it (from the narration alone) are `payeeless`:
    those numbered occurrences over every row sharing the narration-only base
    (`group`), so which stored id belongs to which row is settled for the
    whole group by `_claim_payeeless_ids`, not by row order.
    """

    canonical: str
    older: list[str]
    group: str | None = None
    payeeless: tuple[str, ...] = ()
    payee: str = ""
    date: Any = None
    amounts: tuple[str, ...] = ()


def _hash_rows(entries: list[Any], account: str, keys: list[str], transaction: type[Any]) -> dict[int, _HashedRow]:
    """Generated ids for every row that gets one, numbered in export order.

    The decision mirrors the preview loop: a transaction posting to the source
    account with neither an importer-supplied `import-id` nor a native bank id.
    Hashing ahead of the loop lets a group of rows claim stored ids together.
    """
    seen: dict[str, int] = {}
    hashed: dict[int, _HashedRow] = {}
    for index, raw in enumerate(entries):
        entry = normalize_entry_strings(raw)
        if not isinstance(entry, transaction) or not any(p.account == account for p in entry.postings):
            continue
        if entry.meta.get("import-id") or _native_import_id(entry.meta, keys) is not None:
            continue
        hashed[index] = _hash_import_ids(entry, account, seen)
    return hashed


def _claim_payeeless_ids(
    hashed: dict[int, _HashedRow], identities: dict[tuple[str, str, str], Any], account: str
) -> dict[int, list[str]]:
    """Give each stored narration-only id to the row it was written for.

    Ids written before payees were hashed number identical narrations in
    export order, so with a reordered export occurrence K is a different row:
    `PEETS` then `STARBUCKS`, both `CARD PURCHASE -5.00`, would have `PEETS`
    match the id stored for `STARBUCKS`. Every stored entry any row of a group
    reaches is therefore claimed by the group's row with that entry's payee
    first; an entry whose payee no row has (edited later) keeps the meaning
    the old id had — the row at its occurrence — or, if that row was claimed,
    the next unclaimed row in export order. A row left without a claim has no
    older id at all.
    """
    groups: dict[str, list[int]] = {}
    for index, row in hashed.items():
        if row.group is not None:
            groups.setdefault(row.group, []).append(index)
    claimed: dict[int, list[str]] = {}
    for indices in groups.values():
        stored: list[tuple[Any, str, int]] = []
        for index in indices:
            row = hashed[index]
            for value in row.payeeless:
                digest = value.rsplit(":", 1)[1]
                found = identities.get((account, "import-id", value)) or identities.get((account, "digest", digest))
                if found is None or any(found is entry for entry, _, _ in stored):
                    continue
                found_print = _fingerprint(found, account)
                if (found_print[0], found_print[3]) == (row.date, row.amounts):
                    stored.append((found, value, index))
        unclaimed = list(indices)
        leftover: list[tuple[str, int]] = []
        for found, value, reached_by in stored:
            payee = _match_text(found.payee)
            owner = next((index for index in unclaimed if payee and hashed[index].payee == payee), None)
            if owner is None:
                leftover.append((value, reached_by))
                continue
            unclaimed.remove(owner)
            claimed[owner] = [value]
        for value, reached_by in leftover:
            if not unclaimed:
                break
            owner = reached_by if reached_by in unclaimed else unclaimed[0]
            unclaimed.remove(owner)
            claimed[owner] = [value]
    return claimed


def _hash_import_ids(entry: Any, account: str, seen: dict[str, int]) -> _HashedRow:
    """The canonical import id, plus every older spelling to also match on.

    The canonical digest hashes the exact amount with its commodity, and hashes
    the description NFC-normalized, so one bank row keeps one id across exports
    that differ only in Unicode normalization or in how many decimal places
    they print.

    Older releases wrote different digests, so those are returned alongside as
    lookup-only keys and no re-hash pass is needed. They are listed newest
    first, and only formats that a released `bea` actually wrote are listed:
    NFC normalization shipped before exact amounts, so a ledger may predate
    exactness, or predate both, but there is no exact-amount/un-normalized
    combination in the wild to look for.

    Occurrence numbering stays keyed on the narration-only base, so N
    identical rows keep their 1..N suffixes and every older spelling of row K
    is that format's digest at occurrence K.

    A row with both a payee and a narration hashes both
    (`date|amount|payee|narration|account`): `STARBUCKS / CARD PURCHASE` and
    `PEETS / CARD PURCHASE` are different rows, and the occurrence suffix is
    only for identical ones. Its narration-only spellings are returned as
    `payeeless` for the group-wide claim instead of as plain lookups.
    """
    amounts = sorted((p.units.number, p.units.currency) for p in _source_postings(entry, account))
    raw_description = " ".join(str(entry.narration or entry.payee or "").upper().split())
    # Normalize after upper(): uppercasing NFD text can itself emit a
    # non-canonical form, and the digest has to be stable byte-for-byte.
    description = unicodedata.normalize("NFC", raw_description)
    nfc_account = unicodedata.normalize("NFC", account)
    date = entry.date.isoformat()
    exact = _amounts_exact(amounts)

    single_base = _hash_base(date, exact, description, nfc_account)
    seen[single_base] = seen.get(single_base, 0) + 1
    occurrence = seen[single_base]

    two_decimal = _amounts_two_decimal(amounts)
    known = {single_base}
    older: list[str] = []
    rounded_base = _hash_base(date, _amounts_rounded(amounts), description, nfc_account)
    if rounded_base != single_base:
        # Amounts past 28 significant digits were hashed rounded, and those
        # rows were numbered among every row rounding to the same base.
        counter = f"rounded\0{rounded_base}"
        seen[counter] = seen.get(counter, 0) + 1
        known.add(rounded_base)
        older.append(_digest_import_id(rounded_base, seen[counter]))
    for base in (
        _hash_base(date, two_decimal, description, nfc_account),  # before exact amounts
        _hash_base(date, two_decimal, raw_description, account),  # and before NFC
    ):
        if base in known:
            continue
        known.add(base)
        older.append(_digest_import_id(base, occurrence))
    single = _digest_import_id(single_base, occurrence)

    payee = unicodedata.normalize("NFC", " ".join(str(entry.payee or "").upper().split()))
    if not (payee and str(entry.narration or "").strip()):
        return _HashedRow(canonical=single, older=older)
    paired_base = _hash_base(date, exact, f"{payee}|{description}", nfc_account)
    # Keyed apart from the narration-only counter, so a paired base can never
    # share an occurrence count with a narration that happens to contain `|`.
    counter = f"paired\0{paired_base}"
    seen[counter] = seen.get(counter, 0) + 1
    return _HashedRow(
        canonical=_digest_import_id(paired_base, seen[counter]),
        older=[],
        group=single_base,
        payeeless=(single, *older),
        payee=_match_text(entry.payee),
        date=entry.date,
        amounts=tuple(sorted(_exact_amount(number, currency) for number, currency in amounts)),
    )


def _candidate_key(entry: Any, account: str) -> tuple[Any, ...]:
    """Date, who was paid, and source amounts: what flags a possible duplicate.

    The payee names who was paid. A row with no payee — the documented
    one-description CSV mapping puts the bank text in `narration` — is named
    by its narration instead; otherwise every same-day same-amount row would
    collapse onto date + amount and `--duplicates skip` would drop real ones.
    """
    date, payee, narration, amounts = _fingerprint(entry, account)
    return date, payee or narration, amounts


def _source_amounts(entry: Any, account: str) -> str:
    return ", ".join(f"{p.units.number} {p.units.currency}" for p in _source_postings(entry, account))


def _traceback(exc: BaseException) -> str:
    import traceback

    return "".join(traceback.format_exception(exc))
