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
    """One directive type: where to read it, how to show it, what to say when empty."""

    reader: str
    headers: list[str]
    row: Callable[[Any], list[str]]
    empty: str


def _format_custom_values(custom: Any) -> str:
    parts = []
    for value in custom.values:
        if value.kind == "amount":
            parts.append(f"{value.number} {value.currency}")
        else:
            parts.append(str(value.value))
    return " ".join(parts)


ACCOUNT_SPECS: dict[str, _Spec] = {
    "transaction": _Spec(
        reader="list_transactions",
        headers=["DATE", "FLAG", "PAYEE", "NARRATION", "POSTINGS"],
        row=lambda t: [str(t.date), t.flag, t.payee or "", t.narration or "", str(len(t.postings))],
        empty="No transactions found.",
    ),
    "note": _Spec(
        reader="list_notes",
        headers=["DATE", "ACCOUNT", "COMMENT"],
        row=lambda n: [str(n.date), n.account, n.comment],
        empty="No notes found.",
    ),
    "balance": _Spec(
        reader="list_balances",
        headers=["DATE", "ACCOUNT", "AMOUNT"],
        row=lambda b: [str(b.date), b.account, f"{b.amount.number} {b.amount.currency}"],
        empty="No balance assertions found.",
    ),
    "open": _Spec(
        reader="list_opens",
        headers=["DATE", "ACCOUNT", "CURRENCIES"],
        row=lambda o: [str(o.date), o.account, ", ".join(o.currencies)],
        empty="No open directives found.",
    ),
    "close": _Spec(
        reader="list_closes",
        headers=["DATE", "ACCOUNT"],
        row=lambda c: [str(c.date), c.account],
        empty="No close directives found.",
    ),
    "document": _Spec(
        reader="list_documents",
        headers=["DATE", "ACCOUNT", "FILENAME"],
        row=lambda d: [str(d.date), d.account, d.filename],
        empty="No documents found.",
    ),
    "pad": _Spec(
        reader="list_pads",
        headers=["DATE", "ACCOUNT", "SOURCE"],
        row=lambda p: [str(p.date), p.account, p.source_account],
        empty="No pad directives found.",
    ),
}

CURRENCY_SPECS: dict[str, _Spec] = {
    "price": _Spec(
        reader="list_prices",
        headers=["DATE", "CURRENCY", "AMOUNT"],
        row=lambda p: [str(p.date), p.currency, f"{p.amount.number} {p.amount.currency}"],
        empty="No prices found.",
    ),
    "commodity": _Spec(
        reader="list_commodities",
        headers=["DATE", "CURRENCY"],
        row=lambda c: [str(c.date), c.currency],
        empty="No commodity directives found.",
    ),
}

PLAIN_SPECS: dict[str, _Spec] = {
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

DIRECTIVE_TYPES = sorted({*ACCOUNT_SPECS, *CURRENCY_SPECS, *PLAIN_SPECS})


def _run(spec: _Spec, limit: int, allow_errors: bool, **filters: Any) -> None:
    """Load the ledger, list one directive type, and render it for the active mode."""
    ctx = context.current()
    try:
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
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


def _register_account(name: str, spec: _Spec) -> None:
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

    list_app.command(name, help=f"List {name} directives from a .bean file.")(command)


def _register_currency(name: str, spec: _Spec) -> None:
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

    list_app.command(name, help=f"List {name} directives from a .bean file.")(command)


def _register_plain(name: str, spec: _Spec) -> None:
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

    list_app.command(name, help=f"List {name} directives from a .bean file.")(command)


for _name, _spec in ACCOUNT_SPECS.items():
    _register_account(_name, _spec)
for _name, _spec in CURRENCY_SPECS.items():
    _register_currency(_name, _spec)
for _name, _spec in PLAIN_SPECS.items():
    _register_plain(_name, _spec)


__all__ = ["DIRECTIVE_TYPES", "list_app"]
