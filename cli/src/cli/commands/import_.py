"""Preview and apply entries extracted by configured Beangulp importers.

Extraction, deduplication, validation, and writes run in `bea-engine import`.
This module owns option parsing, remembered importer/CSV paths, preview display,
and apply/duplicate decisions that the customer types on the command line.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.config import config_dir
from cli.errors import BeaError, UsageError


class Duplicates(StrEnum):
    review = "review"
    skip = "skip"
    include = "include"


def _config_record(file: Path) -> Path:
    key = hashlib.sha256(str(file.resolve()).encode()).hexdigest()
    return config_dir() / "importers" / f"{key}.json"


def _config_available(file: Path) -> tuple[Path, str] | None:
    """The Python importer this ledger already selects, if it selects one."""
    record = _config_record(file)
    if record.is_file():
        try:
            return Path(json.loads(record.read_text())["config"]), "remembered"
        except (ValueError, KeyError, TypeError) as exc:
            raise UsageError("Cannot read the saved importer path; select one with --config FILE.") from exc
    conventional = file.parent / "importers.py"
    if conventional.is_file():
        return conventional, "default beside root ledger"
    return None


def _config_path(file: Path, supplied: Path | None) -> tuple[Path, str]:
    if supplied is not None:
        return supplied.expanduser().resolve(), "--config"
    available = _config_available(file)
    if available is not None:
        return available
    raise UsageError(
        "Choose a Python importer with --config FILE, or place importers.py beside the root ledger. "
        "The selected path is remembered for this ledger. "
        "For a CSV export whose header row bea could not read, map the columns directly with "
        "--csv date=Date,amount=Amount,narration=Description --account Assets:Checking."
    )


def _inferred_mapping(source: Path, *, explicit: bool, notes: list[str]) -> str | None:
    """A `--csv` spec read off the export's header row.

    `--csv auto` asks for this outright and fails loudly when the header is
    unreadable; the automatic attempt returns None instead, leaving the caller
    to raise its own "choose an importer" message.
    """
    from cli.csv_mapper import infer_mapping, read_header

    headers = read_header(source)
    inferred = infer_mapping(headers)
    if inferred is None:
        if not explicit:
            return None
        columns = ", ".join(headers) if headers else "(none)"
        raise UsageError(
            f"Cannot read a column mapping from the header row of {source.name}. Its columns are: {columns}. "
            "Name them with --csv date=Date,amount=Amount,narration=Description."
        )
    if inferred.ambiguities:
        notes.append(
            f"Several columns could be {'; '.join(inferred.ambiguities)}; none was chosen. "
            "Name the one you want with --csv."
        )
    return inferred.spec


def _atomic_write(path: Path, content: str) -> None:
    """Replace `path` with `content` without a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".bea-", suffix=".tmp", dir=path.parent)
    candidate = Path(name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(candidate, path)
    finally:
        candidate.unlink(missing_ok=True)


def _remember_config(file: Path, config: Path) -> None:
    record = _config_record(file)
    try:
        _atomic_write(record, json.dumps({"config": str(config)}))
    except OSError as exc:
        output.note(f"Could not remember the importer path: {exc}. Pass --config on the next import.")


def _csv_record(file: Path) -> Path:
    key = hashlib.sha256(str(file.resolve()).encode()).hexdigest()
    return config_dir() / "importers" / f"csv-{key}.json"


def _recall_csv(file: Path, source: Path, account: str | None = None) -> dict[str, Any] | None:
    """A remembered `--csv` run for this root ledger and CSV header row, if any.

    Returns the stored spec only when its mapping and account are usable
    strings; a corrupt record reads as no memory rather than a crash.
    """
    from cli.csv_mapper import header_signature, read_header

    record = _csv_record(file)
    if not record.is_file():
        return None
    try:
        sources = json.loads(record.read_text()).get("sources", [])
    except (ValueError, AttributeError):
        return None
    headers = read_header(source)
    if not headers:
        return None
    wanted = header_signature(headers)
    matches = []
    for entry in sources:
        if (
            isinstance(entry, dict)
            and header_signature(entry.get("headers")) == wanted
            and isinstance(entry.get("mapping"), str)
            and isinstance(entry.get("account"), str)
        ):
            if account is None or entry["account"] == account:
                matches.append(entry)
    if len(matches) > 1:
        accounts = ", ".join(sorted({entry["account"] for entry in matches}))
        raise UsageError(
            f"This CSV header matches multiple source accounts: {accounts}. "
            "Pass --account ACCOUNT to select the export's account; nothing was written."
        )
    return matches[0] if matches else None


def _remember_csv(file: Path, source: Path, spec: dict[str, Any]) -> None:
    """Remember a `--csv` run keyed by root ledger, CSV header row and account."""
    from cli.csv_mapper import header_signature, read_header

    headers = read_header(source)
    if not headers:
        return
    record = _csv_record(file)
    try:
        try:
            sources = json.loads(record.read_text()).get("sources", [])
        except (OSError, ValueError, AttributeError):
            sources = []
        wanted = header_signature(headers)
        sources = [
            entry
            for entry in sources
            if not (
                isinstance(entry, dict)
                and header_signature(entry.get("headers")) == wanted
                and entry.get("account") == spec["account"]
            )
        ]
        payload = json.dumps({"sources": [*sources, {"headers": headers, **spec}]})
        _atomic_write(record, payload)
    except OSError as exc:
        output.note(f"Could not remember the column mapping: {exc}. Pass --csv on the next import.")


def import_entries(
    source: Annotated[
        Path, typer.Argument(help="Bank/card export: a CSV for --csv, or a file a configured importer recognizes")
    ],
    csv_mapping: Annotated[
        str | None,
        typer.Option(
            "--csv",
            help="Column mapping (date=Date,amount=Amount,narration=Description,...), or 'auto' to read the "
            "header row; no Python importer needed",
        ),
    ] = None,
    csv_account: Annotated[str | None, typer.Option("--account", help="Source account for --csv rows")] = None,
    date_format: Annotated[
        str | None,
        typer.Option("--date-format", help="strptime date format for --csv; inferred from the file if unset"),
    ] = None,
    rules_file: Annotated[Path | None, typer.Option("--rules", help="TOML categorization rules for --csv rows")] = None,
    default_account: Annotated[
        str | None,
        typer.Option(
            "--default-account",
            help="Counter account for --csv rows no rule matches [default: Expenses:Uncategorized]",
        ),
    ] = None,
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
    allow_errors: Annotated[
        bool,
        typer.Option(
            "--allow-errors",
            help="Preview and apply over semantic ledger errors such as a failing balance assertion; "
            "syntax errors still block",
        ),
    ] = False,
) -> None:
    """Preview bank-export entries; write with --apply.

    A CSV needs no Python importer: name its columns with --csv, or let bea
    read the header row, and categorize with --rules. Other formats go through
    a configured importer's Beangulp identify/account/extract interface.
    Possible duplicates require an explicit --duplicates skip/include decision
    before applying.
    """
    from cli.csv_mapper import infer_date_format, parse_mapping
    from cli.engine import launch

    file = context.current().entry_file()
    source = source.expanduser().resolve()
    if csv_mapping is not None and config is not None:
        raise UsageError("Pass --csv or --config, not both.")
    if not source.is_file():
        raise UsageError(f"Export file not found: {source}")

    csv_request: str | None = csv_mapping
    config_to_remember: Path | None = None
    csv_origin = "--csv"
    csv_run_account: str | None = csv_account
    csv_rules_arg: Path | None = rules_file.expanduser().resolve() if rules_file is not None else None
    remembered_run = False
    inferred_notes: list[str] = []
    # Only a date format the caller chose is worth remembering. An inferred one
    # belongs to the file it was read from, and two exports can share a header
    # row without sharing a date convention.
    chosen_date_format = date_format
    if csv_request is not None and csv_request.strip().casefold() == "auto":
        csv_request = _inferred_mapping(source, explicit=True, notes=inferred_notes)
        csv_origin = "inferred --csv"
    if csv_request is None and config is None:
        remembered = _recall_csv(file, source, csv_account)
        if remembered is not None:
            csv_request = remembered["mapping"]
            csv_run_account = csv_account or remembered["account"]
            remembered_run = True
            csv_origin = "remembered --csv"
            if csv_rules_arg is None and isinstance(remembered.get("rules"), str):
                csv_rules_arg = Path(remembered["rules"])
            if default_account is None and isinstance(remembered.get("default_account"), str):
                default_account = remembered["default_account"]
            if date_format is None and isinstance(remembered.get("date_format"), str):
                date_format = remembered["date_format"]
        elif config is None and _config_available(file) is None:
            csv_request = _inferred_mapping(source, explicit=False, notes=inferred_notes)
            if csv_request is not None:
                csv_origin = "inferred --csv"

    csv_mode = csv_request is not None
    argv = ["import", "--file", str(file), "--source", str(source), "--duplicates", duplicates.value]
    if apply:
        argv.append("--apply")
    if allow_errors:
        argv.append("--allow-errors")
    if into is not None:
        argv += ["--into", str(into)]
    for key in id_key or []:
        argv += ["--id-key", key]

    if csv_mode:
        if csv_run_account is None or csv_request is None:
            if csv_origin == "inferred --csv":
                raise UsageError(
                    f"Read a column mapping from the header row of {source.name} (--csv {csv_request}), but not "
                    "which account the export belongs to. Add --account Assets:Checking, or choose a Python "
                    "importer with --config FILE.",
                    details=inferred_notes,
                )
            raise UsageError(
                "--csv needs --account ACCOUNT for the source account, for example --account Assets:Checking.",
                details=inferred_notes,
            )
        mapping = parse_mapping(csv_request)
        if date_format is None:
            date_format, ambiguous = infer_date_format(source, mapping.columns["date"])
            if date_format is None:
                date_format = "%Y-%m-%d"
            elif ambiguous:
                inferred_notes.append(
                    f"Dates parse as {date_format} but the column has no day past the twelfth, so day-first and "
                    "month-first cannot be told apart. Pass --date-format if that is the wrong reading."
                )
        default_account = default_account or "Expenses:Uncategorized"
        if remembered_run:
            output.note(f"Using remembered column mapping for {source.name} (--date-format {date_format}).")
        elif csv_origin == "inferred --csv":
            output.note(
                f"Read the column mapping from the header row: --csv {csv_request} --date-format {date_format}. "
                "Pass --csv to override."
            )
        else:
            output.note("Using column mapping (--csv).")
        for line in inferred_notes:
            output.note(line)
        argv += ["--csv", csv_request, "--account", csv_run_account, "--config-source", csv_origin]
        argv += ["--date-format", date_format, "--default-account", default_account]
        if csv_rules_arg is not None:
            argv += ["--rules", str(csv_rules_arg)]
        if not remembered_run:
            _remember_csv(
                file,
                source,
                {
                    "mapping": csv_request,
                    "account": csv_run_account,
                    "rules": str(csv_rules_arg) if csv_rules_arg is not None else None,
                    "default_account": default_account,
                    "date_format": chosen_date_format,
                },
            )
    else:
        config_path, config_source = _config_path(file, config)
        config_to_remember = config_path
        output.note(f"Using importers from {config_path} ({config_source})")
        argv += ["--config", str(config_path), "--config-source", config_source]
        if importer_name is not None:
            argv += ["--importer", importer_name]

    try:
        preview = launch.helper_json(argv)
    except BeaError as exc:
        # Extraction finished far enough to build a preview (conflict / invalid
        # apply). Surface the engine's notes the same way a successful preview does.
        if isinstance(exc.result, dict):
            for note in exc.result.get("notes") or []:
                output.note(str(note))
        raise
    for note in preview.pop("notes", []) or []:
        output.note(str(note))
    if config_to_remember is not None:
        _remember_config(file, config_to_remember)

    if context.current().json_output:
        output.emit(preview, target=output.file_target(file))
    else:
        typer.echo(
            f"{preview['importer']} → {preview['account']}: {preview['ready']} ready, "
            f"{preview['duplicates']} exact duplicates, {preview['possible_duplicates']} possible duplicates"
        )
        headers = ["ROW", "STATUS", "DATE", "PAYEE / NARRATION", "SOURCE AMOUNT"]
        if csv_mode:
            headers.append("RULE")
        rows = preview["rows"]
        output.table(
            headers,
            [
                [
                    str(row["row"]),
                    row["status"],
                    row["date"],
                    " / ".join(v for v in (row["payee"], row["narration"]) if v),
                    row["amount"],
                    *([row.get("rule") or ""] if csv_mode else []),
                ]
                for row in rows
            ],
        )
        for row in rows:
            if row["match"]:
                match = row["match"]
                if match["row"] is not None:
                    typer.echo(f"\nRow {row['row']}: {row['reason']}\nMatches row {match['row']} of this import:")
                else:
                    typer.echo(
                        f"\nRow {row['row']}: {row['reason']}\nExisting entry at {match['filename']}:{match['lineno']}:"
                    )
                typer.echo(match["entry"])
        typer.echo(preview["diff"])
        for error in preview["validation_errors"]:
            output.note(error)
        for warning in preview["validation_warnings"]:
            output.note(warning)
        if preview.get("importer_output"):
            output.note(preview["importer_output"])
        if apply:
            output.success(f"Wrote {preview['written']} entries to {preview['into']}.")
        else:
            typer.echo("Preview only. Review the entries, then repeat with --apply to write.")
