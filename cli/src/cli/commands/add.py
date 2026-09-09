"""`bea add <type>` — append beancount directives to a local ledger."""

from __future__ import annotations

import datetime
import json
import re
import sys
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, ledger_write, output
from cli.errors import LedgerError, UsageError
from cli.utils import parse_account, parse_date, single_line

add_app = typer.Typer(
    help="Add beancount directives to a local .bean file", no_args_is_help=True, rich_markup_mode=None
)

IntoOpt = Annotated[Path | None, typer.Option("--into", help="Write to an included file, relative to the root ledger")]
DateOpt = Annotated[str, typer.Option("--date", help="Date in YYYY-MM-DD format")]
TagOpt = Annotated[list[str] | None, typer.Option("--tag", help="Tag (repeat for multiple)")]
LinkOpt = Annotated[list[str] | None, typer.Option("--link", help="Link (repeat for multiple)")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors", help="Allow semantic ledger errors; syntax and pad account references must be valid"
    ),
]


def _parse_amount(amount_str: str) -> tuple[Decimal, str]:
    """Parse 'NUMBER CURRENCY' → (number, currency)."""
    parts = amount_str.strip().split()
    if len(parts) != 2:
        raise typer.BadParameter(f"Amount must be 'NUMBER CURRENCY', got: {amount_str!r}")
    return _parse_number(parts[0]), parts[1]


def _parse_number(text: str) -> Decimal:
    _check_decimal_notation(text)
    try:
        number = Decimal(text)
    except InvalidOperation as err:
        raise typer.BadParameter(f"Not a number: {text!r}") from err
    if not number.is_finite():
        raise UsageError("Amounts must be finite numbers, such as 1538.25.")
    return number


def _check_decimal_notation(text: str) -> None:
    # A cost label or comment may contain an exponent-looking string. Only
    # reject numeric tokens, leaving native arithmetic and quoted text alone.
    unquoted = re.sub(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*', "", text)
    match = re.search(r"(?<![\w.:#^'\-])[-+]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+(?![\w.])", unquoted)
    if match:
        raise UsageError(
            f"Scientific notation {match[0]!r} is not supported in Beancount amounts. "
            "Use decimal notation, such as '1000' instead of '1e3'."
        )


def _parse_metadata(items: list[str]) -> dict[str, Any]:
    from beancount.core.data import Transaction
    from beancount.parser import parser

    metadata: dict[str, Any] = {}
    for item in items:
        key, separator, raw = item.partition(":")
        key, raw = key.strip(), single_line(raw).strip()
        if not separator or not re.fullmatch(r"[a-z][A-Za-z0-9_-]*", key) or key in {"filename", "lineno"} or not raw:
            raise UsageError(
                "Each --meta must be 'key:value', such as 'receipt:IMG_1234.jpg'; use '\"\"' for empty text."
            )
        if key in metadata:
            raise UsageError(f"Metadata key {key!r} was supplied more than once; use one --meta per key.")
        entries, errors, _ = parser.parse_string(f'2000-01-01 * ""\n  {key}: {raw}\n')
        if not errors and len(entries) == 1 and isinstance(entries[0], Transaction) and key in entries[0].meta:
            metadata[key] = entries[0].meta[key]
        elif raw.startswith('"'):
            raise UsageError(
                f"Invalid --meta {key!r}; close the quoted string or supply a bare value such as '{key}:hello'.",
                details=[str(error.message) for error in errors],
            )
        else:
            metadata[key] = raw
    return metadata


def _parse_balance_amount(text: str) -> tuple[Decimal, str, Decimal | None]:
    from beancount.core.data import Balance
    from beancount.parser import parser

    if "\n" in text or "\r" in text:
        raise UsageError("Balance amount must be one line: 'NUMBER [~ TOLERANCE] CURRENCY'.")
    _check_decimal_notation(text)
    entries, errors, _ = parser.parse_string(f"2000-01-01 balance Assets:Balance {text}\n")
    if errors or len(entries) != 1 or not isinstance(entries[0], Balance):
        raise UsageError(
            "Balance amount must be 'NUMBER [~ TOLERANCE] CURRENCY', for example '1538 ~ 1 EUR'.",
            details=[f"--amount: {error.message}" for error in errors],
        )
    entry = entries[0]
    if entry.amount.number is None:
        raise UsageError("Supply a balance number, for example '1538 ~ 1 EUR'.")
    if entry.tolerance is not None and entry.tolerance < 0:
        raise UsageError("Balance tolerance must be nonnegative.")
    return entry.amount.number, entry.amount.currency, entry.tolerance


def _append(build: Callable[[], Any], *, allow_errors: bool = False, into: Path | None = None) -> None:
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
    warnings = getattr(writer, f"write_{name.lower()}")(file, directive, allow_errors=allow_errors, into=into)
    if ctx.json_output:
        output.emit(
            {"written": 1, "directive": directive.model_dump(mode="json"), "warnings": warnings},
            target={**output.file_target(file), "into": str(ledger_write.destination(file, into))},
        )
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Added 1 {name.lower()} to {ledger_write.destination(file, into)}.")


@add_app.command("transaction")
def add_transaction(
    postings: Annotated[
        list[str],
        typer.Option("--posting", "-p", help="Beancount posting, e.g. 'Account 30 USD' or 'Account' (repeat)"),
    ],
    narration_arg: Annotated[str | None, typer.Argument(help="Narration; --narration means the same")] = None,
    date: Annotated[str | None, typer.Option("--date", help="Transaction date YYYY-MM-DD; defaults to today")] = None,
    flag: Annotated[str, typer.Option("--flag", help="Transaction flag")] = "*",
    payee: Annotated[str | None, typer.Option("--payee", help="Payee")] = None,
    narration: Annotated[
        str | None, typer.Option("--narration", "-n", help="Optional narration; defaults to empty text")
    ] = None,
    tag: TagOpt = None,
    link: LinkOpt = None,
    meta: Annotated[
        list[str] | None, typer.Option("--meta", help="'key:value' metadata; bare text or native typed values (repeat)")
    ] = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a transaction directive.

    Supports an omitted balancing amount, inferred currency, cost lots ({...}),
    and prices (@ or @@). Quote each posting. Examples:

      "Groceries" -p 'Expenses:Groceries 30' -p 'Assets:Checking'

      -p 'Assets:Stock 2 AAPL {100 USD}' -p 'Assets:Checking -200 USD'
    """
    if narration_arg is not None and narration is not None and narration_arg != narration:
        raise UsageError(
            f"Conflicting narrations: positional {narration_arg!r} and --narration {narration!r}. Pass one of them."
        )
    narration = narration_arg if narration_arg is not None else narration

    from beancount import loader
    from beancount.core.data import Open, Transaction
    from beancount.core.number import MISSING
    from beancount.parser import parser
    from beancount.parser.grammar import ParserError

    from cli.directives.models import TransactionDirective
    from cli.directives.writer import format_entry, format_transaction

    file = context.current().entry_file()
    if any("\n" in p or "\r" in p for p in postings):
        raise UsageError("Each --posting must be one line; repeat -p for another posting.")
    for posting_text in postings:
        parts = posting_text.split()
        # Native posting flags are single characters; accounts never are.
        if parts and len(parts[0]) == 1:
            parts = parts[1:]
        parse_account(parts[0] if parts else "")
        _check_decimal_notation(posting_text)
    header = TransactionDirective(
        date=parse_date(date) if date else datetime.date.today(),
        flag=flag,
        payee=payee,
        narration=narration,
        postings=[],
        tags=list(tag or []),
        links=list(link or []),
        meta=_parse_metadata(meta or []),
    )
    header_text = format_transaction(header)
    text = header_text + "".join(f"  {item.strip()}\n" for item in postings)
    entries, errors, _ = parser.parse_string(text)
    # Root names are ledger options. The full candidate validation below
    # checks them in that context; this standalone parse only checks syntax.
    errors = [e for e in errors if not (isinstance(e, ParserError) and e.message.startswith("Invalid account name:"))]
    if errors or len(entries) != 1 or not isinstance(entries[0], Transaction):
        details = []
        for error in errors:
            posting_number = error.source.get("lineno", 0) - len(header_text.splitlines())
            location = f"--posting {posting_number}" if 0 < posting_number <= len(postings) else "Transaction options"
            details.append(f"{location}: {error.message}")
        raise UsageError(
            "Invalid transaction options; use postings such as 'Assets:Checking -30 USD'. Nothing was written.",
            details=details,
        )
    entry = entries[0]
    snapshot = None
    currencies: list[str] = []
    allowed: dict[str, list[str] | None] = {}
    raw_postings: Any = entry.postings
    if any(p.units is not MISSING and p.units.currency is MISSING for p in raw_postings):
        snapshot = ledger_write.LedgerSnapshot.capture(file)
        existing, _, options = loader.load_file(file)
        currencies = options["operating_currency"]
        allowed = {e.account: e.currencies for e in existing if isinstance(e, Open)}
    normalized = []
    elided = 0
    for posting in entry.postings:
        # Beancount annotates booked postings; the parser also returns MISSING.
        units: Any = posting.units
        if units is MISSING or units.number is MISSING:
            elided += 1
        if units is not MISSING and units.currency is MISSING:
            choices = allowed.get(posting.account) or []
            if len(choices) != 1 and len(currencies) == 1 and (not choices or currencies[0] in choices):
                choices = currencies
            if len(choices) != 1:
                raise UsageError(
                    f"Currency is ambiguous for {posting.account}; specify NUMBER CURRENCY explicitly.",
                    details=ledger_write.root_ledger_hints(file),
                )
            units = units._replace(currency=choices[0])
        normalized.append(posting._replace(units=units, meta={}))
    if elided > 1:
        raise UsageError("Only one posting may omit its amount; supply amounts for the other postings.")
    entry = entry._replace(postings=normalized, meta=ledger_write.metadata_for_write(entry.meta))
    text = format_entry(entry)
    warnings = ledger_write.append(file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot)
    target = ledger_write.destination(file, into)
    if context.current().json_output:
        from cli.directives.reader import metadata_to_json

        output.emit(
            {
                "written": 1,
                "directive": entry._replace(meta=metadata_to_json(entry.meta)),
                "entry": text,
                "warnings": warnings,
            },
            target={**output.file_target(file), "into": str(target)},
        )
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Added 1 transaction to {target}.")


@add_app.command("open")
def add_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append an open directive."""

    def build() -> Any:
        from cli.directives.models import OpenDirective

        return OpenDirective(
            date=parse_date(date), account=parse_account(account), currencies=list(currency) if currency else []
        )

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("close")
def add_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a close directive."""

    def build() -> Any:
        from cli.directives.models import CloseDirective

        return CloseDirective(date=parse_date(date), account=parse_account(account))

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("balance")
def add_balance(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER [~ TOLERANCE] CURRENCY'")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
    pad_from: Annotated[
        str | None,
        typer.Option("--pad-from", help="Explicitly add a pad and this balance assertion together; source account"),
    ] = None,
    pad_date: Annotated[
        str | None, typer.Option("--pad-date", help="Pad date; defaults to the day before the balance assertion")
    ] = None,
) -> None:
    """Append a strict balance assertion, or explicitly pad from another account.

    --pad-from writes both directives atomically. It creates an adjustment;
    review missing transactions before using it to reconcile a discrepancy.
    """

    if pad_date is not None and pad_from is None:
        raise UsageError("--pad-date requires --pad-from.")
    if pad_from is not None:
        from beancount.core.amount import Amount as BcAmount
        from beancount.core.data import Balance, Pad

        from cli.directives.writer import format_entry

        file = context.current().entry_file()
        day = parse_date(date)
        if day == datetime.date.min and pad_date is None:
            raise UsageError("The balance date must allow an earlier pad date.")
        padded = parse_date(pad_date) if pad_date else day - datetime.timedelta(days=1)
        if padded >= day:
            raise UsageError(
                "--pad-date must be earlier than the balance date (assertions run at the start of the day)."
            )
        number, currency, tolerance = _parse_balance_amount(amount)
        entries = [
            Pad({}, padded, parse_account(account), parse_account(pad_from)),
            Balance({}, day, parse_account(account), BcAmount(number, currency), tolerance, None),
        ]
        warnings = ledger_write.append(file, [format_entry(e) for e in entries], allow_errors=allow_errors, into=into)
        target = ledger_write.destination(file, into)
        if context.current().json_output:
            output.emit(
                {"written": 2, "directives": entries, "warnings": warnings},
                target={**output.file_target(file), "into": str(target)},
            )
        else:
            for warning in warnings:
                output.note(warning)
            output.success(f"Added 1 pad and 1 balance to {target}.")
        return

    def build() -> Any:
        from cli.directives.models import Amount, BalanceDirective

        number, currency, tolerance = _parse_balance_amount(amount)
        return BalanceDirective(
            date=parse_date(date),
            account=parse_account(account),
            amount=Amount(number=number, currency=currency),
            tolerance=tolerance,
        )

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("pad")
def add_pad(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account to pad")],
    source: Annotated[str, typer.Option("--source", "-s", help="Source account")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a pad directive."""

    def build() -> Any:
        from cli.directives.models import PadDirective

        return PadDirective(date=parse_date(date), account=parse_account(account), source_account=parse_account(source))

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("note")
def add_note(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    comment: Annotated[str, typer.Option("--comment", "--message", "-m", help="Note text")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a note directive."""

    def build() -> Any:
        from cli.directives.models import NoteDirective

        return NoteDirective(date=parse_date(date), account=parse_account(account), comment=comment)

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("event")
def add_event(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Event type")],
    description: Annotated[str, typer.Option("--description", "-d", help="Event description")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append an event directive."""

    def build() -> Any:
        from cli.directives.models import EventDirective

        return EventDirective(date=parse_date(date), type=type, description=description)

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("price")
def add_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "--commodity", "-c", help="Commodity being priced")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a price, or report an exact existing date/commodity/amount match."""
    from beancount import loader
    from beancount.core.data import Price

    from cli.directives.models import Amount, PriceDirective
    from cli.directives.writer import format_entry

    file = context.current().entry_file()
    number, price_currency = _parse_amount(amount)
    directive = PriceDirective(
        date=parse_date(date), currency=currency, amount=Amount(number=number, currency=price_currency)
    )
    snapshot = ledger_write.LedgerSnapshot.capture(file)
    target = ledger_write.destination(file, into)
    snapshot.require_target(target)
    entries, errors, _ = loader.load_file(file)
    if errors and not allow_errors:
        output.render_ledger_errors(errors, allow=False)
    match = next(
        (
            entry
            for entry in entries
            if isinstance(entry, Price)
            and entry.date == directive.date
            and entry.currency == currency
            and entry.amount.number == number
            and entry.amount.currency == price_currency
        ),
        None,
    )
    source = None
    if match is not None:
        snapshot.verify()
        source = {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
        warnings = [output.format_ledger_error(error) for error in errors]
        written = 0
    else:
        from beancount.core.amount import Amount as BcAmount

        entry = Price({}, directive.date, currency, BcAmount(number, price_currency))
        warnings = ledger_write.append(
            file, [format_entry(entry)], allow_errors=allow_errors, into=into, snapshot=snapshot
        )
        written = 1
    if context.current().json_output:
        output.emit(
            {
                "written": written,
                "directive": directive.model_dump(mode="json"),
                "warnings": warnings,
                "duplicate": match is not None,
                "source": source,
            },
            target={**output.file_target(file), "into": str(target)},
        )
    else:
        for warning in warnings:
            output.note(warning)
        if source:
            output.success(f"Price already recorded at {source['filename']}:{source['lineno']}; nothing was written.")
        else:
            output.success(f"Added 1 price to {target}.")


@add_app.command("commodity")
def add_commodity(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "--commodity", "-c", help="Commodity symbol")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a commodity directive."""

    def build() -> Any:
        from cli.directives.models import CommodityDirective

        return CommodityDirective(date=parse_date(date), currency=currency)

    _append(build, allow_errors=allow_errors, into=into)


@add_app.command("document")
def add_document(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    filename: Annotated[
        str,
        typer.Option("--filename", "--path", help="Document path, relative to the destination ledger file's directory"),
    ],
    tag: TagOpt = None,
    link: LinkOpt = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a document directive."""

    def build() -> Any:
        from cli.directives.models import DocumentDirective

        return DocumentDirective(
            date=parse_date(date),
            account=parse_account(account),
            filename=filename,
            tags=list(tag) if tag else [],
            links=list(link) if link else [],
        )

    _append(build, allow_errors=allow_errors, into=into)


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
    into: IntoOpt = None,
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

    _append(build, allow_errors=allow_errors, into=into)


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
        return CustomDirectiveValueAccount(kind="account", value=parse_account(rest))
    if kind == "bool" and rest.lower() in {"true", "false"}:
        return CustomDirectiveValueBoolean(kind="bool", value=rest.lower() == "true")
    if kind == "date":
        return CustomDirectiveValueDate(kind="date", value=parse_date(rest))
    raise typer.BadParameter(f"Invalid value kind or value {raw!r}. Use: text, number, amount, account, bool, date")


@add_app.command("transactions")
def add_transactions(
    from_file: Annotated[Path, typer.Option("--from", help="JSON file with a list of transactions; - reads stdin")],
    partial: Annotated[
        bool, typer.Option("--partial", help="Append the valid rows even when some rows are rejected")
    ] = False,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Bulk-append transactions from a JSON file.

    Every row is validated before anything is written: a bad row leaves the
    ledger untouched, so a failed run can never be mistaken for a clean one.
    The exit status is nonzero whenever any row was rejected, `--partial` or not.

    Minimal JSON file:
    [{"date":"2026-01-02","postings":[
      {"account":"Expenses:Groceries","amount":"30 USD"},
      {"account":"Assets:Checking"}]}]

    A posting can instead use "units":{"number":"30","currency":"USD"}.
    Pass --from - to read the array from stdin.
    """
    ctx = context.current()
    file = ctx.entry_file()
    from pydantic import ValidationError

    from cli.directives.models import TransactionDirective
    from cli.directives.writer import format_transaction, write_transactions

    try:
        raw = json.loads(sys.stdin.read() if str(from_file) == "-" else from_file.read_text())
    except json.JSONDecodeError as exc:
        raise UsageError(f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}.") from exc
    if not isinstance(raw, list):
        raise LedgerError("JSON file must contain an array of transactions.")

    valid: list[tuple[int, TransactionDirective]] = []
    rejected: list[str] = []
    rejected_rows: list[int] = []
    for index, item in enumerate(raw):
        try:
            valid.append((index, TransactionDirective.model_validate(item)))
        except ValidationError as exc:
            for error in exc.errors(include_url=False, include_input=False):
                location = ".".join(str(part) for part in error["loc"]) or "transaction"
                rejected.append(f"Row {index + 1}, {location}: {error['msg']}")
            rejected_rows.append(index)

    if rejected:
        rejected.append(
            'Example posting: {"account":"Assets:Checking","amount":"-30 USD"}. '
            "Use bea add transactions --help for a complete row."
        )

    if rejected and not partial:
        raise LedgerError(
            f"{len(rejected_rows)} of {len(raw)} row(s) are invalid; nothing was written. "
            f"Fix them, or pass --partial to append the {len(valid)} valid row(s).",
            details=rejected,
            result={"written": 0, "written_rows": [], "rejected_rows": rejected_rows},
        )

    # Validate the entire batch first: an earlier sale may depend on a buy that
    # appears later in the input. Only partial recovery needs sequential trials.
    try:
        ledger_write.validate_append(
            file, [format_transaction(d) for _, d in valid], allow_errors=allow_errors, into=into
        )
    except LedgerError as batch_error:
        if not partial:
            batch_error.result = {"written": 0, "written_rows": [], "unwritten_rows": [index for index, _ in valid]}
            raise
        accepted: list[tuple[int, TransactionDirective]] = []
        texts: list[str] = []
        for index, directive in valid:
            try:
                text = format_transaction(directive)
                ledger_write.validate_append(file, [*texts, text], allow_errors=allow_errors, into=into)
            except LedgerError as err:
                rejected.append(f"row {index}: {'; '.join(err.details) or str(err)}")
                rejected_rows.append(index)
            else:
                accepted.append((index, directive))
                texts.append(text)
        valid = accepted

    warnings = write_transactions(file, [d for _, d in valid], allow_errors=allow_errors, into=into)

    if rejected:
        count = len(rejected_rows)
        noun = "row was" if count == 1 else "rows were"
        raise LedgerError(
            f"Added {len(valid)} of {len(raw)} transactions; {count} {noun} rejected.",
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
        output.emit(data, target={**output.file_target(file), "into": str(ledger_write.destination(file, into))})
    else:
        for warning in warnings:
            output.note(warning)
        noun = "transaction" if len(valid) == 1 else "transactions"
        output.success(f"Added {len(valid)} {noun} to {ledger_write.destination(file, into)}.")
