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
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.amounts import check_decimal_notation, json_float_default, parse_decimal_number
from cli.completion import fixed_values
from cli.errors import UsageError
from cli.rows import parse_json, read_text
from cli.single_value import SingleValueCommand
from cli.utils import IntoPath, RawPath, parse_date

add_app = typer.Typer(
    help="Add beancount directives to a local .bean file", no_args_is_help=True, rich_markup_mode=None
)


class _SingleValueCommand(SingleValueCommand):
    advice = "Pass it once; repeat the command for another directive."


_BOOKING_METHODS = ("STRICT", "STRICT_WITH_SIZE", "NONE", "FIFO", "LIFO", "HIFO")
#: Completed for `--flag`: complete and incomplete. Beancount's other
#: one-character flags are accepted, but rarely what a user is after.
_TRANSACTION_FLAGS = ("*", "!")

IntoOpt = Annotated[
    Path | None,
    typer.Option("--into", click_type=IntoPath(), help="Write to an included file, relative to the root ledger"),
]
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
    return parse_decimal_number(parts[0]), parts[1]


def _single_amount(amounts: list[str], name: str) -> str:
    """The one --amount a directive holds; repeats are refused, never silently dropped."""
    if len(amounts) != 1:
        raise UsageError(
            f"Pass --amount exactly once; a {name} holds one amount ({len(amounts)} given). "
            "Repeat the command for another."
        )
    return amounts[0]


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
    data = launch.helper_json(argv, stdin=json.dumps(request, default=json_float_default), writes=True)
    # A write through an included leaf is the root's write: `target.file`
    # named the leaf, and the same write with `--into` named the root (w5/613).
    root = data.pop("root", None)
    return (Path(root) if root else file), data


def _already_recorded(name: str, source: dict[str, Any]) -> None:
    """Report a retried write that changed nothing — the same way for every type."""
    output.success(f"{name} already recorded at {source['filename']}:{source['lineno']}; nothing was written.")


def _appended(name: str, file: Path, data: dict[str, Any]) -> None:
    """Report one appended directive — the same way for every type."""
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    dest = output.write_target(file, target)
    if context.current().json_output:
        output.emit({**data, "warnings": warnings}, target=dest)
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Added 1 {name} to {dest['into']}.")


# Positional narrations that are almost certainly something else (w5/443):
# a date dated the entry today, and an account or amount belonged in -p.
_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_YEAR_FIRST_DATE = re.compile(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})")
_DATE_SHAPED = re.compile(r"\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}")
_ACCOUNT_SHAPED = re.compile(r"[A-Z][A-Za-z0-9-]*(?::[A-Z0-9][A-Za-z0-9-]*)+")
_AMOUNT_SHAPED = re.compile(r"[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s+[A-Z][A-Z0-9'._-]*)?")


def _refuse_date_narration(narration: str) -> None:
    """A date in the narration's place, with no --date, would date the entry today."""
    text = narration.strip()
    if not _DATE_SHAPED.fullmatch(text):
        return
    year_first = _YEAR_FIRST_DATE.fullmatch(text)
    if _ISO_DATE.fullmatch(text):
        suggested = text
    elif year_first:
        suggested = "{}-{:0>2}-{:0>2}".format(*year_first.groups())
    else:
        suggested = "YYYY-MM-DD"
    raise UsageError(
        f"{narration!r} looks like a date, but the positional argument is the narration, and without --date "
        f"the entry is dated today. Pass --date {suggested}, or add --date to keep it as the narration."
    )


def _shape_warning(narration: str) -> str | None:
    text = narration.strip()
    if _ACCOUNT_SHAPED.fullmatch(text):
        shape = "an account"
    elif _AMOUNT_SHAPED.fullmatch(text):
        shape = "an amount"
    else:
        return None
    return (
        f"Narration {narration!r} looks like {shape}. Postings go in -p, each quoted whole, "
        "as in -p 'Expenses:Food 5 USD'; the positional argument is the narration."
    )


@add_app.command("transaction", cls=_SingleValueCommand)
def add_transaction(
    postings: Annotated[
        list[str],
        typer.Option("--posting", "-p", help="Beancount posting, e.g. 'Account 30 USD' or 'Account' (repeat)"),
    ],
    narration_arg: Annotated[str | None, typer.Argument(help="Narration; --narration means the same")] = None,
    date: Annotated[str | None, typer.Option("--date", help="Transaction date YYYY-MM-DD; defaults to today")] = None,
    flag: Annotated[
        str, typer.Option("--flag", help="Transaction flag", autocompletion=fixed_values(_TRANSACTION_FLAGS))
    ] = "*",
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
    shape_warning = None
    if narration_arg is not None and date is None:
        _refuse_date_narration(narration_arg)
        shape_warning = _shape_warning(narration_arg)

    if any("\n" in p or "\r" in p for p in postings):
        raise UsageError("Each --posting must be one line; repeat -p for another posting.")
    for posting_text in postings:
        check_decimal_notation(posting_text)
    request = {
        "date": (datetime.date.today() if date is None else parse_date(date)).isoformat(),
        "flag": flag,
        "payee": payee,
        "narration": narration,
        "postings": list(postings),
        "tags": list(tag or []),
        "links": list(link or []),
        "meta": list(meta or []),
    }
    file, data = _write("transaction", request, allow_errors=allow_errors, into=into)
    if shape_warning is not None:
        data["warnings"] = [shape_warning, *data.get("warnings", [])]
    _appended("transaction", file, data)


@add_app.command("open", cls=_SingleValueCommand)
def add_open(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    currency: Annotated[list[str] | None, typer.Option("--currency", "-c", help="Allowed currency (repeat)")] = None,
    booking: Annotated[
        str | None,
        typer.Option(
            "--booking",
            help=f"Lot booking method: {', '.join(_BOOKING_METHODS)}",
            autocompletion=fixed_values(_BOOKING_METHODS),
        ),
    ] = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append an open directive."""
    request: dict[str, Any] = {
        "date": parse_date(date).isoformat(),
        "account": account,
        "currencies": list(currency) if currency else [],
    }
    if booking is not None:
        request["booking"] = booking
    file, data = _write("open", request, allow_errors=allow_errors, into=into)
    _appended("open", file, data)


@add_app.command("close", cls=_SingleValueCommand)
def add_close(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
    force: Annotated[
        bool,
        typer.Option("--force", help="Close the account even though it still holds a balance on the close date"),
    ] = False,
) -> None:
    """Append a close directive."""
    request = {"date": parse_date(date).isoformat(), "account": account, "force": force}
    file, data = _write("close", request, allow_errors=allow_errors, into=into)
    _appended("close", file, data)


@add_app.command("balance", cls=_SingleValueCommand)
def add_balance(
    date: DateOpt,
    account: Annotated[str, typer.Option("--account", "-a", help="Account name")],
    amount: Annotated[list[str], typer.Option("--amount", help="'NUMBER [~ TOLERANCE] CURRENCY' (pass once)")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            help="Record another assertion when the date/account already has one, or pad to an amount whose "
            "sign is refused",
        ),
    ] = False,
    pad_from: Annotated[
        str | None,
        typer.Option("--pad-from", help="Explicitly add a pad and this balance assertion together; source account"),
    ] = None,
    pad_date: Annotated[
        str | None, typer.Option("--pad-date", help="Pad date; defaults to the day before the balance assertion")
    ] = None,
) -> None:
    """Append a balance assertion, or pad from another account.

    --pad-from writes both directives atomically. It creates an adjustment;
    review missing transactions before using it to reconcile a discrepancy.
    """
    if pad_date is not None and pad_from is None:
        raise UsageError("--pad-date requires --pad-from.")
    single = _single_amount(amount, "balance assertion")
    if "\n" not in single and "\r" not in single:
        # Multi-line text is the engine's complaint to make; this only rejects
        # an exponent, which no Beancount amount accepts.
        check_decimal_notation(single)
    day = parse_date(date)
    request: dict[str, Any] = {"date": day.isoformat(), "account": account, "amount": single, "force": force}
    ctx = context.current()
    if pad_from is None:
        # Finding a duplicate means reading the ledger: strict callers refuse
        # a ledger that does not load (see add price), a person at a terminal
        # gets the errors as a banner and the write goes ahead.
        file, data = _write(
            "balance",
            request,
            allow_errors=allow_errors,
            into=into,
            strict_read=not allow_errors and ctx.strict_reads(),
        )
        ledger_errors = data.pop("ledger_errors", [])
        if not allow_errors:
            output.render_ledger_errors(ledger_errors, allow=True)
        target = data.pop("target")
        # Price answers always carry duplicate/source; a fresh balance matches that shape.
        data.setdefault("duplicate", False)
        data.setdefault("source", None)
        source = data.get("source")
        if ctx.json_output:
            output.emit(data, target=output.write_target(file, target))
        elif source:
            for warning in data["warnings"]:
                output.note(warning)
            _already_recorded("Balance", source)
        else:
            _appended("balance", file, {**data, "target": target})
        return

    if day == datetime.date.min and pad_date is None:
        raise UsageError("The balance date must allow an earlier pad date.")
    padded = day - datetime.timedelta(days=1) if pad_date is None else parse_date(pad_date)
    if padded >= day:
        raise UsageError("--pad-date must be earlier than the balance date (assertions run at the start of the day).")
    request |= {"pad_from": pad_from, "pad_date": padded.isoformat(), "pad_date_explicit": pad_date is not None}
    file, data = _write("balance", request, allow_errors=allow_errors, into=into)
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    # One shape for every branch, as the plain path answers (w5/323).
    data.setdefault("duplicate", False)
    data.setdefault("source", None)
    written = int(data.get("written") or 0)
    source = data.get("source")
    dest = output.write_target(file, target)
    if ctx.json_output:
        output.emit({**data, "warnings": warnings}, target=dest)
    else:
        for warning in warnings:
            output.note(warning)
        if source:
            _already_recorded("Balance", source)
        elif written == 1:
            output.success(f"Added 1 balance to {dest['into']}.")
        else:
            pad = data.get("pad") or {}
            inserted = pad.get("amount") or {}
            if inserted:
                # The amount was never said, so a sign error padded twice the balance unseen (w5/611).
                output.success(
                    f"Added 1 pad and 1 balance to {dest['into']}; the pad inserts {inserted['number']} "
                    f"{inserted['currency']} into {pad.get('account')} from {pad.get('source_account')}."
                )
            else:
                output.success(f"Added 1 pad and 1 balance to {dest['into']}.")


@add_app.command("pad", cls=_SingleValueCommand)
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


@add_app.command("note", cls=_SingleValueCommand)
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


@add_app.command("event", cls=_SingleValueCommand)
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


@add_app.command("price", cls=_SingleValueCommand)
def add_price(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "--commodity", "-c", help="Commodity being priced")],
    amount: Annotated[list[str], typer.Option("--amount", help="'NUMBER CURRENCY' (pass once)")],
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
    force: Annotated[
        bool,
        typer.Option("--force", help="Record another quote when the ledger already has one for the date/commodity"),
    ] = False,
) -> None:
    """Append a price directive.

    An exact ledger-authored date/commodity/amount match is reported instead of duplicated.
    """
    number, price_currency = _parse_amount(_single_amount(amount, "price"))
    request = {
        "date": parse_date(date).isoformat(),
        "currency": currency,
        "number": format(number, "f"),
        "amount_currency": price_currency,
        "force": force,
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
    dest = output.write_target(file, target)
    if ctx.json_output:
        output.emit(data, target=dest)
    else:
        for warning in data["warnings"]:
            output.note(warning)
        if source:
            _already_recorded("Price", source)
        else:
            output.success(f"Added 1 price to {dest['into']}.")


@add_app.command("commodity", cls=_SingleValueCommand)
def add_commodity(
    date: DateOpt,
    currency: Annotated[str, typer.Option("--currency", "--commodity", "-c", help="Commodity symbol")],
    meta: Annotated[
        list[str] | None, typer.Option("--meta", help="'key:value' metadata; bare text or native typed values (repeat)")
    ] = None,
    allow_errors: AllowErrorsOpt = False,
    into: IntoOpt = None,
) -> None:
    """Append a commodity directive.

    `--meta` registers what a symbol is — 'name:Vanguard 500 Index',
    'asset-class:equity' — beside the bare date and symbol.
    """
    request = {"date": parse_date(date).isoformat(), "currency": currency, "meta": list(meta or [])}
    file, data = _write("commodity", request, allow_errors=allow_errors, into=into)
    _appended("commodity", file, data)


@add_app.command("document", cls=_SingleValueCommand)
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


@add_app.command("custom", cls=_SingleValueCommand)
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

    \b
    Examples:
      --value 'text:hello'
      --value 'number:1000'
      --value 'amount:500 USD'
      --value 'account:Assets:Cash'
    """
    if not value:
        raise UsageError(
            "bea add custom needs at least one --value (for example --value 'text:x'). "
            "A custom with no values breaks Beancount's pad plugin."
        )
    request = {
        "date": parse_date(date).isoformat(),
        "type": type,
        "values": [_parse_custom_value(v) for v in value],
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
        return {"kind": "number", "value": format(parse_decimal_number(rest), "f")}
    if kind == "amount":
        number, currency = _parse_amount(rest)
        return {"kind": "amount", "number": format(number, "f"), "currency": currency}
    if kind == "account":
        return {"kind": "account", "value": rest}
    if kind == "bool" and rest.lower() in {"true", "false"}:
        return {"kind": "bool", "value": rest.lower() == "true"}
    if kind == "date":
        return {"kind": "date", "value": parse_date(rest).isoformat()}
    raise typer.BadParameter(f"Invalid value kind or value {raw!r}. Use: text, number, amount, account, bool, date")


def _load_transactions_json(from_file: str) -> Any:
    """Read and parse `--from`; unreadable input is a usage error, phrased like `--file`'s."""
    text, name = read_text(from_file, noun="Transactions", json_only=True)
    return parse_json(text, name)


@add_app.command("transactions", cls=_SingleValueCommand)
def add_transactions(
    from_file: Annotated[
        str, typer.Option("--from", click_type=RawPath(), help="JSON file with a list of transactions; - reads stdin")
    ],
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
    raw = _load_transactions_json(from_file)
    if not isinstance(raw, list):
        raise UsageError("JSON file must contain an array of transactions.")

    file, data = _write("transactions", {"rows": raw, "partial": partial}, allow_errors=allow_errors, into=into)
    target = data.pop("target")
    warnings = data.pop("warnings", [])
    written = int(data["written"])
    dest = output.write_target(file, target)
    if context.current().json_output:
        if warnings:
            data["warnings"] = warnings
        output.emit(data, target=dest)
    else:
        for warning in warnings:
            output.note(warning)
        noun = "transaction" if written == 1 else "transactions"
        output.success(f"Added {written} {noun} to {dest['into']}.")
