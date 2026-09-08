"""Preview and apply entries extracted by configured Beangulp importers."""

from __future__ import annotations

import copy
import difflib
import hashlib
import io
import runpy
import sys
from contextlib import redirect_stderr, redirect_stdout
from decimal import Decimal
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, ledger_write, output
from cli.errors import ConflictError, LedgerError, UsageError


class Duplicates(StrEnum):
    review = "review"
    skip = "skip"
    include = "include"


def _importer(config: Path, source: Path, name: str | None) -> Any:
    if not config.is_file():
        raise UsageError(f"Importer configuration not found: {config}")
    # A config is ordinary local Python, including its sibling modules. Nothing
    # is discovered or executed until the user names it with --config.
    namespace = runpy.run_path(str(config))
    configured = namespace.get("CONFIG")
    if not isinstance(configured, list | tuple):
        raise UsageError("Importer configuration must export CONFIG = [importer, ...]. See docs/IMPORTING.md.")
    matches = [
        importer
        for importer in configured
        if (name is None or _name(importer) == name) and importer.identify(str(source))
    ]
    if not matches:
        raise UsageError(f"No configured importer recognizes {source.name}. Check --config and the export format.")
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


def _identities(entry: Any, account: str, keys: list[str]) -> list[tuple[str, str, str]]:
    meta = entry.meta or {}
    identities = [(account, "bank", str(meta[key])) for key in keys if meta.get(key) not in (None, "")]
    if meta.get("bea_import_id"):
        identities.append((account, "file", str(meta["bea_import_id"])))
    return identities


def import_entries(
    source: Annotated[Path, typer.Argument(help="Bank/card export handled by a configured importer")],
    config: Annotated[Path, typer.Option("--config", help="Local Python file exporting CONFIG = [importer, ...]")],
    importer_name: Annotated[str | None, typer.Option("--importer", help="Importer name when multiple match")] = None,
    apply: Annotated[bool, typer.Option("--apply", help="Validate and write the previewed entries")] = False,
    duplicates: Annotated[
        Duplicates, typer.Option("--duplicates", help="Decision for possible duplicates; exact IDs are always skipped")
    ] = Duplicates.review,
    id_key: Annotated[
        list[str] | None,
        typer.Option("--id-key", help="Stable bank ID metadata key; repeat as needed (default: common bank ID keys)"),
    ] = None,
) -> None:
    """Preview categorized entries and a ledger diff; write only with --apply.

    Uses the modern Beangulp identify/account/extract interface. Categorization
    belongs to the configured importer. Possible duplicates require an explicit
    --duplicates skip/include decision before applying.
    """
    from beancount import loader
    from beancount.core.data import Transaction

    from cli.directives.writer import format_entry

    file = context.current().entry_file()
    source, config = source.expanduser().resolve(), config.expanduser().resolve()
    if not source.is_file():
        raise UsageError(f"Export file not found: {source}")
    source_bytes = source.read_bytes()
    original = file.read_bytes()
    existing, errors, options = loader.load_file(file)
    output.render_ledger_errors(errors, allow=False)
    dependencies = {Path(path): Path(path).read_bytes() for path in options["include"] if Path(path) != file}
    logs = io.StringIO()
    # Importer chatter is retained in the preview instead of corrupting JSON.
    sys.path.insert(0, str(config.parent))
    try:
        with redirect_stdout(logs), redirect_stderr(logs):
            importer = _importer(config, source, importer_name)
            account = str(importer.account(str(source)))
            entries = copy.deepcopy(list(importer.extract(str(source), existing)))
    except ImportError as exc:
        raise UsageError(
            f"Importer dependency is unavailable: {exc}. Run bea in an environment containing your importer's "
            "dependencies; see docs/IMPORTING.md."
        ) from exc
    finally:
        sys.path.pop(0)
    keys = id_key or ["bank_id", "fitid", "transaction_id", "imported_id"]
    identities: dict[tuple[str, str, str], Any] = {}
    fingerprints: dict[tuple[Any, ...], Any] = {}
    for entry in existing:
        if isinstance(entry, Transaction) and any(p.account == account for p in entry.postings):
            for identity in _identities(entry, account, keys):
                identities[identity] = entry
            fingerprints[_fingerprint(entry, account)] = entry
    if source.read_bytes() != source_bytes:
        raise ConflictError("The export changed during extraction; nothing was written. Retry.")
    source_hash = hashlib.sha256(source_bytes).hexdigest()
    other_entries = {format_entry(entry) for entry in existing if not isinstance(entry, Transaction)}
    rows: list[dict[str, Any]] = []
    texts: list[str] = []
    conflicts = False
    for index, entry in enumerate(entries):
        entry = entry._replace(meta=dict(entry.meta or {}))
        status, reason, match = "new", None, None
        if isinstance(entry, Transaction):
            if not any(p.account == account for p in entry.postings):
                raise LedgerError(f"Importer row {index + 1} has no posting to its source account {account}.")
            fingerprint = _fingerprint(entry, account)
            entry.meta["bea_import_id"] = hashlib.sha256(f"{account}:{source_hash}:{index}".encode()).hexdigest()
            ids = _identities(entry, account, keys)
            matches = [identities[key] for key in ids if key in identities]
            if matches:
                match = matches[0]
                if any(_fingerprint(m, account) != fingerprint for m in matches):
                    status, reason, conflicts = (
                        "conflict",
                        "Stable ID matches an entry with different transaction data.",
                        True,
                    )
                else:
                    status, reason = "duplicate", "Stable bank ID or previously imported source row matches."
            elif fingerprint in fingerprints and not (
                any(key[1] == "bank" for key in ids)
                and any(key[1] == "bank" for key in _identities(fingerprints[fingerprint], account, keys))
            ):
                status, reason, match = (
                    "possible_duplicate",
                    "Date, payee, narration and source amount match.",
                    fingerprints[fingerprint],
                )
            if status == "new" or (status == "possible_duplicate" and duplicates == Duplicates.include):
                for identity in ids:
                    identities[identity] = entry
                fingerprints[fingerprint] = entry
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
                "match": {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
                if match
                else None,
            }
        )
    proposed = ledger_write.appended_content(original, texts)
    validation_errors: list[str] = []
    try:
        ledger_write.validate_append(file, texts)
    except LedgerError as exc:
        validation_errors = exc.details or [str(exc)]
    preview = {
        "source": str(source),
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
                fromfile=str(file),
                tofile=str(file),
            )
        ),
    }
    if apply:
        if conflicts or (preview["possible_duplicates"] and duplicates == Duplicates.review):
            raise ConflictError(
                "Import needs review; nothing was written. Resolve ID conflicts or choose --duplicates skip/include.",
                result=preview,
            )
        if validation_errors:
            raise LedgerError(
                "Import would leave the ledger invalid; nothing was written.", details=validation_errors, result=preview
            )
        if any(path.read_bytes() != content for path, content in dependencies.items()):
            raise ConflictError("An included ledger changed during import; nothing was written. Retry.")
        ledger_write.append(file, texts, expected=original)
        preview["written"] = len(texts)
    if context.current().json_output:
        output.emit(preview, target=output.file_target(file))
    else:
        typer.echo(
            f"{_name(importer)} → {account}: {len(texts)} ready, "
            f"{preview['duplicates']} exact duplicates, {preview['possible_duplicates']} possible duplicates"
        )
        output.table(
            ["ROW", "STATUS", "ACCOUNTS"],
            [[str(row["row"]), row["status"], ", ".join(row["accounts"])] for row in rows],
        )
        typer.echo(preview["diff"])
        for error in validation_errors:
            output.note(error)
        if logs.getvalue():
            output.note(logs.getvalue())
        if apply:
            output.success(f"Wrote {len(texts)} entries to {file}.")
        else:
            typer.echo("Preview only. Review the entries, then repeat with --apply to write.")
