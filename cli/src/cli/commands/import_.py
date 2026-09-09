"""Preview and apply entries extracted by configured Beangulp importers."""

from __future__ import annotations

import copy
import difflib
import hashlib
import io
import json
import os
import runpy
import sys
from contextlib import redirect_stderr, redirect_stdout
from decimal import Decimal
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, ledger_write, output
from cli.config import config_dir
from cli.errors import BeaError, ConflictError, LedgerError, UsageError


class Duplicates(StrEnum):
    review = "review"
    skip = "skip"
    include = "include"


def _config_record(file: Path) -> Path:
    key = hashlib.sha256(str(file.resolve()).encode()).hexdigest()
    return config_dir() / "importers" / f"{key}.json"


def _config_path(file: Path, supplied: Path | None) -> tuple[Path, str]:
    if supplied is not None:
        return supplied.expanduser().resolve(), "--config"
    record = _config_record(file)
    if record.is_file():
        try:
            return Path(json.loads(record.read_text())["config"]), "remembered"
        except (ValueError, KeyError, TypeError) as exc:
            raise UsageError("Cannot read the saved importer path; select one with --config FILE.") from exc
    conventional = file.parent / "importers.py"
    if conventional.is_file():
        return conventional, "default beside root ledger"
    raise UsageError(
        "Choose a Python importer with --config FILE, or place importers.py beside the root ledger. "
        "The selected path is remembered for this ledger."
    )


def _remember_config(file: Path, config: Path) -> None:
    record = _config_record(file)
    try:
        record.parent.mkdir(parents=True, exist_ok=True)
        with ledger_write.candidate_file(record, json.dumps({"config": str(config)})) as candidate:
            os.replace(candidate, record)
    except OSError as exc:
        output.note(f"Could not remember the importer path: {exc}. Pass --config on the next import.")


def _importer(config: Path, source: Path, name: str | None) -> Any:
    if not config.is_file():
        raise UsageError(f"Importer configuration not found: {config}")
    # A config is ordinary local Python, including its sibling modules. Only
    # an explicit import command executes the selected or remembered config.
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


def _fingerprint(entry: Any, account: str) -> tuple[Any, ...]:
    """A possible match, never proof: two real purchases can have these values."""
    source_postings = [p for p in entry.postings if p.account == account]
    if any(not p.units or not isinstance(p.units.number, Decimal) for p in source_postings):
        raise LedgerError(f"The importer must supply explicit source amounts for {account} before duplicate matching.")
    amounts = tuple(
        sorted(
            (str(p.units.number.normalize()), p.units.currency)
            for p in entry.postings
            if p.account == account and p.units
        )
    )
    return (
        entry.date,
        " ".join((entry.payee or "").casefold().split()),
        " ".join((entry.narration or "").casefold().split()),
        amounts,
    )


# The `import-id` namespace each stable-ID metadata key maps to. `bank_id`,
# `transaction_id`, and `imported_id` are bank-supplied row IDs; `fitid` is the
# OFX transaction ID, matching the skill's own `ofx:` example. A custom
# `--id-key` uses its own name as the namespace. An `import-id` value is
# already namespaced and passes through verbatim.
_IDENTITY_KINDS = {
    "bank_id": "bank",
    "fitid": "ofx",
    "transaction_id": "bank",
    "imported_id": "bank",
}

_DEFAULT_ID_KEYS = ["bank_id", "fitid", "transaction_id", "imported_id"]


def _identities(entry: Any, account: str, keys: list[str]) -> list[tuple[str, str, str]]:
    """Every stable identity an entry claims, in `import-id` value form.

    `import-id` and `import-id-2` are the interop rail from
    `skills/.../beancount-import/references/dedup.md` and always match;
    `bea_import_id` is the pre-release legacy key and still matches.
    """
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
    """The `import-id` for an importer-supplied native stable ID, if any."""
    for key in keys:
        value = meta.get(key)
        if value not in (None, ""):
            return f"{_IDENTITY_KINDS.get(key, key)}:{value}"
    return None


def _hash_import_id(entry: Any, account: str, seen: dict[str, int]) -> str:
    """The `csv:sha256:` identity for a row without a native stable ID.

    Hash input follows `dedup.md`: `date|amount|description|account`, where
    the description is the entry's narration (or payee when narration is
    empty), uppercased with whitespace collapsed. Identical inputs within one
    file take an occurrence suffix (`…|account|2`) so N identical rows map to
    N distinct entries while re-imports still match 1:1.
    """
    source = [p for p in entry.postings if p.account == account and p.units]
    amounts = sorted((p.units.number, p.units.currency) for p in source)
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
    return ", ".join(f"{p.units.number} {p.units.currency}" for p in entry.postings if p.account == account and p.units)


def import_entries(
    source: Annotated[Path, typer.Argument(help="Bank/card export handled by a configured importer")],
    config: Annotated[
        Path | None,
        typer.Option("--config", help="Python CONFIG file; defaults to the saved path or root-ledger/importers.py"),
    ] = None,
    importer_name: Annotated[str | None, typer.Option("--importer", help="Importer name when multiple match")] = None,
    apply: Annotated[bool, typer.Option("--apply", help="Validate and write the previewed entries")] = False,
    duplicates: Annotated[
        Duplicates, typer.Option("--duplicates", help="Decision for possible duplicates; exact IDs are always skipped")
    ] = Duplicates.review,
    id_key: Annotated[
        list[str] | None,
        typer.Option(
            "--id-key",
            help="Stable bank ID metadata key; repeat as needed (default: common bank ID keys). "
            "import-id and import-id-2 always match regardless.",
        ),
    ] = None,
    into: Annotated[
        Path | None, typer.Option("--into", help="Write to an included file, relative to the root ledger")
    ] = None,
) -> None:
    """Preview categorized entries and a ledger diff; write only with --apply.

    Uses the modern Beangulp identify/account/extract interface. Categorization
    belongs to the configured importer. Possible duplicates require an explicit
    --duplicates skip/include decision before applying.
    """
    from beancount import loader
    from beancount.core.data import Transaction

    from cli.directives.writer import format_entry, normalize_entry_strings

    file = context.current().entry_file()
    source = source.expanduser().resolve()
    config, config_source = _config_path(file, config)
    output.note(f"Using importers from {config} ({config_source})")
    if not source.is_file():
        raise UsageError(f"Export file not found: {source}")
    source_bytes = source.read_bytes()
    snapshot = ledger_write.LedgerSnapshot.capture(file)
    target = ledger_write.destination(file, into)
    snapshot.require_target(target)
    original = target.read_bytes()
    existing, errors, _ = loader.load_file(file)
    output.render_ledger_errors(errors, allow=False)
    logs = io.StringIO()
    # Importer chatter is retained in the preview instead of corrupting JSON.
    sys.path.insert(0, str(config.parent))
    try:
        with redirect_stdout(logs), redirect_stderr(logs):
            importer = _importer(config, source, importer_name)
            account = str(importer.account(str(source)))
            entries = copy.deepcopy(list(importer.extract(str(source), existing)))
    except BeaError:
        raise
    except ImportError as exc:
        raise UsageError(
            f"Importer dependency is unavailable: {exc}. Run bea in an environment containing your importer's "
            "dependencies; see docs/IMPORTING.md. Pass --debug before the command for a traceback."
        ) from exc
    except Exception as exc:
        raise LedgerError(
            f"Importer failed ({type(exc).__name__}): {exc}. Pass --debug before the command for a traceback."
        ) from exc
    finally:
        sys.path.pop(0)
    # `import-id` / `import-id-2` always match: they are the shared rail with
    # the ledger skills, independent of the importer's native-ID key choice.
    keys = id_key or _DEFAULT_ID_KEYS
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
            # Look up, but never write, the pre-release identity so ledgers
            # written before `import-id` still deduplicate on re-import.
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
            if status == "new" or (status == "possible_duplicate" and duplicates == Duplicates.include):
                for identity in ids:
                    identities[identity] = entry
                fingerprints[_candidate_key(entry, account)] = entry
        text = format_entry(entry)
        if not isinstance(entry, Transaction):
            if text in other_entries:
                status, reason = "duplicate", "Identical directive already exists."
            other_entries.add(text)
        include = status == "new" or (status == "possible_duplicate" and duplicates == Duplicates.include)
        if include:
            texts.append(text)
        rows.append(
            {
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
                    "entry": format_entry(match),
                }
                if match
                else None,
            }
        )
    proposed = ledger_write.appended_content(original, texts)
    validation_errors: list[str] = []
    try:
        ledger_write.validate_append(file, texts, into=into, snapshot=snapshot)
    except LedgerError as exc:
        validation_errors = exc.details or [str(exc)]
    preview = {
        "source": str(source),
        "config": str(config),
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
        "importer_output": logs.getvalue(),
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
        if conflicts or (preview["possible_duplicates"] and duplicates == Duplicates.review):
            review = [
                f"Row {row['row']} ({row['status']}): {row['reason']}"
                for row in rows
                if row["status"] == "conflict"
                or (row["status"] == "possible_duplicate" and duplicates == Duplicates.review)
            ]
            raise ConflictError(
                "Import needs review; nothing was written. Resolve ID conflicts or choose --duplicates skip/include.",
                details=review,
                result=preview,
            )
        if validation_errors:
            raise LedgerError(
                "Import would leave the ledger invalid; nothing was written.", details=validation_errors, result=preview
            )
        snapshot.verify()
        ledger_write.append(file, texts, expected=original, into=into, snapshot=snapshot)
        preview["written"] = len(texts)
    _remember_config(file, config)
    if context.current().json_output:
        output.emit(preview, target=output.file_target(file))
    else:
        typer.echo(
            f"{_name(importer)} → {account}: {len(texts)} ready, "
            f"{preview['duplicates']} exact duplicates, {preview['possible_duplicates']} possible duplicates"
        )
        output.table(
            ["ROW", "STATUS", "DATE", "PAYEE / NARRATION", "SOURCE AMOUNT"],
            [
                [
                    str(row["row"]),
                    row["status"],
                    row["date"],
                    " / ".join(v for v in (row["payee"], row["narration"]) if v),
                    row["amount"],
                ]
                for row in rows
            ],
        )
        for row in rows:
            if row["match"]:
                match = row["match"]
                typer.echo(
                    f"\nRow {row['row']}: {row['reason']}\nExisting entry at {match['filename']}:{match['lineno']}:"
                )
                typer.echo(match["entry"])
        typer.echo(preview["diff"])
        for error in validation_errors:
            output.note(error)
        if logs.getvalue():
            output.note(logs.getvalue())
        if apply:
            output.success(f"Wrote {len(texts)} entries to {target}.")
        else:
            typer.echo("Preview only. Review the entries, then repeat with --apply to write.")
