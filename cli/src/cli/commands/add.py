"""`bea add <type>` — append beancount directives to a local ledger.

The validating and the writing happen in the engine (`bea-engine add`); this
module owns the option surface, the checks that need no Beancount (dates,
numeric notation, which options may be combined), and the messages a person
reads. What the customer typed travels across as a JSON request, because a
posting, a balance tolerance and a typed metadata value are Beancount syntax and
only the engine can read them.
"""

from __future__ import annotations

import datetime
import json
import re
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import LedgerError, UsageError
from cli.utils import parse_date

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


def _write(
    directive_type: str,
    request: dict[str, Any],
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    strict_read: bool = False,
) -> tuple[Path, dict[str, Any]]:
    """Hand one write request to the engine and return the ledger it wrote to plus its answer.

    The request goes over stdin rather than in the argument list: a batch of
    transactions does not fit in argv, and a posting full of quotes and braces
    needs no escaping on the way through a pipe.
    """
    from cli.engine import launch

    file = context.current().entry_file()
    argv = ["add", "--file", str(file), "--type", directive_type, "--request", "-"]
    if into is not None:
        argv += ["--into", str(into)]
    if allow_errors:
        argv.append("--allow-errors")
    if strict_read:
        argv.append("--strict-read")
    return file, launch.helper_json(argv, stdin=json.dumps(request))


def _appended(name: str, file: Path, data: dict[str, Any]) -> None:
    """Report one appended directive — the same way for every type."""
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    if context.current().json_output:
        output.emit({**data, "warnings": warnings}, target={**output.file_target(file), "into": target})
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Added 1 {name} to {target}.")


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

    if any("\n" in p or "\r" in p for p in postings):
        raise UsageError("Each --posting must be one line; repeat -p for another posting.")
    for posting_text in postings:
        _check_decimal_notation(posting_text)
    request = {
        "date": (parse_date(date) if date else datetime.date.today()).isoformat(),
        "flag": flag,
        "payee": payee,
        "narration": narration,
        "postings": list(postings),
        "tags": list(tag or []),
        "links": list(link or []),
        "meta": list(meta or []),
    }
    file, data = _write("transaction", request, allow_errors=allow_errors, into=into)
    _appended("transaction", file, data)


@add_app.command("open")
def add_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append an open directive."""
    request = {
        "date": parse_date(date).isoformat(),
        "account": account,
        "currencies": list(currency) if currency else [],
    }
    file, data = _write("open", request, allow_errors=allow_errors, into=into)
    _appended("open", file, data)


@add_app.command("close")
def add_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a close directive."""
    file, data = _write(
        "close", {"date": parse_date(date).isoformat(), "account": account}, allow_errors=allow_errors, into=into
    )
    _appended("close", file, data)


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
    if "\n" not in amount and "\r" not in amount:
        # Multi-line text is the engine's complaint to make; this only rejects
        # an exponent, which no Beancount amount accepts.
        _check_decimal_notation(amount)
    day = parse_date(date)
    request: dict[str, Any] = {"date": day.isoformat(), "account": account, "amount": amount}
    if pad_from is None:
        file, data = _write("balance", request, allow_errors=allow_errors, into=into)
        _appended("balance", file, data)
        return

    if day == datetime.date.min and pad_date is None:
        raise UsageError("The balance date must allow an earlier pad date.")
    padded = parse_date(pad_date) if pad_date else day - datetime.timedelta(days=1)
    if padded >= day:
        raise UsageError("--pad-date must be earlier than the balance date (assertions run at the start of the day).")
    request |= {"pad_from": pad_from, "pad_date": padded.isoformat()}
    file, data = _write("balance", request, allow_errors=allow_errors, into=into)
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    if context.current().json_output:
        output.emit({**data, "warnings": warnings}, target={**output.file_target(file), "into": target})
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Added 1 pad and 1 balance to {target}.")


@add_app.command("pad")
def add_pad(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account to pad")],
    source: Annotated[str, typer.Option("--source", "-s", help="Source account")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a pad directive."""
    request = {"date": parse_date(date).isoformat(), "account": account, "source_account": source}
    file, data = _write("pad", request, allow_errors=allow_errors, into=into)
    _appended("pad", file, data)


@add_app.command("note")
def add_note(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    comment: Annotated[str, typer.Option("--comment", "--message", "-m", help="Note text")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a note directive."""
    request = {"date": parse_date(date).isoformat(), "account": account, "comment": comment}
    file, data = _write("note", request, allow_errors=allow_errors, into=into)
    _appended("note", file, data)


@add_app.command("event")
def add_event(
    date: DateOpt,
    type: Annotated[str, typer.Option("--type", "-t", help="Event type")],
    description: Annotated[str, typer.Option("--description", "-d", help="Event description")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append an event directive."""
    request = {"date": parse_date(date).isoformat(), "type": type, "description": description}
    file, data = _write("event", request, allow_errors=allow_errors, into=into)
    _appended("event", file, data)


@add_app.command("price")
def add_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "--commodity", "-c", help="Commodity being priced")],
    amount: Annotated[str, typer.Option("--amount", help="'NUMBER CURRENCY'")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a price, or report an exact existing date/commodity/amount match."""
    number, price_currency = _parse_amount(amount)
    request = {
        "date": parse_date(date).isoformat(),
        "currency": currency,
        "number": str(number),
        "amount_currency": price_currency,
    }
    ctx = context.current()
    # Finding a duplicate means reading the ledger, so this one write has a read
    # to gate: strict callers refuse a ledger that does not load, a person at a
    # terminal gets the errors as a banner and the write goes ahead.
    file, data = _write(
        "price",
        request,
        allow_errors=allow_errors,
        into=into,
        strict_read=not allow_errors and ctx.strict_reads(),
    )
    ledger_errors = data.pop("ledger_errors", [])
    if not allow_errors:
        output.render_ledger_errors(ledger_errors, allow=True)
    target = data.pop("target")
    source = data["source"]
    if ctx.json_output:
        output.emit(data, target={**output.file_target(file), "into": target})
    else:
        for warning in data["warnings"]:
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
    request = {"date": parse_date(date).isoformat(), "currency": currency}
    file, data = _write("commodity", request, allow_errors=allow_errors, into=into)
    _appended("commodity", file, data)


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
    request = {
        "date": parse_date(date).isoformat(),
        "account": account,
        "filename": filename,
        "tags": list(tag) if tag else [],
        "links": list(link) if link else [],
    }
    file, data = _write("document", request, allow_errors=allow_errors, into=into)
    _appended("document", file, data)


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
    request = {
        "date": parse_date(date).isoformat(),
        "type": type,
        "values": [_parse_custom_value(v) for v in value or []],
    }
    file, data = _write("custom", request, allow_errors=allow_errors, into=into)
    _appended("custom", file, data)


def _parse_custom_value(raw: str) -> dict[str, Any]:
    """Classify one `kind:VALUE`. An account's spelling is the engine's to judge."""
    if ":" not in raw:
        raise typer.BadParameter(f"Value must be 'kind:VALUE', got: {raw!r}")
    kind, rest = raw.split(":", 1)
    if kind == "text":
        return {"kind": "text", "value": rest}
    if kind == "number":
        return {"kind": "number", "value": str(_parse_number(rest))}
    if kind == "amount":
        number, currency = _parse_amount(rest)
        return {"kind": "amount", "number": str(number), "currency": currency}
    if kind == "account":
        return {"kind": "account", "value": rest}
    if kind == "bool" and rest.lower() in {"true", "false"}:
        return {"kind": "bool", "value": rest.lower() == "true"}
    if kind == "date":
        return {"kind": "date", "value": parse_date(rest).isoformat()}
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
    try:
        raw = json.loads(sys.stdin.read() if str(from_file) == "-" else from_file.read_text())
    except json.JSONDecodeError as exc:
        raise UsageError(f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}.") from exc
    if not isinstance(raw, list):
        raise LedgerError("JSON file must contain an array of transactions.")

    file, data = _write("transactions", {"rows": raw, "partial": partial}, allow_errors=allow_errors, into=into)
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    written = int(data["written"])
    if context.current().json_output:
        if warnings:
            data["warnings"] = warnings
        output.emit(data, target={**output.file_target(file), "into": target})
    else:
        for warning in warnings:
            output.note(warning)
        noun = "transaction" if written == 1 else "transactions"
        output.success(f"Added {written} {noun} to {target}.")
