"""The `bea-engine` command tree.

Every command is independently invocable: it takes ledger paths and ordinary
arguments, and answers with one JSON envelope (see `protocol`). Nothing here
knows about the frontend's terminal rendering, credentials or AI clients — the
frontend reads the envelope and decides how to show it.

`shell` is the one exception, and it says so in its own help: an interactive
terminal session cannot be summarised in an envelope, so it streams. Every
other command answers exactly one JSON object.

Init and import accounting operations live here as `init` / `import` (t021).
Balances and Fava reports live as `report` / `balance` (t020).
Ask's raw-text writes live as `append` (t022).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Any

import typer

from bea_engine import protocol, version

app = typer.Typer(
    help="Beancount.io engine helper. Ledger operations that load Beancount, one JSON object per call.",
    no_args_is_help=True,
    add_completion=False,
)


@app.command()
def check(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to parse and validate.")],
) -> None:
    """Parse, validate and realize a ledger.

    Answers `{"valid": true, "errors": []}`. A ledger that does not load is a
    `validation` failure whose `details` hold one line per loader error; unlike
    the rest of the helper there is no lenient mode, because reporting the
    errors is the whole job.
    """
    with protocol.answering("check") as answer:
        answer.data = _validate(_ledger(file))


@app.command()
def query(
    query_string: Annotated[str, typer.Argument(help="The BQL statement, dot command or stored query to run.")],
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to query.")],
    format: Annotated[
        str, typer.Option("--format", help="Result shape: json for columns and rows, or text, csv, beancount.")
    ] = "json",
    output: Annotated[
        Path | None, typer.Option("--output", "-o", help="Write a rendered result here instead of into the envelope.")
    ] = None,
    numberify: Annotated[
        bool, typer.Option("--numberify", "-m", help="Split amounts into per-currency columns.")
    ] = False,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Answer even when the ledger has load errors.")
    ] = False,
) -> None:
    """Run one query and answer with its result.

    `--format json` answers `{"columns": [...], "rows": [...]}` with amounts as
    strings. Any other format answers `{"text": "..."}` holding upstream's own
    rendering, dispatched through the shell so `PRINT` prints directives rather
    than a `ROW(*)` table.

    Both shapes also carry `errors`, the ledger's load errors formatted as
    `file:line: message`. Without `--allow-errors` a ledger that does not load
    is a `validation` failure instead: a total computed from a broken ledger
    reads as authoritative and is not.
    """
    with protocol.answering("query") as answer:
        from bea_engine import query as bql

        resolved = _ledger(file)
        if format == "json":
            answer.data = bql.rows_answer(resolved, query_string, allow_errors=allow_errors)
        else:
            answer.data = bql.text_answer(
                resolved,
                query_string,
                output=output,
                format=format,
                numberify=numberify,
                allow_errors=allow_errors,
            )


@app.command("list")
def list_directives(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to read.")],
    type: Annotated[str, typer.Option("--type", "-t", help="Directive type: transaction, open, balance, price, ...")],
    limit: Annotated[int, typer.Option("--limit", "-l", help="Maximum number of results.")] = 50,
    from_date: Annotated[str | None, typer.Option("--from-date", help="Earliest directive date, YYYY-MM-DD.")] = None,
    to_date: Annotated[str | None, typer.Option("--to-date", help="Latest directive date, YYYY-MM-DD.")] = None,
    account: Annotated[
        str | None, typer.Option("--account", "-a", help="Account substring, case-insensitive; account-bearing types.")
    ] = None,
    currency: Annotated[
        str | None, typer.Option("--currency", "-c", help="Exact currency, case-insensitive; price and commodity.")
    ] = None,
    flag: Annotated[str | None, typer.Option("--flag", help="Transaction flag, such as '!'.")] = None,
    search: Annotated[
        list[str] | None, typer.Option("--search", help="Text in a transaction's payee or narration; repeatable.")
    ] = None,
    tag: Annotated[
        list[str] | None,
        typer.Option("--tag", help="Transaction tag, with or without '#'; repeatable."),
    ] = None,
    link: Annotated[
        list[str] | None, typer.Option("--link", help="Transaction link, with or without '^'; repeatable.")
    ] = None,
    newest: Annotated[
        bool,
        typer.Option("--newest", help="Take the most recent transactions, not the earliest."),
    ] = False,
    details: Annotated[
        bool, typer.Option("--details", help="Also render each transaction as Beancount syntax.")
    ] = False,
) -> None:
    """Read one directive type out of a ledger.

    Answers `{"items": [...], "truncated": bool, "errors": [...]}`. Items are
    business JSON — dates as `YYYY-MM-DD`, amounts as strings — never Beancount
    objects. `truncated` says the limit cut the answer short.

    Unlike `check`, a ledger with load errors still answers: `errors` carries
    them, because whether a partial listing is acceptable depends on who is
    reading it, and only the caller knows that.
    """
    with protocol.answering("list") as answer:
        from bea_engine.ledger import listing

        answer.data = listing.answer(
            _ledger(file),
            type,
            limit=limit,
            from_date=_date("--from-date", from_date),
            to_date=_date("--to-date", to_date),
            account=account,
            currency=currency,
            flag=flag,
            search=list(search) if search else None,
            tags=list(tag) if tag else None,
            links=list(link) if link else None,
            newest=newest,
            details=details,
        )


@app.command()
def add(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file the write is validated against.")],
    type: Annotated[str, typer.Option("--type", "-t", help="Directive type: transaction, open, balance, price, ...")],
    request: Annotated[
        str, typer.Option("--request", help="The directive as JSON, or '-' to read that JSON from stdin.")
    ],
    into: Annotated[
        Path | None, typer.Option("--into", help="Write to this included file, relative to the root ledger.")
    ] = None,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Accept semantic ledger errors; syntax must still be valid.")
    ] = False,
    strict_read: Annotated[
        bool, typer.Option("--strict-read", help="Refuse to read a ledger that has load errors (price only).")
    ] = False,
) -> None:
    """Validate a directive and append it to a ledger.

    Answers what reached the file: `{"written": 1, "directive": {...},
    "warnings": [...], "target": "/abs/path"}`. Nothing is written unless the
    whole ledger still loads afterwards, so a failure leaves every byte in
    place; `--allow-errors` accepts semantic errors but never bad syntax.

    `--request` is JSON holding what the customer typed — a posting such as
    `Assets:Stock 2 AAPL {100 USD}`, a balance tolerance, a typed metadata
    value — because reading those is Beancount's job. `src/bea_engine/README.md`
    documents the fields each type takes. Pass `-` to read the JSON from stdin,
    which is what a batch of transactions needs.
    """
    with protocol.answering("add") as answer:
        from bea_engine.ledger import adding

        answer.data = adding.answer(
            _ledger(file),
            type,
            _request(request),
            into=into,
            allow_errors=allow_errors,
            strict_read=strict_read,
        )


@app.command()
def append(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file the write is validated against.")],
    text: Annotated[
        str, typer.Option("--text", help="Raw Beancount directive text, or '-' to read that text from stdin.")
    ],
    into: Annotated[
        Path | None, typer.Option("--into", help="Write to this included file, relative to the root ledger.")
    ] = None,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Accept semantic ledger errors; syntax must still be valid.")
    ] = False,
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", help="Validate only and return a snapshot token for a later commit."),
    ] = False,
    token: Annotated[
        str | None,
        typer.Option("--token", help="Snapshot token from a prior --dry-run; refuse if the ledger changed."),
    ] = None,
) -> None:
    """Validate and append raw Beancount directive text.

    For `bea ask`: the model produces free-form ledger text, the frontend
    confirms with the user, and this command does the parse / validate / write.
    `--dry-run` answers `{"count", "target", "warnings", "token"}` without
    writing; a subsequent call with the same `--text` and that `--token`
    commits, or refuses with `conflict` if anything in the include graph
    changed while the user was confirming.
    """
    with protocol.answering("append") as answer:
        from bea_engine.ledger import appending

        answer.data = appending.answer(
            _ledger(file),
            _text(text),
            into=into,
            allow_errors=allow_errors,
            dry_run=dry_run,
            token=appending.parse_token(token) if token is not None else None,
        )


@app.command()
def report(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to report on.")],
    kind: Annotated[
        str,
        typer.Option(
            "--kind",
            "-k",
            help="Report: overview, income-statement, balance-sheet, or trial-balance.",
        ),
    ],
    conversion: Annotated[
        str | None, typer.Option("--conversion", "-x", help="Currency; defaults to the single operating currency.")
    ] = None,
    time: Annotated[
        str | None, typer.Option("--time", "-t", help='Time filter: year, month, 2026, 2026-08, or "2026-01 - 2026-06"')
    ] = None,
    account: Annotated[
        str | None, typer.Option("--account", "-a", help="Account filter: a parent account or a regular expression")
    ] = None,
    interval: Annotated[str, typer.Option("--interval", "-i", help="Reporting interval")] = "monthly",
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Answer even when the ledger has load errors or missing prices.")
    ] = False,
) -> None:
    """Compute one financial report and answer with its JSON-ready payload.

    Answers the same shapes `bea report … --json` has always emitted: metadata
    (period, conversion, valuation), account trees, interval series, and
    `display_precision` for human rounding. Amounts are strings; dates are ISO.
    """
    with protocol.answering("report") as answer:
        from bea_engine import report as reports

        answer.data = reports.answer(
            _ledger(file),
            kind,
            conversion=conversion,
            time=time,
            account=account,
            interval=interval,
            allow_errors=allow_errors,
        )


@app.command()
def balance(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to report on.")],
    accounts: Annotated[
        list[str] | None, typer.Argument(help="Account substrings; case-insensitive. Omit for the trial balance.")
    ] = None,
    conversion: Annotated[
        str | None, typer.Option("--conversion", "-x", help="Currency; defaults to the single operating currency.")
    ] = None,
    time: Annotated[
        str | None, typer.Option("--time", "-t", help='Time filter: year, month, 2026, 2026-08, or "2026-01 - 2026-06"')
    ] = None,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Answer even when the ledger has load errors or missing prices.")
    ] = False,
) -> None:
    """Compute filtered account balances (or the trial balance) as JSON.

    Same payload as `bea balance --json`: five account-type trees (possibly
    pruned), valuation metadata, and display precision. With no account terms,
    every open account is included.
    """
    with protocol.answering("balance") as answer:
        from bea_engine import report as reports

        answer.data = reports.answer(
            _ledger(file),
            "balances",
            conversion=conversion,
            time=time,
            accounts=list(accounts) if accounts else None,
            allow_errors=allow_errors,
        )


@app.command("init")
def init_ledger(
    file: Annotated[Path, typer.Option("--file", "-f", help="New ledger file to create (must not already exist).")],
    currency: Annotated[str, typer.Option("--currency", "-c", help="Operating currency, e.g. USD or EUR.")],
    date: Annotated[str, typer.Option("--date", help="Earliest history/opening date YYYY-MM-DD.")],
    opening_balance: Annotated[
        list[str] | None,
        typer.Option("--opening-balance", help="'ACCOUNT NUMBER' in the operating currency; repeat for each account."),
    ] = None,
) -> None:
    """Create a starter personal ledger with common accounts.

    Answers `{"created": "...", "currency": "...", "date": "...", "accounts": [...]}`.
    The file is created atomically after validation; it never overwrites.
    """
    with protocol.answering("init") as answer:
        from bea_engine import initiating

        answer.data = initiating.answer(
            file.expanduser().absolute(),
            currency=currency,
            date=date,
            opening_balances=list(opening_balance) if opening_balance else None,
        )


@app.command("import")
def import_entries(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to import into.")],
    source: Annotated[Path, typer.Option("--source", help="Bank/card export file.")],
    csv_mapping: Annotated[
        str | None, typer.Option("--csv", help="Column mapping (date=Date,amount=Amount,...); no Python importer.")
    ] = None,
    csv_account: Annotated[str | None, typer.Option("--account", help="Source account for --csv rows.")] = None,
    date_format: Annotated[str | None, typer.Option("--date-format", help="strptime date format for --csv.")] = None,
    rules_file: Annotated[
        Path | None, typer.Option("--rules", help="TOML categorization rules for --csv rows.")
    ] = None,
    default_account: Annotated[
        str | None, typer.Option("--default-account", help="Counter account for unmatched --csv rows.")
    ] = None,
    config: Annotated[Path | None, typer.Option("--config", help="Python CONFIG file of Beangulp importers.")] = None,
    importer_name: Annotated[str | None, typer.Option("--importer", help="Importer name when multiple match.")] = None,
    apply: Annotated[bool, typer.Option("--apply", help="Validate and write the previewed entries.")] = False,
    duplicates: Annotated[
        str, typer.Option("--duplicates", help="Decision for possible duplicates: review, skip, or include.")
    ] = "review",
    id_key: Annotated[
        list[str] | None, typer.Option("--id-key", help="Stable bank ID metadata key; repeatable.")
    ] = None,
    into: Annotated[
        Path | None, typer.Option("--into", help="Write to an included file, relative to the root ledger.")
    ] = None,
    allow_errors: Annotated[
        bool, typer.Option("--allow-errors", help="Accept semantic ledger errors; syntax must still be valid.")
    ] = False,
    config_source: Annotated[
        str, typer.Option("--config-source", help="Label for how the importer/mapping was chosen (for the preview).")
    ] = "--config",
) -> None:
    """Extract bank-export entries, review duplicates, optionally append.

    Answers the same preview payload `bea import --json` has always emitted:
    rows with status/reason/entry text, ready/written counts, validation
    errors/warnings, and a unified diff. Exact import-id matches are always
    skipped; `--duplicates` only decides possible (fingerprint) matches.
    """
    with protocol.answering("import") as answer:
        from bea_engine import importing

        answer.data = importing.answer(
            _ledger(file),
            source,
            csv_mapping=csv_mapping,
            csv_account=csv_account,
            date_format=date_format,
            rules_file=rules_file,
            default_account=default_account,
            config=config,
            importer_name=importer_name,
            apply=apply,
            duplicates=duplicates,
            id_keys=list(id_key) if id_key else None,
            into=into,
            allow_errors=allow_errors,
            config_source=config_source,
        )


@app.command()
def shell(
    file: Annotated[Path, typer.Option("--file", "-f", help="Root ledger file to query.")],
    numberify: Annotated[
        bool, typer.Option("--numberify", "-m", help="Split amounts into per-currency columns.")
    ] = False,
    no_errors: Annotated[bool, typer.Option("--no-errors", "-q", help="Do not report load errors on startup.")] = False,
) -> None:
    """Open the interactive query shell on this terminal.

    The one exception to the envelope contract: this command streams to stdout
    and reads stdin, because that is what an interactive session is. It is the
    shell `bean-query` opens, with its dot commands, readline and pager, plus
    the exact-path and result-precision fixes in `bea_engine.query`.
    """
    import sys

    from bea_engine import query as bql

    try:
        ledger = _ledger(file)
    except protocol.EngineError as exc:
        # No envelope to put it in, so it reads like any other program's
        # complaint. `bea` resolves the ledger before it gets here, so this is
        # for someone running the helper directly.
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(exc.exit_code) from None
    bql.interactive(ledger, numberify=numberify, show_errors=not no_errors)


@app.command("version")
def version_command() -> None:
    """Report the engine version, for provisioning to confirm what it installed."""
    with protocol.answering("version") as answer:
        answer.data = {"version": version()}


def _ledger(file: Path) -> Path:
    """The ledger as an absolute path, or a usage failure naming what is wrong.

    Resolved because Beancount's loader asserts on a relative entry path and
    resolves every `include` against it.
    """
    if not file.exists():
        raise protocol.UsageError(f"No ledger file at '{file}'.")
    if not file.is_file():
        raise protocol.UsageError(f"Ledger path '{file}' is not a regular file.")
    return file.resolve()


def _date(option: str, value: str | None) -> Any:
    """An optional `YYYY-MM-DD` filter, or a usage failure naming the option."""
    if value is None:
        return None
    import datetime

    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        raise protocol.UsageError(f"{option} must be a date in YYYY-MM-DD form, not {value!r}.") from None


def _request(value: str) -> dict[str, Any]:
    """The JSON request object, from argv or from stdin when it is `-`.

    stdin because a batch of transactions does not fit in an argument list, and
    because a request read from a pipe needs no shell quoting at all.
    """
    text = _text(value)
    try:
        request = json.loads(text)
    except ValueError as exc:
        raise protocol.UsageError(f"--request is not valid JSON: {exc}.") from None
    if not isinstance(request, dict):
        raise protocol.UsageError(f"--request must be a JSON object, not {type(request).__name__}.")
    return request


def _text(value: str) -> str:
    """A text payload from argv, or from stdin when it is `-`."""
    import sys

    return sys.stdin.read() if value == "-" else value


def _validate(file: Path) -> dict[str, Any]:
    from bea_engine.query import format_error
    from fava.core.loader import load_file

    _entries, errors, _options = load_file(str(file))

    if errors:
        raise protocol.LedgerError(
            f"{file}: {len(errors)} error(s).",
            details=[format_error(error) for error in errors],
        )
    return {"valid": True, "errors": []}
