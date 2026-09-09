"""`bea list <type>` — read directives out of a local ledger.

The eleven directive types differ only in which reader they call, how a row is
formatted, and which filter they accept, so they are declared as data and
registered from three shared command shapes. Loading, error handling, limit
truncation, and the JSON envelope are then written once.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import UsageError
from cli.utils import parse_opt_date, single_line

list_app = typer.Typer(help="List directives from a local .bean file", no_args_is_help=True, rich_markup_mode=None)

LimitOpt = Annotated[int, typer.Option("--limit", "-l", min=1, help="Max results (positive)")]
FromDateOpt = Annotated[str | None, typer.Option("--from-date", help="Start date YYYY-MM-DD")]
ToDateOpt = Annotated[str | None, typer.Option("--to-date", help="End date YYYY-MM-DD")]
AccountFilterOpt = Annotated[
    str | None, typer.Option("--account", "-a", help="Filter by account (case-insensitive substring)")
]
CurrencyFilterOpt = Annotated[str | None, typer.Option("--currency", "-c", help="Exact currency (case-insensitive)")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors", help="Report partial data with errors on stderr; opts strict reads into partial answers"
    ),
]


@dataclass(frozen=True)
class _Spec:
    """One directive type: where to read it, how to show it, what filter it takes."""

    reader: str
    headers: list[str]
    row: Callable[[Any], list[str]]
    empty: str
    filter: str | None = None  # "account", "currency", or nothing but dates


def _format_custom_values(custom: Any) -> str:
    parts = []
    for value in custom.values:
        if value.kind == "amount":
            parts.append(f"{value.number} {value.currency}")
        else:
            parts.append(str(value.value))
    return " ".join(parts)


SPECS: dict[str, _Spec] = {
    "transaction": _Spec(
        reader="list_transactions",
        headers=["DATE", "FLAG", "PAYEE", "NARRATION", "POSTINGS"],
        row=lambda t: [str(t.date), t.flag, t.payee or "", t.narration or "", str(len(t.postings))],
        empty="No transactions found.",
        filter="account",
    ),
    "note": _Spec(
        reader="list_notes",
        headers=["DATE", "ACCOUNT", "COMMENT"],
        row=lambda n: [str(n.date), n.account, n.comment],
        empty="No notes found.",
        filter="account",
    ),
    "balance": _Spec(
        reader="list_balances",
        headers=["DATE", "ACCOUNT", "AMOUNT"],
        row=lambda b: [str(b.date), b.account, f"{b.amount.number} {b.amount.currency}"],
        empty="No balance assertions found.",
        filter="account",
    ),
    "open": _Spec(
        reader="list_opens",
        headers=["DATE", "ACCOUNT", "CURRENCIES"],
        row=lambda o: [str(o.date), o.account, ", ".join(o.currencies)],
        empty="No open directives found.",
        filter="account",
    ),
    "close": _Spec(
        reader="list_closes",
        headers=["DATE", "ACCOUNT"],
        row=lambda c: [str(c.date), c.account],
        empty="No close directives found.",
        filter="account",
    ),
    "document": _Spec(
        reader="list_documents",
        headers=["DATE", "ACCOUNT", "FILENAME"],
        row=lambda d: [str(d.date), d.account, d.filename],
        empty="No documents found.",
        filter="account",
    ),
    "pad": _Spec(
        reader="list_pads",
        headers=["DATE", "ACCOUNT", "SOURCE"],
        row=lambda p: [str(p.date), p.account, p.source_account],
        empty="No pad directives found.",
        filter="account",
    ),
    "price": _Spec(
        reader="list_prices",
        headers=["DATE", "CURRENCY", "AMOUNT"],
        row=lambda p: [str(p.date), p.currency, f"{p.amount.number} {p.amount.currency}"],
        empty="No prices found.",
        filter="currency",
    ),
    "commodity": _Spec(
        reader="list_commodities",
        headers=["DATE", "CURRENCY"],
        row=lambda c: [str(c.date), c.currency],
        empty="No commodity directives found.",
        filter="currency",
    ),
    "event": _Spec(
        reader="list_events",
        headers=["DATE", "TYPE", "DESCRIPTION"],
        row=lambda e: [str(e.date), e.type, e.description],
        empty="No events found.",
    ),
    "custom": _Spec(
        reader="list_customs",
        headers=["DATE", "TYPE", "VALUES"],
        row=lambda c: [str(c.date), c.type, _format_custom_values(c)],
        empty="No custom directives found.",
    ),
}


def _transaction_table(headers: list[str], rows: list[tuple[list[str], list[tuple[str, str]]]]) -> None:
    """Print transactions, wrapping long posting cells under their row in a terminal.

    Piped output keeps the single-line form byte-for-byte; only a terminal
    whose width the single-line row would exceed gets one posting per line,
    with the other columns on the first line.
    """
    import shutil
    import sys

    headers = [single_line(header) for header in headers]
    rows = [
        ([single_line(cell) for cell in cells], [(single_line(account), single_line(amount)) for account, amount in p])
        for cells, p in rows
    ]
    single = [[*cells, "; ".join(f"{account}: {amount}" for account, amount in postings)] for cells, postings in rows]
    try:
        terminal = sys.stdout.isatty()
    except (AttributeError, ValueError):
        terminal = False
    if not terminal:
        output.table(headers, single)
        return
    width = shutil.get_terminal_size().columns
    if all(sum(len(cell) for cell in row) + 2 * (len(row) - 1) <= width for row in single):
        output.table(headers, single)
        return
    widths = [len(header) for header in headers]
    for cells, _ in rows:
        for i, cell in enumerate([*cells, ""]):
            widths[i] = max(widths[i], len(cell))
    # The table reads in the terminal it prints to: shrink narration, then
    # payee, with an ellipsis so the first line fits the width. Piped output
    # and --details keep the full text.
    for i in (3, 2):
        total = sum(widths) + 2 * (len(headers) - 1)
        if total <= width:
            break
        shrink = min(widths[i] - len(headers[i]), total - width)
        if shrink > 0:
            widths[i] -= shrink
    rows = [
        (
            [cell if len(cell) <= widths[i] else f"{cell[: widths[i] - 3]}..." for i, cell in enumerate(cells)],
            postings,
        )
        for cells, postings in rows
    ]
    single = [[*cells, "; ".join(f"{account}: {amount}" for account, amount in postings)] for cells, postings in rows]
    sep = "  "
    typer.echo(sep.join(header.ljust(widths[i]) for i, header in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for (cells, postings), row in zip(rows, single, strict=True):
        line = sep.join(cell.ljust(widths[i]) for i, cell in enumerate(row))
        if len(line) <= width or not postings:
            typer.echo(line)
            continue
        typer.echo(sep.join(cell.ljust(widths[i]) for i, cell in enumerate([*cells, ""])))
        pad = max(len(account) for account, _ in postings)
        for account, amount in postings:
            typer.echo(f"{sep}{account.ljust(pad)}: {amount}")


def _run(spec: _Spec, limit: int, allow_errors: bool, *, details: bool = False, **filters: Any) -> None:
    """Load the ledger, list one directive type, and render it for the active mode."""
    ctx = context.current()
    if filters.get("from_date") and filters.get("to_date") and filters["from_date"] > filters["to_date"]:
        raise UsageError("--from-date must be on or before --to-date.")
    file = ctx.entry_file()
    from cli.directives import reader

    entries, errors = reader.load_file(file)
    output.render_ledger_errors(errors, allow=allow_errors)

    # One extra row tells truncation from an exact fit without a second pass.
    items = getattr(reader, spec.reader)(entries, limit=limit + 1, **filters)
    truncated = len(items) > limit
    items = items[:limit]

    if ctx.json_output:
        output.emit(
            [item.model_dump(mode="json") for item in items],
            target=output.file_target(file),
            truncated=truncated,
            limit=limit,
        )
        return

    if not items:
        typer.echo(spec.empty)
        return
    if details:
        from cli.directives.writer import format_transaction

        output.note("Transactions rendered in Beancount syntax: all postings, with source locations.")
        for item in items:
            if item.source:
                typer.echo(f"{item.source.filename}:{item.source.lineno}")
            typer.echo(format_transaction(item))
    elif spec.reader == "list_transactions":
        account = (filters.get("account") or "").casefold()
        _transaction_table(
            ["DATE", "FLAG", "PAYEE", "NARRATION", "MATCHING POSTING AMOUNTS" if account else "POSTING AMOUNTS"],
            [
                (
                    [
                        str(item.date),
                        item.flag,
                        item.payee or "",
                        item.narration or "(no narration)",
                    ],
                    [
                        (p.account, f"{p.units.number} {p.units.currency}")
                        for p in item.postings
                        if p.units and (not account or account in p.account.casefold())
                    ],
                )
                for item in items
            ],
        )
    else:
        output.table(spec.headers, [spec.row(item) for item in items])
    if truncated:
        output.note(f"Showing the first {limit}; pass --limit for more.")


def _account_command(spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        account: AccountFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            account=account,
        )

    return command


def _currency_command(spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        currency: CurrencyFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            currency=currency,
        )

    return command


def _plain_command(spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
        )

    return command


# Three signatures rather than one: Typer reads the option list off the literal
# signature, so a single shared one would advertise --currency on `list event`.
_COMMANDS = {"account": _account_command, "currency": _currency_command, None: _plain_command}

for _name, _spec in SPECS.items():
    if _name == "transaction":
        continue
    list_app.command(_name, help=f"List {_name} directives from a .bean file.")(_COMMANDS[_spec.filter](_spec))


class TransactionSort(StrEnum):
    oldest = "oldest"
    newest = "newest"


@list_app.command("transaction")
def transactions(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
    flag: Annotated[str | None, typer.Option("--flag", help="Transaction flag, e.g. '!' for entries to review")] = None,
    search: Annotated[
        list[str] | None, typer.Option("--search", help="Case-insensitive text in payee or narration; repeatable")
    ] = None,
    tag: Annotated[list[str] | None, typer.Option("--tag", help="Tag with or without '#'; repeatable")] = None,
    link: Annotated[list[str] | None, typer.Option("--link", help="Link with or without '^'; repeatable")] = None,
    allow_errors: AllowErrorsOpt = False,
    details: Annotated[
        bool,
        typer.Option("--details", help="Render Beancount syntax with every posting, metadata, and source location"),
    ] = False,
    sort: Annotated[
        TransactionSort, typer.Option("--sort", help="Transaction date order, applied before the limit")
    ] = TransactionSort.newest,
) -> None:
    """List recent transactions and their amounts; --details adds metadata and source."""
    if flag is not None and len(flag) != 1:
        from cli.errors import UsageError

        raise UsageError("--flag must be one character, such as '!' or '*'.")
    _run(
        SPECS["transaction"],
        limit,
        allow_errors,
        details=details,
        from_date=parse_opt_date(from_date),
        to_date=parse_opt_date(to_date),
        account=account,
        flag=flag,
        search=search,
        tags=tag,
        links=link,
        newest=sort == TransactionSort.newest,
    )
