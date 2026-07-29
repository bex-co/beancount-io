from __future__ import annotations

from datetime import date as Date
from typing import Annotated, Any

import typer

from cli import output
from cli.config import DEFAULT_ENTRY_FILE

read_app = typer.Typer(help="Read directives from local .bean files", no_args_is_help=True, rich_markup_mode=None)

LimitOpt = Annotated[int, typer.Option("--limit", "-l", help="Max results")]
FromDateOpt = Annotated[str | None, typer.Option("--from-date", help="Start date YYYY-MM-DD")]
ToDateOpt = Annotated[str | None, typer.Option("--to-date", help="End date YYYY-MM-DD")]
AccountFilterOpt = Annotated[str | None, typer.Option("--account", "-a", help="Filter by account (substring)")]
CurrencyFilterOpt = Annotated[str | None, typer.Option("--currency", "-c", help="Filter by currency")]


def _parse_date(date_str: str) -> Date:
    try:
        return Date.fromisoformat(date_str)
    except ValueError as err:
        raise typer.BadParameter(f"Invalid date '{date_str}'. Use YYYY-MM-DD format.") from err


def _parse_opt_date(date_str: str | None) -> Date | None:
    if date_str is None:
        return None
    return _parse_date(date_str)


def _table(headers: list[str], rows: list[list[str]]) -> None:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    sep = "  "
    typer.echo(sep.join(h.ljust(widths[i]) for i, h in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        typer.echo(sep.join(cell.ljust(widths[i]) for i, cell in enumerate(row)))


@read_app.command("transaction")
def read_transaction(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List transaction directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_transactions

        items = list_transactions(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No transactions found.")
            return
        rows = [
            [
                str(t.date),
                t.flag,
                t.payee or "",
                t.narration or "",
                str(len(t.postings)),
            ]
            for t in items
        ]
        _table(["DATE", "FLAG", "PAYEE", "NARRATION", "POSTINGS"], rows)
    except Exception as e:
        output.error(str(e))


@read_app.command("note")
def read_note(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List note directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_notes

        items = list_notes(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No notes found.")
            return
        _table(["DATE", "ACCOUNT", "COMMENT"], [[str(n.date), n.account, n.comment] for n in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("price")
def read_price(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    currency: CurrencyFilterOpt = None,
) -> None:
    """List price directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_prices

        items = list_prices(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            currency=currency,
            limit=limit,
        )
        if not items:
            typer.echo("No prices found.")
            return
        rows = [[str(p.date), p.currency, f"{p.amount.number} {p.amount.currency}"] for p in items]
        _table(["DATE", "CURRENCY", "AMOUNT"], rows)
    except Exception as e:
        output.error(str(e))


@read_app.command("balance")
def read_balance(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List balance assertion directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_balances

        items = list_balances(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No balance assertions found.")
            return
        rows = [[str(b.date), b.account, f"{b.amount.number} {b.amount.currency}"] for b in items]
        _table(["DATE", "ACCOUNT", "AMOUNT"], rows)
    except Exception as e:
        output.error(str(e))


@read_app.command("open")
def read_open(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List open directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_opens

        items = list_opens(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No open directives found.")
            return
        rows = [[str(o.date), o.account, ", ".join(o.currencies)] for o in items]
        _table(["DATE", "ACCOUNT", "CURRENCIES"], rows)
    except Exception as e:
        output.error(str(e))


@read_app.command("close")
def read_close(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List close directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_closes

        items = list_closes(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No close directives found.")
            return
        _table(["DATE", "ACCOUNT"], [[str(c.date), c.account] for c in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("commodity")
def read_commodity(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    currency: CurrencyFilterOpt = None,
) -> None:
    """List commodity directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_commodities

        items = list_commodities(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            currency=currency,
            limit=limit,
        )
        if not items:
            typer.echo("No commodity directives found.")
            return
        _table(["DATE", "CURRENCY"], [[str(c.date), c.currency] for c in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("event")
def read_event(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
) -> None:
    """List event directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_events

        items = list_events(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            limit=limit,
        )
        if not items:
            typer.echo("No events found.")
            return
        _table(["DATE", "TYPE", "DESCRIPTION"], [[str(e.date), e.type, e.description] for e in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("document")
def read_document(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List document directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_documents

        items = list_documents(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No documents found.")
            return
        _table(["DATE", "ACCOUNT", "FILENAME"], [[str(d.date), d.account, d.filename] for d in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("custom")
def read_custom(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
) -> None:
    """List custom directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_customs

        items = list_customs(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            limit=limit,
        )
        if not items:
            typer.echo("No custom directives found.")
            return

        def _fmt_values(c: Any) -> str:
            parts = []
            for v in c.values:
                if v.kind == "text":
                    parts.append(v.value)
                elif v.kind == "number":
                    parts.append(str(v.value))
                elif v.kind == "amount":
                    parts.append(f"{v.number} {v.currency}")
                elif v.kind == "account":
                    parts.append(v.value)
            return " ".join(parts)

        _table(["DATE", "TYPE", "VALUES"], [[str(c.date), c.type, _fmt_values(c)] for c in items])
    except Exception as e:
        output.error(str(e))


@read_app.command("pad")
def read_pad(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
) -> None:
    """List pad directives from a .bean file."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.reader import list_pads

        items = list_pads(
            file,
            from_date=_parse_opt_date(from_date),
            to_date=_parse_opt_date(to_date),
            account=account,
            limit=limit,
        )
        if not items:
            typer.echo("No pad directives found.")
            return
        _table(["DATE", "ACCOUNT", "SOURCE"], [[str(p.date), p.account, p.source_account] for p in items])
    except Exception as e:
        output.error(str(e))
