"""`bea add <type>` — append beancount directives to a local ledger."""

from __future__ import annotations

import json
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, ledger_write, output
from cli.errors import LedgerError
from cli.utils import parse_date

add_app = typer.Typer(
    help="Add beancount directives to a local .bean file", no_args_is_help=True, rich_markup_mode=None
)

DateOpt = Annotated[str, typer.Option("--date", help="Date in YYYY-MM-DD format")]
TagOpt = Annotated[list[str] | None, typer.Option("--tag", help="Tag (repeat for multiple)")]
LinkOpt = Annotated[list[str] | None, typer.Option("--link", help="Link (repeat for multiple)")]
AllowErrorsOpt = Annotated[
    bool, typer.Option("--allow-errors", help="Allow semantic ledger errors; syntax must be valid")
]


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


def _append(build: Callable[[], Any], *, allow_errors: bool = False) -> None:
    """Resolve the target, build the directive, append it, and report — the same way for every type.

    `build` runs after the target is known so that a bad argument fails as a
    usage error before anything touches the ledger file. Which writer to call
    and what to call the directive both follow from its type, so no call site
    repeats either as a string that could drift from `cli.directives.writer`.
    """
    ctx = context.current()
    file = ctx.entry_file()
    from cli.directives import writer

    directive = build()
    name = type(directive).__name__.removesuffix("Directive")
    warnings = getattr(writer, f"write_{name.lower()}")(file, directive, allow_errors=allow_errors)
    if ctx.json_output:
        output.emit(
            {"written": 1, "directive": directive.model_dump(mode="json"), "warnings": warnings},
            target=output.file_target(file),
        )
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"{name} directive written to {file}")


@add_app.command("transaction")
def add_transaction(
    date: DateOpt,
    postings: Annotated[list[str], typer.Option("--posting", "-p", help="'Account NUMBER CURRENCY' (repeat)")],
    flag: Annotated[str, typer.Option("--flag", help="Transaction flag")] = "*",
    payee: Annotated[str | None, typer.Option("--payee", help="Payee")] = None,
    narration: Annotated[str | None, typer.Option("--narration", "-n", help="Narration")] = None,
    tag: TagOpt = None,
    link: LinkOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append a transaction directive.

    Each --posting is 'ACCOUNT NUMBER CURRENCY'. For investment cost lots and
    prices, use 'bea add transactions --from FILE.json'; see docs/USAGE.md.
    """

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

    _append(build, allow_errors=allow_errors)


@add_app.command("open")
def add_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append an open directive."""

    def build() -> Any:
        from cli.directives.models import OpenDirective

        return OpenDirective(date=parse_date(date), account=account, currencies=list(currency) if currency else [])

    _append(build, allow_errors=allow_errors)


@add_app.command("close")
def add_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append a close directive."""

    def build() -> Any:
        from cli.directives.models import CloseDirective

        return CloseDirective(date=parse_date(date), account=account)

    _append(build, allow_errors=allow_errors)


@add_app.command("balance")
def add_balance(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
    allow_errors: AllowErrorsOpt = False,
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

    _append(build, allow_errors=allow_errors)


@add_app.command("pad")
def add_pad(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account to pad")],
    source: Annotated[str, typer.Option("--source", "-s", help="Source account")],
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append a pad directive."""

    def build() -> Any:
        from cli.directives.models import PadDirective

        return PadDirective(date=parse_date(date), account=account, source_account=source)

    _append(build, allow_errors=allow_errors)


@add_app.command("note")
def add_note(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    comment: Annotated[str, typer.Option("--comment", "-m", help="Note text")],
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append a note directive."""

    def build() -> Any:
        from cli.directives.models import NoteDirective

        return NoteDirective(date=parse_date(date), account=account, comment=comment)

    _append(build, allow_errors=allow_errors)


@add_app.command("event")
def add_event(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Event type")],
    description: Annotated[str, typer.Option("--description", "-d", help="Event description")],
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append an event directive."""

    def build() -> Any:
        from cli.directives.models import EventDirective

        return EventDirective(date=parse_date(date), type=type, description=description)

    _append(build, allow_errors=allow_errors)


@add_app.command("price")
def add_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity being priced")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
    allow_errors: AllowErrorsOpt = False,
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

    _append(build, allow_errors=allow_errors)


@add_app.command("commodity")
def add_commodity(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "-c", help="Commodity symbol")],
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Append a commodity directive."""

    def build() -> Any:
        from cli.directives.models import CommodityDirective

        return CommodityDirective(date=parse_date(date), currency=currency)

    _append(build, allow_errors=allow_errors)


@add_app.command("document")
def add_document(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    filename: Annotated[str, typer.Option("--filename", help="Document file path")],
    tag: TagOpt = None,
    link: LinkOpt = None,
    allow_errors: AllowErrorsOpt = False,
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

    _append(build, allow_errors=allow_errors)


@add_app.command("custom")
def add_custom(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Custom directive type name")],
    value: Annotated[
        list[str] | None,
        typer.Option(
            "--value",
            "-v",
            help="'kind:VALUE': text|number|amount|account|bool|date. Amount: 'amount:NUMBER CURRENCY'",
        ),
    ] = None,
    allow_errors: AllowErrorsOpt = False,
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

    _append(build, allow_errors=allow_errors)


def _parse_custom_value(raw: str) -> Any:
    from cli.directives.models import (
        CustomDirectiveValueAccount,
        CustomDirectiveValueAmount,
        CustomDirectiveValueBoolean,
        CustomDirectiveValueDate,
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
    if kind == "bool" and rest.lower() in {"true", "false"}:
        return CustomDirectiveValueBoolean(kind="bool", value=rest.lower() == "true")
    if kind == "date":
        return CustomDirectiveValueDate(kind="date", value=parse_date(rest))
    raise typer.BadParameter(f"Invalid value kind or value {raw!r}. Use: text, number, amount, account, bool, date")


@add_app.command("transactions")
def add_transactions(
    from_file: Annotated[Path, typer.Option("--from", help="JSON file with a list of transactions")],
    partial: Annotated[
        bool, typer.Option("--partial", help="Append the valid rows even when some rows are rejected")
    ] = False,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Bulk-append transactions from a JSON file.

    Every row is validated before anything is written: a bad row leaves the
    ledger untouched, so a failed run can never be mistaken for a clean one.
    The exit status is nonzero whenever any row was rejected, `--partial` or not.
    """
    ctx = context.current()
    file = ctx.entry_file()
    from cli.directives.models import TransactionDirective
    from cli.directives.writer import format_transaction, write_transactions

    raw = json.loads(from_file.read_text())
    if not isinstance(raw, list):
        raise LedgerError("JSON file must contain an array of transactions.")

    valid: list[tuple[int, TransactionDirective]] = []
    rejected: list[str] = []
    rejected_rows: list[int] = []
    for index, item in enumerate(raw):
        try:
            valid.append((index, TransactionDirective.model_validate(item)))
        except Exception as e:
            rejected.append(f"row {index}: {e}")
            rejected_rows.append(index)

    if rejected and not partial:
        raise LedgerError(
            f"{len(rejected)} of {len(raw)} row(s) are invalid; nothing was written. "
            f"Fix them, or pass --partial to append the {len(valid)} valid row(s).",
            details=rejected,
            result={"written": 0, "written_rows": [], "rejected_rows": rejected_rows},
        )

    # Validate the entire batch first: an earlier sale may depend on a buy that
    # appears later in the input. Only partial recovery needs sequential trials.
    try:
        ledger_write.validate_append(file, [format_transaction(d) for _, d in valid], allow_errors=allow_errors)
    except LedgerError as batch_error:
        if not partial:
            batch_error.result = {"written": 0, "written_rows": [], "unwritten_rows": [index for index, _ in valid]}
            raise
        accepted: list[tuple[int, TransactionDirective]] = []
        texts: list[str] = []
        for index, directive in valid:
            try:
                text = format_transaction(directive)
                ledger_write.validate_append(file, [*texts, text], allow_errors=allow_errors)
            except LedgerError as err:
                rejected.append(f"row {index}: {'; '.join(err.details) or str(err)}")
                rejected_rows.append(index)
            else:
                accepted.append((index, directive))
                texts.append(text)
        valid = accepted

    warnings = write_transactions(file, [d for _, d in valid], allow_errors=allow_errors)

    if rejected:
        raise LedgerError(
            f"Appended {len(valid)} of {len(raw)} transaction(s); {len(rejected)} row(s) were rejected.",
            details=rejected,
            result={
                "written": len(valid),
                "written_rows": [index for index, _ in valid],
                "rejected_rows": rejected_rows,
            },
        )

    if ctx.json_output:
        data: dict[str, Any] = {"written": len(valid), "rejected": []}
        if warnings:
            data["warnings"] = warnings
        output.emit(data, target=output.file_target(file))
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Written {len(valid)} transaction(s) to {file}")
