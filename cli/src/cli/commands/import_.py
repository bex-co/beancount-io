"""Preview and apply entries extracted by configured Beangulp importers.

Extraction, deduplication, validation, and writes run in `bea-engine import`.
This module owns option parsing, remembered importer/CSV paths, preview display,
and apply/duplicate decisions that the customer types on the command line.
"""

from __future__ import annotations

import hashlib
import json
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.config import config_dir
from cli.errors import BeaError, UsageError
from cli.utils import atomic_write


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


def _display_delimiter(delim: str) -> str:
    """The `--csv delimiter=` spelling for an effective delimiter."""
    return {"\t": "tab"}.get(delim, f"'{delim}'")


def _check_delimiter_conflict(flag: str | None, key: str | None) -> None:
    """`--delimiter` and `--csv delimiter=` must agree when both are set."""
    if flag is not None and key is not None and flag != key:
        raise UsageError(
            f"--delimiter {_display_delimiter(flag)} disagrees with "
            f"--csv delimiter={_display_delimiter(key)}; pass only one."
        )


def _inferred_mapping(
    source: Path, *, explicit: bool, notes: list[str], delimiter: str | None = None, encoding: str = "utf-8"
) -> str | None:
    """A `--csv` spec read off the export's header row.

    `--csv auto` fails for any unreadable header. The automatic attempt falls
    back to Python importers only when no columns were recognized at all.
    """
    from cli.csv_mapper import detect_delimiter, infer_mapping, read_header

    headers = read_header(source, delimiter=delimiter, encoding=encoding)
    inferred = infer_mapping(headers)
    if inferred is not None and inferred.ambiguities:
        # No trailing period: the example pastes back verbatim.
        notes.append(
            f"Several columns could be {', '.join(inferred.ambiguities)}; none was chosen. "
            f"For example: --csv {inferred.example}"
        )
    if inferred is None or inferred.spec is None:
        if inferred is None and not explicit:
            return None
        columns = ", ".join(headers) if headers else "(none)"
        used = delimiter if delimiter is not None else detect_delimiter(source, encoding=encoding)
        if headers and len(headers) == 1 and any(sep in headers[0] for sep in (";", "\t", "|")):
            raise UsageError(
                f"Cannot read a column mapping from the header row of {source.name}. "
                f"The file looks semicolon-, tab-, or pipe-separated but was read as one column ({headers[0]!r}) "
                f"with delimiter {_display_delimiter(used)}. "
                "Pass --delimiter ';' (or tab, or '|'), --csv delimiter=';' — "
                "or omit the override so bea can detect it.",
                details=notes,
            )
        clause = f" (delimiter {_display_delimiter(used)})" if used != "," else ""
        raise UsageError(
            f"Cannot read a column mapping from the header row of {source.name}. "
            f"Its columns are: {columns}{clause}. "
            "Name them with --csv date=Date,amount=Amount,narration=Description.",
            details=notes,
        )
    return inferred.spec


def _remember_config(file: Path, config: Path) -> None:
    record = _config_record(file)
    try:
        record.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(record, json.dumps({"config": str(config)}))
    except OSError as exc:
        output.note(f"Could not remember the importer path: {exc}. Pass --config on the next import.")


def _csv_record(file: Path) -> Path:
    key = hashlib.sha256(str(file.resolve()).encode()).hexdigest()
    return config_dir() / "importers" / f"csv-{key}.json"


def _patch_csv_entry(file: Path, headers: list[str], account: str, updates: dict[str, Any]) -> None:
    """Rewrite stored keys for one remembered entry; failures warn, never fail."""
    from cli.csv_mapper import header_signature

    record = _csv_record(file)
    try:
        payload = json.loads(record.read_text())
        sources = payload.get("sources", [])
        wanted = header_signature(headers)
        for entry in sources:
            if (
                isinstance(entry, dict)
                and header_signature(entry.get("headers")) == wanted
                and entry.get("account") == account
            ):
                entry.update(updates)
        record.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(record, json.dumps({"sources": sources}))
    except OSError as exc:
        output.note(f"Could not update the remembered column mapping: {exc}.")
    except (ValueError, AttributeError):
        pass


def _find_csv_entry(file: Path, headers: list[str] | None, account: str) -> dict[str, Any] | None:
    """The remembered entry for a header row and account, without side effects."""
    from cli.csv_mapper import header_signature

    if not headers:
        return None
    record = _csv_record(file)
    if not record.is_file():
        return None
    try:
        sources = json.loads(record.read_text()).get("sources", [])
    except (ValueError, AttributeError):
        return None
    wanted = header_signature(headers)
    for entry in sources:
        if (
            isinstance(entry, dict)
            and header_signature(entry.get("headers")) == wanted
            and entry.get("account") == account
            and isinstance(entry.get("mapping"), str)
        ):
            return entry
    return None


def _recall_csv(file: Path, source: Path, account: str | None = None, *, notes: list[str]) -> dict[str, Any] | None:
    """A remembered `--csv` run for this root ledger and CSV header row, if any.

    Returns the stored spec only when its mapping and account are usable
    strings; a corrupt record reads as no memory rather than a crash.
    Stale assumptions are repaired loudly: a remembered `sign=ledger` is
    dropped (sign is never re-applied across files) and an unreadable
    remembered `--rules` path degrades to an unruled import, each announced
    in `notes` and persisted back to the record.
    """
    from cli.csv_mapper import header_signature, load_rules, parse_mapping, read_header

    record = _csv_record(file)
    if not record.is_file():
        return None
    try:
        sources = json.loads(record.read_text()).get("sources", [])
    except (ValueError, AttributeError):
        return None
    try:
        headers = read_header(source)
    except UsageError:
        # A non-UTF-8 export can still match a remembered mapping: fingerprint
        # with the decoding that works, then replay the mapping's own key.
        from cli.csv_mapper import probe_decoding

        try:
            headers = read_header(source, encoding=probe_decoding(source))
        except (UsageError, OSError):
            return None
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
    if not matches:
        return None
    entry = matches[0]
    mapping = entry.get("mapping")
    try:
        sign = parse_mapping(mapping).sign if isinstance(mapping, str) else "bank"
    except UsageError:
        sign = "bank"
    if sign == "ledger" and isinstance(mapping, str):
        stripped = ",".join(part for part in mapping.split(",") if part.partition("=")[0].strip() != "sign")
        entry["mapping"] = stripped
        notes.append(
            f"Dropped remembered sign=ledger for {source.name}; sign is never re-applied across files. "
            "Pass sign=ledger explicitly for a ledger-signed export."
        )
        _patch_csv_entry(file, headers, entry["account"], {"mapping": stripped})
    rules_path = entry.get("rules")
    if isinstance(rules_path, str):
        try:
            load_rules(Path(rules_path))
        except UsageError as exc:
            notes.append(
                f"Remembered --rules {rules_path} cannot be used ({exc}); importing without rules. "
                "Re-pass --rules to restore it."
            )
            entry["rules"] = None
            _patch_csv_entry(file, headers, entry["account"], {"rules": None})
    return entry


def _remember_csv(file: Path, source: Path, spec: dict[str, Any], encoding: str = "utf-8") -> None:
    """Remember a `--csv` run keyed by root ledger, CSV header row and account."""
    from cli.csv_mapper import header_signature, read_header

    headers = read_header(source, encoding=encoding)
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
        record.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(record, payload)
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
            help="Column mapping (date=Date,amount=Amount,narration=Description,...; delimiter=';' overrides "
            "detection, encoding=cp1252 overrides UTF-8), or 'auto' to read the header row; "
            "no Python importer needed",
        ),
    ] = None,
    csv_account: Annotated[str | None, typer.Option("--account", help="Source account for --csv rows")] = None,
    date_format: Annotated[
        str | None,
        typer.Option("--date-format", help="strptime date format for --csv; inferred from the file if unset"),
    ] = None,
    delimiter: Annotated[
        str | None,
        typer.Option(
            "--delimiter",
            help="CSV field delimiter for --csv: ',', ';', '|', or 'tab' (detected from the header when omitted)",
        ),
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
    from cli.csv_mapper import detect_delimiter, infer_date_format, parse_delimiter, parse_mapping
    from cli.engine import launch

    file = context.current().entry_file()
    source = source.expanduser().resolve()
    flag_delimiter: str | None = parse_delimiter(delimiter) if delimiter is not None else None
    csv_delimiter: str | None = flag_delimiter
    csv_encoding = "utf-8"
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
    recall_notes: list[str] = []
    recalled_date_format: str | None = None
    recalled_source: str | None = None
    # Only a date format the caller chose is worth remembering. An inferred one
    # belongs to the file it was read from, and two exports can share a header
    # row without sharing a date convention.
    chosen_date_format = date_format
    chosen_default_account = default_account
    if csv_request is not None and csv_request.strip().casefold() == "auto":
        csv_request = _inferred_mapping(
            source, explicit=True, notes=inferred_notes, delimiter=csv_delimiter, encoding=csv_encoding
        )
        csv_origin = "inferred --csv"
    if csv_request is not None and csv_request.strip().casefold() != "auto":
        try:
            peek = parse_mapping(csv_request)
        except UsageError:
            peek = None
        if peek is not None and peek.encoding is not None:
            # The decoding key applies before any read, so detection itself
            # decodes with it; the merge below re-applies it idempotently.
            csv_encoding = peek.encoding
        if peek is not None and not peek.columns:
            # Keys without columns (`encoding=`, `delimiter=`, `sign=` alone):
            # decode with the keys, then infer the mapping like `auto`.
            _check_delimiter_conflict(flag_delimiter, peek.delimiter)
            if peek.delimiter is not None:
                csv_delimiter = peek.delimiter
            csv_request = _inferred_mapping(
                source, explicit=True, notes=inferred_notes, delimiter=csv_delimiter, encoding=csv_encoding
            )
            if peek.sign != "bank" and csv_request is not None:
                csv_request = f"{csv_request},sign={peek.sign}"
            csv_origin = "inferred --csv"
    if csv_request is None and config is None:
        remembered = _recall_csv(file, source, csv_account, notes=recall_notes)
        if remembered is not None:
            csv_request = remembered["mapping"]
            csv_run_account = csv_account or remembered["account"]
            remembered_run = True
            csv_origin = "remembered --csv"
            if isinstance(remembered.get("source"), str):
                recalled_source = remembered["source"]
            if csv_rules_arg is None and isinstance(remembered.get("rules"), str):
                csv_rules_arg = Path(remembered["rules"])
            if default_account is None and isinstance(remembered.get("default_account"), str):
                default_account = remembered["default_account"]
            if date_format is None and isinstance(remembered.get("date_format"), str):
                date_format = remembered["date_format"]
                recalled_date_format = remembered["date_format"]
            if csv_delimiter is None and isinstance(remembered.get("delimiter"), str):
                csv_delimiter = remembered["delimiter"]
        elif config is None and _config_available(file) is None:
            csv_request = _inferred_mapping(
                source, explicit=False, notes=inferred_notes, delimiter=csv_delimiter, encoding=csv_encoding
            )
            if csv_request is not None:
                csv_origin = "inferred --csv"

    csv_mode = csv_request is not None
    if csv_mode and csv_delimiter is None:
        csv_delimiter = detect_delimiter(source, encoding=csv_encoding)
    if csv_origin == "inferred --csv" and csv_request is not None:
        # The echoed spec carries what was assumed, so it pastes back verbatim.
        if csv_delimiter is not None and csv_delimiter != ",":
            csv_request = f"{csv_request},delimiter={_display_delimiter(csv_delimiter)}"
        if csv_encoding != "utf-8":
            csv_request = f"{csv_request},encoding={csv_encoding}"
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
        spec_delimiter = mapping.delimiter
        _check_delimiter_conflict(flag_delimiter, spec_delimiter)
        if spec_delimiter is not None:
            csv_delimiter = spec_delimiter
        if mapping.encoding is not None:
            csv_encoding = mapping.encoding
        if date_format is None:
            date_format, ambiguous = infer_date_format(
                source, mapping.columns["date"], delimiter=csv_delimiter, encoding=csv_encoding
            )
            if date_format is None:
                date_format = "%Y-%m-%d"
            elif ambiguous:
                inferred_notes.append(
                    f"Dates parse as {date_format} but the column has no day past the twelfth, so day-first and "
                    "month-first cannot be told apart. Pass --date-format if that is the wrong reading."
                )
        elif recalled_date_format is not None:
            # A remembered format is re-validated against each file: two
            # exports can share headers without sharing a date convention.
            # Ambiguous files cannot prove a mismatch, so only an unambiguous
            # disagreement refuses; an unreadable column keeps the memory.
            inferred_format, ambiguous = infer_date_format(
                source, mapping.columns["date"], delimiter=csv_delimiter, encoding=csv_encoding
            )
            if inferred_format is not None and not ambiguous and inferred_format != recalled_date_format:
                raise UsageError(
                    f"Remembered --date-format {recalled_date_format} does not match {source.name}, whose "
                    f"dates look like {inferred_format}. Pass --date-format {inferred_format} (or --csv) "
                    "for this file.",
                    details=recall_notes,
                )
        default_account = default_account or "Expenses:Uncategorized"
        delimiter_note = ""
        if csv_delimiter is not None and csv_delimiter != ",":
            delimiter_note = f", delimiter {_display_delimiter(csv_delimiter)}"
        encoding_note = f", encoding {csv_encoding}" if csv_encoding != "utf-8" else ""
        frontend_notes: list[str] = []
        if remembered_run:
            columns_only = ",".join(
                part
                for part in (csv_request or "").split(",")
                if part.partition("=")[0].strip() not in {"delimiter", "encoding", "sign"}
            )
            settings = [f"--csv {columns_only}"]
            if date_format is not None:
                settings.append(f"--date-format {date_format}")
            if csv_rules_arg is not None:
                settings.append(f"--rules {csv_rules_arg}")
            if default_account is not None:
                settings.append(f"--default-account {default_account}")
            if csv_delimiter is not None and csv_delimiter != ",":
                settings.append(f"--delimiter {_display_delimiter(csv_delimiter)}")
            if csv_encoding != "utf-8":
                settings.append(f"--csv encoding={csv_encoding}")
            if recalled_source is not None and recalled_source != source.name:
                frontend_notes.append(
                    f"Using settings remembered from {recalled_source} for {source.name}: {' '.join(settings)}."
                )
            else:
                frontend_notes.append(f"Using remembered settings for {source.name}: {' '.join(settings)}.")
        elif csv_origin == "inferred --csv":
            frontend_notes.append(
                f"Read the column mapping from the header row: --csv {csv_request} --date-format {date_format}. "
                "Pass --csv to override."
            )
        else:
            frontend_notes.append(f"Using column mapping (--csv{delimiter_note}{encoding_note}).")
        frontend_notes.extend(recall_notes)
        frontend_notes.extend(inferred_notes)
        for line in frontend_notes:
            output.note(line)
        # The engine's parser rejects `delimiter=` and `encoding=` by design:
        # the frontend owns the merge above and forwards columns only.
        forward_spec = ",".join(
            part for part in csv_request.split(",") if part.partition("=")[0].strip() not in {"delimiter", "encoding"}
        )
        argv += ["--csv", forward_spec, "--account", csv_run_account, "--config-source", csv_origin]
        if csv_encoding != "utf-8":
            argv += ["--encoding", csv_encoding]
        argv += ["--date-format", date_format, "--default-account", default_account]
        if csv_delimiter is not None:
            argv += ["--delimiter", "tab" if csv_delimiter == "\t" else csv_delimiter]
        if csv_rules_arg is not None:
            argv += ["--rules", str(csv_rules_arg)]
        if not remembered_run:
            # Sign is never remembered: a ledger-signed export must not flip
            # a later bank-signed file that merely shares its headers.
            stored_mapping = ",".join(
                part for part in (csv_request or "").split(",") if part.partition("=")[0].strip() != "sign"
            )
            try:
                from cli.csv_mapper import read_header

                prior = _find_csv_entry(file, read_header(source, encoding=csv_encoding), csv_run_account or "")
            except UsageError:
                prior = None
            if prior is not None:
                discarded: list[str] = []
                if isinstance(prior.get("rules"), str) and csv_rules_arg is None:
                    discarded.append(f"--rules {prior['rules']}")
                if (
                    isinstance(prior.get("default_account"), str)
                    and chosen_default_account is None
                    and prior["default_account"] != default_account
                ):
                    discarded.append(f"--default-account {prior['default_account']}")
                if (
                    isinstance(prior.get("date_format"), str)
                    and chosen_date_format is None
                    and prior["date_format"] != date_format
                ):
                    discarded.append(f"--date-format {prior['date_format']}")
                if discarded:
                    message = (
                        f"Discarded remembered settings for {source.name}: "
                        f"{', '.join(discarded)}. Re-pass them to keep them across refreshes."
                    )
                    frontend_notes.append(message)
                    output.note(message)
            _remember_csv(
                file,
                source,
                {
                    "mapping": stored_mapping,
                    "source": source.name,
                    "account": csv_run_account,
                    "rules": str(csv_rules_arg) if csv_rules_arg is not None else None,
                    "default_account": default_account,
                    "date_format": chosen_date_format,
                    "delimiter": csv_delimiter,
                },
                encoding=csv_encoding,
            )
    else:
        frontend_notes = []
        config_path, config_source = _config_path(file, config)
        config_to_remember = config_path
        frontend_notes.append(f"Using importers from {config_path} ({config_source})")
        output.note(frontend_notes[0])
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
    engine_notes = [str(note) for note in preview.pop("notes", []) or []]
    for note in engine_notes:
        output.note(note)
    if config_to_remember is not None:
        _remember_config(file, config_to_remember)

    if context.current().json_output:
        notes = [*frontend_notes, *engine_notes]
        if notes:
            preview["notes"] = notes
        if csv_mode and date_format is not None:
            preview["date_format"] = date_format
        preview["remembered"] = (
            {
                "mapping": csv_request,
                "source": recalled_source,
                "account": csv_run_account,
                "date_format": date_format,
                "delimiter": csv_delimiter,
                "encoding": csv_encoding,
                "rules": str(csv_rules_arg) if csv_rules_arg is not None else None,
                "default_account": default_account,
            }
            if remembered_run
            else None
        )
        output.emit(preview, target=output.file_target(file))
    else:
        summary = (
            f"{preview['importer']} → {preview['account']}: {preview['ready']} ready, "
            f"{preview['duplicates']} exact duplicates, {preview['possible_duplicates']} possible duplicates"
        )
        if preview["skipped_blank"]:
            noun = "row" if preview["skipped_blank"] == 1 else "rows"
            summary += f", {preview['skipped_blank']} blank {noun} skipped"
        typer.echo(summary)
        headers = ["ROW", "STATUS", "DATE", "PAYEE / NARRATION", "SOURCE AMOUNT", "ID"]
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
                    row.get("id_source") or "",
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
            written = preview["written"]
            noun = "entry" if written == 1 else "entries"
            output.success(f"Wrote {written} {noun} to {preview['into']}.")
        else:
            typer.echo("Preview only. Review the entries, then repeat with --apply to write.")
