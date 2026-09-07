"""`bea add <type>` — append beancount directives to a local ledger."""

from __future__ import annotations

import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import LedgerError
from cli.utils import parse_date

add_app = typer.Typer(
    help="Add beancount directives to a local .bean file", no_args_is_help=True, rich_markup_mode=None
)

DateOpt = Annotated[str, typer.Option("--date", help="Date in YYYY-MM-DD format")]
TagOpt = Annotated[list[str] | None, typer.Option("--tag", help="Tag (repeat for multiple)")]
LinkOpt = Annotated[list[str] | None, typer.Option("--link", help="Link (repeat for multiple)")]


def _parse_amount(amount_str: str) -> tuple[Decimal, str]:
    """Parse 'NUMBER CURRENCY' → (number, currency)."""
    parts = amount_str.strip().split()
    if len(parts) != 2:
        raise typer.BadParameter(f"Amount must be 'NUMBER CURRENCY', got: {amount_str!r}")
    return _parse_number(parts[0]), parts[1]


def _parse_number(text: str) -> Decimal:
    try:
        return Decimal(text)
    except InvalidOperation as err:
        raise typer.BadParameter(f"Not a number: {text!r}") from err


def _parse_posting(posting_str: str) -> Any:
    """Parse 'Account NUMBER CURRENCY' → Posting model."""
    from cli.directives.models import Amount, Posting

    parts = posting_str.strip().split()
    if len(parts) != 3:
        raise typer.BadParameter(f"Posting must be 'ACCOUNT NUMBER CURRENCY', got: {posting_str!r}")
    return Posting(account=parts[0], units=Amount(number=_parse_number(parts[1]), currency=parts[2]))


def _append(writer_name: str, build: Any, label: str) -> None:
    """Resolve the target, build the directive, append it, and report — the same way for every type.

    `build` runs after the target is known so a bad argument fails as a usage
    error before anything touches the ledger file.
    """
    ctx = context.current()
    try:
        file = ctx.entry_file()
        from cli.directives import writer

        directive = build()
        getattr(writer, writer_name)(file, directive)
        if ctx.json_output:
            output.emit(
                {"written": 1, "directive": directive.model_dump(mode="json")},
                target=output.file_target(file),
            )
        else:
            output.success(f"{label} written to {file}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@add_app.command("transaction")
def add_transaction(
    date: DateOpt,
    postings: Annotated[list[str], typer.Option("--posting", "-p", help="'Account NUMBER CURRENCY' (repeat)")],
    flag: Annotated[str, typer.Option("--flag", help="Transaction flag")] = "*",
    payee: Annotated[str | None, typer.Option("--payee", help="Payee")] = None,
    narration: Annotated[str | None, typer.Option("--narration", "-n", help="Narration")] = None,
    tag: TagOpt = None,
    link: LinkOpt = None,
) -> None:
    """Append a transaction directive."""

    def build() -> Any:
        from cli.directives.models import TransactionDirective

        return TransactionDirective(
            date=parse_date(date),
            flag=flag,
            payee=payee,
            narration=narration,
            postings=[_parse_posting(p) for p in postings],
            tags=list(tag) if tag else [],
            links=list(link) if link else [],
        )

    _append("write_transaction", build, "Transaction")


@add_app.command("open")
def add_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
) -> None:
    """Append an open directive."""

    def build() -> Any:
        from cli.directives.models import OpenDirective

        return OpenDirective(date=parse_date(date), account=account, currencies=list(currency) if currency else [])

    _append("write_open", build, "Open directive")


@add_app.command("close")
def add_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
) -> None:
    """Append a close directive."""

    def build() -> Any:
        from cli.directives.models import CloseDirective

        return CloseDirective(date=parse_date(date), account=account)

    _append("write_close", build, "Close directive")


@add_app.command("balance")
def add_balance(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
) -> None:
    """Append a balance assertion directive."""

    def build() -> Any:
        from cli.directives.models import Amount, BalanceDirective

        number, currency = _parse_amount(amount)
        return BalanceDirective(
            date=parse_date(date),
            account=account,
            amount=Amount(number=number, currency=currency),
        )

    _append("write_balance", build, "Balance directive")


@add_app.command("pad")
def add_pad(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account to pad")],
    source: Annotated[str, typer.Option("--source", "-s", help="Source account")],
) -> None:
    """Append a pad directive."""

    def build() -> Any:
        from cli.directives.models import PadDirective

        return PadDirective(date=parse_date(date), account=account, source_account=source)

    _append("write_pad", build, "Pad directive")


@add_app.command("note")
def add_note(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    comment: Annotated[str, typer.Option("--comment", "-m", help="Note text")],
) -> None:
    """Append a note directive."""

    def build() -> Any:
        from cli.directives.models import NoteDirective

        return NoteDirective(date=parse_date(date), account=account, comment=comment)

    _append("write_note", build, "Note directive")


@add_app.command("event")
def add_event(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Event type")],
    description: Annotated[str, typer.Option("--description", "-d", help="Event description")],
) -> None:
    """Append an event directive."""

    def build() -> Any:
        from cli.directives.models import EventDirective

        return EventDirective(date=parse_date(date), type=type, description=description)

    _append("write_event", build, "Event directive")


@add_app.command("price")
def add_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity being priced")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
) -> None:
    """Append a price directive."""

    def build() -> Any:
        from cli.directives.models import Amount, PriceDirective

        number, price_currency = _parse_amount(amount)
        return PriceDirective(
            date=parse_date(date),
            currency=currency,
            amount=Amount(number=number, currency=price_currency),
        )

    _append("write_price", build, "Price directive")


@add_app.command("commodity")
def add_commodity(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity symbol")],
) -> None:
    """Append a commodity directive."""

    def build() -> Any:
        from cli.directives.models import CommodityDirective

        return CommodityDirective(date=parse_date(date), currency=currency)

    _append("write_commodity", build, "Commodity directive")


@add_app.command("document")
def add_document(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    filename: Annotated[str, typer.Option("--filename", help="Document file path")],
    tag: TagOpt = None,
    link: LinkOpt = None,
) -> None:
    """Append a document directive."""

    def build() -> Any:
        from cli.directives.models import DocumentDirective

        return DocumentDirective(
            date=parse_date(date),
            account=account,
            filename=filename,
            tags=list(tag) if tag else [],
            links=list(link) if link else [],
        )

    _append("write_document", build, "Document directive")


@add_app.command("custom")
def add_custom(
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

    def build() -> Any:
        from cli.directives.models import CustomDirective

        return CustomDirective(date=parse_date(date), type=type, values=[_parse_custom_value(v) for v in value or []])

    _append("write_custom", build, "Custom directive")


def _parse_custom_value(raw: str) -> Any:
    from cli.directives.models import (
        CustomDirectiveValueAccount,
        CustomDirectiveValueAmount,
        CustomDirectiveValueNumber,
        CustomDirectiveValueText,
    )

    if ":" not in raw:
        raise typer.BadParameter(f"Value must be 'kind:VALUE', got: {raw!r}")
    kind, rest = raw.split(":", 1)
    if kind == "text":
        return CustomDirectiveValueText(kind="text", value=rest)
    if kind == "number":
        return CustomDirectiveValueNumber(kind="number", value=_parse_number(rest))
    if kind == "amount":
        number, currency = _parse_amount(rest)
        return CustomDirectiveValueAmount(kind="amount", number=number, currency=currency)
    if kind == "account":
        return CustomDirectiveValueAccount(kind="account", value=rest)
    raise typer.BadParameter(f"Unknown value kind '{kind}'. Use: text, number, amount, account")


@add_app.command("transactions")
def add_transactions(
    from_file: Annotated[Path, typer.Option("--from", help="JSON file with a list of transactions")],
    partial: Annotated[
        bool, typer.Option("--partial", help="Append the valid rows even when some rows are rejected")
    ] = False,
) -> None:
    """Bulk-append transactions from a JSON file.

    Every row is validated before anything is written: a bad row leaves the
    ledger untouched, so a failed run can never be mistaken for a clean one.
    The exit status is nonzero whenever any row was rejected, `--partial` or not.
    """
    ctx = context.current()
    try:
        file = ctx.entry_file()
        from cli.directives.models import TransactionDirective
        from cli.directives.writer import write_transaction

        raw = json.loads(from_file.read_text())
        if not isinstance(raw, list):
            raise LedgerError("JSON file must contain an array of transactions.")

        valid: list[TransactionDirective] = []
        rejected: list[str] = []
        for index, item in enumerate(raw):
            try:
                valid.append(TransactionDirective.model_validate(item))
            except Exception as e:
                rejected.append(f"row {index}: {e}")

        if rejected and not partial:
            raise LedgerError(
                f"{len(rejected)} of {len(raw)} row(s) are invalid; nothing was written. "
                f"Fix them, or pass --partial to append the {len(valid)} valid row(s).",
                details=rejected,
            )

        for directive in valid:
            write_transaction(file, directive)

        if rejected:
            raise LedgerError(
                f"Appended {len(valid)} of {len(raw)} transaction(s); {len(rejected)} row(s) were rejected.",
                details=rejected,
            )

        if ctx.json_output:
            output.emit({"written": len(valid), "rejected": []}, target=output.file_target(file))
        else:
            output.success(f"Written {len(valid)} transaction(s) to {file}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
