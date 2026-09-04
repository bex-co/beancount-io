from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import output
from cli.config import DEFAULT_ENTRY_FILE
from cli.utils import parse_date

write_app = typer.Typer(
    help="Write beancount directives to local .bean files", no_args_is_help=True, rich_markup_mode=None
)

DateOpt = Annotated[str, typer.Option("--date", help="Date in YYYY-MM-DD format")]


def _parse_amount(amount_str: str) -> tuple[str, str]:
    """Parse 'number CURRENCY' → (number, currency)."""
    parts = amount_str.strip().split()
    if len(parts) != 2:
        raise typer.BadParameter(f"Amount must be 'NUMBER CURRENCY', got: {amount_str!r}")
    return parts[0], parts[1]


def _parse_posting(posting_str: str) -> Any:
    """Parse 'Account NUMBER CURRENCY' → Posting model."""
    from decimal import Decimal

    from cli.directives.models import Amount, Posting

    parts = posting_str.strip().split()
    if len(parts) != 3:
        raise typer.BadParameter(f"Posting must be 'ACCOUNT NUMBER CURRENCY', got: {posting_str!r}")
    return Posting(account=parts[0], units=Amount(number=Decimal(parts[1]), currency=parts[2]))


@write_app.command("transaction")
def write_transaction(
    date: DateOpt,
    postings: Annotated[list[str], typer.Option("--posting", "-p", help="'Account NUMBER CURRENCY' (repeat)")],
    flag: Annotated[str, typer.Option("--flag", help="Transaction flag")] = "*",
    payee: Annotated[str | None, typer.Option("--payee", help="Payee")] = None,
    narration: Annotated[str | None, typer.Option("--narration", "-n", help="Narration")] = None,
    tag: Annotated[list[str] | None, typer.Option("--tag", help="Tag (repeat for multiple)")] = None,
    link: Annotated[list[str] | None, typer.Option("--link", help="Link (repeat for multiple)")] = None,
) -> None:
    """Append a transaction directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import TransactionDirective
        from cli.directives.writer import write_transaction as do_write

        parsed = [_parse_posting(p) for p in postings]
        do_write(
            file,
            TransactionDirective(
                date=parse_date(date),
                flag=flag,
                payee=payee,
                narration=narration,
                postings=parsed,
                tags=list(tag) if tag else [],
                links=list(link) if link else [],
            ),
        )
        output.success(f"Transaction written to {file}")
    except SystemExit:
        raise
    except Exception as e:
        output.error(str(e))


@write_app.command("open")
def write_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
) -> None:
    """Append an open directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import OpenDirective
        from cli.directives.writer import write_open as do_write

        currencies = list(currency) if currency else []
        do_write(file, OpenDirective(date=parse_date(date), account=account, currencies=currencies))
        output.success(f"Open directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("close")
def write_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
) -> None:
    """Append a close directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import CloseDirective
        from cli.directives.writer import write_close as do_write

        do_write(file, CloseDirective(date=parse_date(date), account=account))
        output.success(f"Close directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("balance")
def write_balance(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
) -> None:
    """Append a balance assertion directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from decimal import Decimal

        from cli.directives.models import Amount, BalanceDirective
        from cli.directives.writer import write_balance as do_write

        number, currency = _parse_amount(amount)
        do_write(
            file,
            BalanceDirective(
                date=parse_date(date),
                account=account,
                amount=Amount(number=Decimal(number), currency=currency),
            ),
        )
        output.success(f"Balance directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("pad")
def write_pad(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account to pad")],
    source: Annotated[str, typer.Option("--source", "-s", help="Source account")],
) -> None:
    """Append a pad directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import PadDirective
        from cli.directives.writer import write_pad as do_write

        do_write(file, PadDirective(date=parse_date(date), account=account, source_account=source))
        output.success(f"Pad directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("note")
def write_note(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    comment: Annotated[str, typer.Option("--comment", "-m", help="Note text")],
) -> None:
    """Append a note directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import NoteDirective
        from cli.directives.writer import write_note as do_write

        do_write(file, NoteDirective(date=parse_date(date), account=account, comment=comment))
        output.success(f"Note directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("event")
def write_event(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Event type")],
    description: Annotated[str, typer.Option("--description", "-d", help="Event description")],
) -> None:
    """Append an event directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import EventDirective
        from cli.directives.writer import write_event as do_write

        do_write(file, EventDirective(date=parse_date(date), type=type, description=description))
        output.success(f"Event directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("price")
def write_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity being priced")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
) -> None:
    """Append a price directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from decimal import Decimal

        from cli.directives.models import Amount, PriceDirective
        from cli.directives.writer import write_price as do_write

        number, price_currency = _parse_amount(amount)
        do_write(
            file,
            PriceDirective(
                date=parse_date(date),
                currency=currency,
                amount=Amount(number=Decimal(number), currency=price_currency),
            ),
        )
        output.success(f"Price directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("commodity")
def write_commodity(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity symbol")],
) -> None:
    """Append a commodity directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import CommodityDirective
        from cli.directives.writer import write_commodity as do_write

        do_write(file, CommodityDirective(date=parse_date(date), currency=currency))
        output.success(f"Commodity directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("document")
def write_document(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    filename: Annotated[str, typer.Option("--filename", help="Document file path")],
    tag: Annotated[list[str] | None, typer.Option("--tag", help="Tag (repeat for multiple)")] = None,
    link: Annotated[list[str] | None, typer.Option("--link", help="Link (repeat for multiple)")] = None,
) -> None:
    """Append a document directive."""
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import DocumentDirective
        from cli.directives.writer import write_document as do_write

        do_write(
            file,
            DocumentDirective(
                date=parse_date(date),
                account=account,
                filename=filename,
                tags=list(tag) if tag else [],
                links=list(link) if link else [],
            ),
        )
        output.success(f"Document directive written to {file}")
    except Exception as e:
        output.error(str(e))


@write_app.command("custom")
def write_custom(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Custom directive type name")],
    value: Annotated[
        list[str] | None,
        typer.Option(
            "--value",
            "-v",
            help="'kind:VALUE' where kind is text|number|amount|account. amount format: 'amount:NUMBER CURRENCY'",
        ),
    ] = None,
) -> None:
    """Append a custom directive.

    Examples:
      --value 'text:hello'
      --value 'number:1000'
      --value 'amount:500 USD'
      --value 'account:Assets:Cash'
    """
    file = DEFAULT_ENTRY_FILE
    try:
        from decimal import Decimal

        from cli.directives.models import (
            CustomDirective,
            CustomDirectiveValueAccount,
            CustomDirectiveValueAmount,
            CustomDirectiveValueNumber,
            CustomDirectiveValueText,
        )
        from cli.directives.writer import write_custom as do_write

        parsed_values: list[Any] = []
        for v in value or []:
            if ":" not in v:
                raise ValueError(f"Value must be 'kind:VALUE', got: {v!r}")
            kind, rest = v.split(":", 1)
            if kind == "text":
                parsed_values.append(CustomDirectiveValueText(kind="text", value=rest))
            elif kind == "number":
                parsed_values.append(CustomDirectiveValueNumber(kind="number", value=Decimal(rest)))
            elif kind == "amount":
                num, cur = _parse_amount(rest)
                parsed_values.append(CustomDirectiveValueAmount(kind="amount", number=Decimal(num), currency=cur))
            elif kind == "account":
                parsed_values.append(CustomDirectiveValueAccount(kind="account", value=rest))
            else:
                raise ValueError(f"Unknown value kind '{kind}'. Use: text, number, amount, account")

        do_write(file, CustomDirective(date=parse_date(date), type=type, values=parsed_values))
        output.success(f"Custom directive written to {file}")
    except SystemExit:
        raise
    except Exception as e:
        output.error(str(e))


@write_app.command("transactions")
def write_transactions(
    from_file: Annotated[Path, typer.Option("--from", help="JSON file with list of transactions")],
) -> None:
    """Bulk-append transactions from a JSON file.

    The JSON file must be an array of transaction objects matching the TransactionDirective schema.
    """
    file = DEFAULT_ENTRY_FILE
    try:
        from cli.directives.models import TransactionDirective
        from cli.directives.writer import write_transaction as do_write

        raw = json.loads(from_file.read_text())
        if not isinstance(raw, list):
            raise ValueError("JSON file must contain an array of transactions")

        count = 0
        errors = []
        for i, item in enumerate(raw):
            try:
                txn = TransactionDirective.model_validate(item)
                do_write(file, txn)
                count += 1
            except Exception as e:
                errors.append({"index": i, "error": str(e)})

        suffix = f" ({len(errors)} failed)" if errors else ""
        output.success(f"Written {count} transaction(s) to {file}{suffix}")
        if errors:
            for err in errors:
                typer.echo(f"  Error at index {err['index']}: {err['error']}", file=sys.stderr)
    except SystemExit:
        raise
    except Exception as e:
        output.error(str(e))
