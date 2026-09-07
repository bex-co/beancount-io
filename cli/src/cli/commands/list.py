"""`bea list <type>` — read directives out of a local ledger.

The eleven directive types differ only in which reader they call, how a row is
formatted, and which filter they accept, so they are declared as data and
registered from three shared command shapes. Loading, error handling, limit
truncation, and the JSON envelope are then written once.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any

import typer

from cli import context, output
from cli.utils import parse_opt_date

list_app = typer.Typer(help="List directives from a local .bean file", no_args_is_help=True, rich_markup_mode=None)

LimitOpt = Annotated[int, typer.Option("--limit", "-l", help="Max results")]
FromDateOpt = Annotated[str | None, typer.Option("--from-date", help="Start date YYYY-MM-DD")]
ToDateOpt = Annotated[str | None, typer.Option("--to-date", help="End date YYYY-MM-DD")]
AccountFilterOpt = Annotated[str | None, typer.Option("--account", "-a", help="Filter by account (substring)")]
CurrencyFilterOpt = Annotated[str | None, typer.Option("--currency", "-c", help="Filter by currency")]
AllowErrorsOpt = Annotated[bool, typer.Option("--allow-errors", help="Report data even if the ledger has errors")]


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


def _run(spec: _Spec, limit: int, allow_errors: bool, **filters: Any) -> None:
    """Load the ledger, list one directive type, and render it for the active mode."""
    ctx = context.current()
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
    list_app.command(_name, help=f"List {_name} directives from a .bean file.")(_COMMANDS[_spec.filter](_spec))
