"""`bea list <type>` — read directives out of a local ledger.

The reading happens in the engine (`bea-engine list`); this module is the option
surface and the rendering. The eleven directive types differ only in how a row is
formatted and which filter they accept, so they are declared as data and
registered from three shared command shapes. Loading, error handling, limit
truncation, and the JSON envelope are then written once.

Rows arrive as the JSON the helper answered with, so nothing here knows a
Beancount type: a cell is a string in a dict, and `--details` renders the
Beancount syntax the helper already produced.
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
    """One directive type: how to show it, and what filter it takes."""

    headers: list[str]
    row: Callable[[dict[str, Any]], list[str]]
    empty: str
    filter: str | None = None  # "account", "currency", or nothing but dates


def _format_custom_values(custom: dict[str, Any]) -> str:
    parts = []
    for value in custom["values"]:
        if value["kind"] == "amount":
            parts.append(f"{value['number']} {value['currency']}")
        else:
            parts.append(str(value["value"]))
    return " ".join(parts)


def _amount(amount: dict[str, Any]) -> str:
    return f"{amount['number']} {amount['currency']}"


SPECS: dict[str, _Spec] = {
    "transaction": _Spec(
        headers=["DATE", "FLAG", "PAYEE", "NARRATION", "POSTINGS"],
        row=lambda t: [t["date"], t["flag"], t["payee"] or "", t["narration"] or "", str(len(t["postings"]))],
        empty="No transactions found.",
        filter="account",
    ),
    "note": _Spec(
        headers=["DATE", "ACCOUNT", "COMMENT"],
        row=lambda n: [n["date"], n["account"], n["comment"]],
        empty="No notes found.",
        filter="account",
    ),
    "balance": _Spec(
        headers=["DATE", "ACCOUNT", "AMOUNT"],
        row=lambda b: [b["date"], b["account"], _amount(b["amount"])],
        empty="No balance assertions found.",
        filter="account",
    ),
    "open": _Spec(
        headers=["DATE", "ACCOUNT", "CURRENCIES"],
        row=lambda o: [o["date"], o["account"], ", ".join(o["currencies"])],
        empty="No open directives found.",
        filter="account",
    ),
    "close": _Spec(
        headers=["DATE", "ACCOUNT"],
        row=lambda c: [c["date"], c["account"]],
        empty="No close directives found.",
        filter="account",
    ),
    "document": _Spec(
        headers=["DATE", "ACCOUNT", "FILENAME"],
        row=lambda d: [d["date"], d["account"], d["filename"]],
        empty="No documents found.",
        filter="account",
    ),
    "pad": _Spec(
        headers=["DATE", "ACCOUNT", "SOURCE"],
        row=lambda p: [p["date"], p["account"], p["source_account"]],
        empty="No pad directives found.",
        filter="account",
    ),
    "price": _Spec(
        headers=["DATE", "CURRENCY", "AMOUNT"],
        row=lambda p: [p["date"], p["currency"], _amount(p["amount"])],
        empty="No prices found.",
        filter="currency",
    ),
    "commodity": _Spec(
        headers=["DATE", "CURRENCY"],
        row=lambda c: [c["date"], c["currency"]],
        empty="No commodity directives found.",
        filter="currency",
    ),
    "event": _Spec(
        headers=["DATE", "TYPE", "DESCRIPTION"],
        row=lambda e: [e["date"], e["type"], e["description"]],
        empty="No events found.",
    ),
    "custom": _Spec(
        headers=["DATE", "TYPE", "VALUES"],
        row=lambda c: [c["date"], c["type"], _format_custom_values(c)],
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


def _run(name: str, spec: _Spec, limit: int, allow_errors: bool, *, details: bool = False, **filters: Any) -> None:
    """Ask the engine for one directive type, and render it for the active mode."""
    from cli.engine import launch

    ctx = context.current()
    if filters.get("from_date") and filters.get("to_date") and filters["from_date"] > filters["to_date"]:
        raise UsageError("--from-date must be on or before --to-date.")
    file = ctx.entry_file()

    # --details only feeds the human rendering, and the JSON envelope returns
    # before it is used; asking for it there would render Beancount for nothing.
    rendering = details and not ctx.json_output
    argv = ["list", "--file", str(file), "--type", name, "--limit", str(limit)]
    for option, value in (("--from-date", filters.get("from_date")), ("--to-date", filters.get("to_date"))):
        if value is not None:
            argv += [option, value.isoformat()]
    for option, value in (
        ("--account", filters.get("account")),
        ("--currency", filters.get("currency")),
        ("--flag", filters.get("flag")),
    ):
        if value is not None:
            argv += [option, str(value)]
    for option, values in (
        ("--search", filters.get("search")),
        ("--tag", filters.get("tags")),
        ("--link", filters.get("links")),
    ):
        for value in values or []:
            argv += [option, str(value)]
    if filters.get("newest"):
        argv.append("--newest")
    if rendering:
        argv.append("--details")

    data = launch.helper_json(argv)
    output.render_ledger_errors(data.get("errors") or [], allow=allow_errors)
    items: list[dict[str, Any]] = list(data["items"])
    truncated = bool(data["truncated"])

    if ctx.json_output:
        output.emit(items, target=output.file_target(file), truncated=truncated, limit=limit)
        return

    if not items:
        typer.echo(spec.empty)
        return
    if rendering:
        output.note("Transactions rendered in Beancount syntax: all postings, with source locations.")
        for item, rendered in zip(items, data["rendered"], strict=True):
            if item.get("source"):
                typer.echo(f"{item['source']['filename']}:{item['source']['lineno']}")
            typer.echo(rendered)
    elif name == "transaction":
        account = (filters.get("account") or "").casefold()
        _transaction_table(
            ["DATE", "FLAG", "PAYEE", "NARRATION", "MATCHING POSTING AMOUNTS" if account else "POSTING AMOUNTS"],
            [
                (
                    [
                        item["date"],
                        item["flag"],
                        item["payee"] or "",
                        item["narration"] or "(no narration)",
                    ],
                    [
                        (p["account"], _amount(p["units"]))
                        for p in item["postings"]
                        if p["units"] and (not account or account in p["account"].casefold())
                    ],
                )
                for item in items
            ],
        )
    else:
        output.table(spec.headers, [spec.row(item) for item in items])
    if truncated:
        output.note(f"Showing the first {limit}; pass --limit for more.")


def _account_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        account: AccountFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            account=account,
        )

    return command


def _currency_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        currency: CurrencyFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            currency=currency,
        )

    return command


def _plain_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        allow_errors: AllowErrorsOpt = False,
    ) -> None:
        _run(
            name,
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
    list_app.command(_name, help=f"List {_name} directives from a .bean file.")(_COMMANDS[_spec.filter](_name, _spec))


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
        raise UsageError("--flag must be one character, such as '!' or '*'.")
    _run(
        "transaction",
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
