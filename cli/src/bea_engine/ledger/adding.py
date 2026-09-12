"""What `bea-engine add` answers: a validated directive appended to a ledger.

Every type ends in the same place — `write.append`, which stages a candidate,
loads it, and replaces the destination only if the whole ledger still loads. So
a rejected directive leaves the file byte-identical, and the answer says what
was written rather than what was attempted.

The request is JSON because most of these directives carry more than a flat
option list, and it holds what the customer typed rather than a pre-built
directive: a posting such as `Assets:Stock 2 AAPL {100 USD}`, a balance
tolerance, a typed metadata value, and an account name are all Beancount syntax,
and Beancount lives here. `cli/commands/add.py` keeps the option surface, the
date arithmetic, and the messages a person reads.
"""

from __future__ import annotations

import datetime
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import write, writer
from bea_engine.ledger.text import parse_account, single_line

TYPES = (
    "transaction",
    "transactions",
    "open",
    "close",
    "balance",
    "pad",
    "note",
    "event",
    "price",
    "commodity",
    "document",
    "custom",
)


def answer(
    file: Path,
    directive_type: str,
    request: dict[str, Any],
    *,
    into: Path | None = None,
    allow_errors: bool = False,
    strict_read: bool = False,
) -> dict[str, Any]:
    """Validate and append one request, and report what reached the ledger."""
    builders = {
        "transaction": _transaction,
        "transactions": _transactions,
        "balance": _balance,
        "price": _price,
    }
    build = builders.get(directive_type)
    if build is not None:
        return build(file, request, into=into, allow_errors=allow_errors, strict_read=strict_read)
    if directive_type not in TYPES:
        raise protocol.UsageError(f"Unknown directive type {directive_type!r}. Use one of: {', '.join(TYPES)}.")
    return _appended(file, _simple(directive_type, request), allow_errors=allow_errors, into=into)


# --------------------------------------------------------------------------- #
# The nine directives that are just their own fields
# --------------------------------------------------------------------------- #


def _simple(directive_type: str, request: dict[str, Any]) -> Any:
    from bea_engine.ledger.models import (
        CloseDirective,
        CommodityDirective,
        CustomDirective,
        DocumentDirective,
        EventDirective,
        NoteDirective,
        OpenDirective,
        PadDirective,
    )

    date = _date(request)
    if directive_type == "open":
        return OpenDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            currencies=list(request.get("currencies") or []),
        )
    if directive_type == "close":
        return CloseDirective(date=date, account=parse_account(_text(request, "account")))
    if directive_type == "pad":
        return PadDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            source_account=parse_account(_text(request, "source_account")),
        )
    if directive_type == "note":
        return NoteDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            comment=_text(request, "comment"),
        )
    if directive_type == "event":
        return EventDirective(date=date, type=_text(request, "type"), description=_text(request, "description"))
    if directive_type == "commodity":
        return CommodityDirective(date=date, currency=_text(request, "currency"))
    if directive_type == "document":
        return DocumentDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            filename=_text(request, "filename"),
            tags=list(request.get("tags") or []),
            links=list(request.get("links") or []),
        )
    values = list(request.get("values") or [])
    for value in values:
        # Only this side knows what a valid account is, so an account-typed
        # custom value is checked here rather than where it was typed.
        if isinstance(value, dict) and value.get("kind") == "account":
            parse_account(str(value.get("value", "")))
    return CustomDirective.model_validate({"date": date, "type": _text(request, "type"), "values": values})


def _appended(file: Path, directive: Any, *, allow_errors: bool, into: Path | None) -> dict[str, Any]:
    """Append one model-shaped directive; which writer to call follows from its type."""
    name = type(directive).__name__.removesuffix("Directive").lower()
    warnings = getattr(writer, f"write_{name}")(file, directive, allow_errors=allow_errors, into=into)
    return {
        "written": 1,
        "directive": directive.model_dump(mode="json"),
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


# --------------------------------------------------------------------------- #
# balance, with or without an explicit pad
# --------------------------------------------------------------------------- #


def _balance(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    del strict_read  # A balance assertion needs no prior read of its own.
    from bea_engine.ledger.models import Amount, BalanceDirective

    date = _date(request)
    number, currency, tolerance = _parse_balance_amount(_text(request, "amount"))
    pad_from = request.get("pad_from")
    if pad_from is None:
        directive = BalanceDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            amount=Amount(number=number, currency=currency),
            tolerance=tolerance,
        )
        return _appended(file, directive, allow_errors=allow_errors, into=into)

    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Balance, Pad

    padded = _date(request, "pad_date")
    entries = [
        Pad({}, padded, parse_account(_text(request, "account")), parse_account(str(pad_from))),
        Balance({}, date, parse_account(_text(request, "account")), BcAmount(number, currency), tolerance, None),
    ]
    warnings = write.append(file, [writer.format_entry(e) for e in entries], allow_errors=allow_errors, into=into)
    return {
        "written": 2,
        "directives": entries,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


def _parse_balance_amount(text: str) -> tuple[Decimal, str, Decimal | None]:
    """`NUMBER [~ TOLERANCE] CURRENCY`, read by the parser that will read it back."""
    from beancount.core.data import Balance
    from beancount.parser import parser

    if "\n" in text or "\r" in text:
        raise protocol.UsageError("Balance amount must be one line: 'NUMBER [~ TOLERANCE] CURRENCY'.")
    entries, errors, _ = parser.parse_string(f"2000-01-01 balance Assets:Balance {text}\n")
    if errors or len(entries) != 1 or not isinstance(entries[0], Balance):
        raise protocol.UsageError(
            "Balance amount must be 'NUMBER [~ TOLERANCE] CURRENCY', for example '1538 ~ 1 EUR'.",
            details=[f"--amount: {error.message}" for error in errors],
        )
    entry = entries[0]
    if entry.amount.number is None:
        raise protocol.UsageError("Supply a balance number, for example '1538 ~ 1 EUR'.")
    if entry.tolerance is not None and entry.tolerance < 0:
        raise protocol.UsageError("Balance tolerance must be nonnegative.")
    return entry.amount.number, entry.amount.currency, entry.tolerance


# --------------------------------------------------------------------------- #
# price — the one add that reads the ledger before deciding to write
# --------------------------------------------------------------------------- #


def _price(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    """Append a price, or report the existing directive that already records it.

    Recording the same quote twice is not an error and not a change, so the
    duplicate is answered with its source location and the file is left alone.
    """
    from beancount import loader
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Price

    from bea_engine.ledger.models import Amount, PriceDirective
    from bea_engine.query import format_error

    currency = _text(request, "currency")
    number = _decimal(request, "number")
    amount_currency = _text(request, "amount_currency")
    directive = PriceDirective(
        date=_date(request), currency=currency, amount=Amount(number=number, currency=amount_currency)
    )
    snapshot = write.LedgerSnapshot.capture(file)
    target = write.destination(file, into)
    snapshot.require_target(target)
    entries, errors, _ = loader.load_file(file)
    ledger_errors = [format_error(error) for error in errors]
    if ledger_errors and strict_read:
        raise protocol.LedgerError(
            f"Ledger has {len(ledger_errors)} error(s). Pass --allow-errors to report anyway.", details=ledger_errors
        )
    match = next(
        (
            entry
            for entry in entries
            if isinstance(entry, Price)
            and entry.date == directive.date
            and entry.currency == currency
            and entry.amount.number == number
            and entry.amount.currency == amount_currency
        ),
        None,
    )
    if match is not None:
        snapshot.verify()
        source = {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
        return {
            "written": 0,
            "directive": directive.model_dump(mode="json"),
            "warnings": ledger_errors,
            "duplicate": True,
            "source": source,
            "ledger_errors": ledger_errors,
            "target": str(target),
        }

    entry = Price({}, directive.date, currency, BcAmount(number, amount_currency))
    warnings = write.append(file, [writer.format_entry(entry)], allow_errors=allow_errors, into=into, snapshot=snapshot)
    return {
        "written": 1,
        "directive": directive.model_dump(mode="json"),
        "warnings": warnings,
        "duplicate": False,
        "source": None,
        "ledger_errors": ledger_errors,
        "target": str(target),
    }


# --------------------------------------------------------------------------- #
# transaction — native posting syntax, inferred currency, one elided amount
# --------------------------------------------------------------------------- #


def _transaction(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    del strict_read  # Only an ambiguous currency reads the ledger, and it says so itself.
    from beancount import loader
    from beancount.core.data import Open, Transaction
    from beancount.core.number import MISSING
    from beancount.parser import parser
    from beancount.parser.grammar import ParserError

    from bea_engine.ledger.models import TransactionDirective
    from bea_engine.ledger.reader import metadata_to_json

    postings: list[str] = [str(posting) for posting in request.get("postings") or []]
    for posting_text in postings:
        parts = posting_text.split()
        # Native posting flags are single characters; accounts never are.
        if parts and len(parts[0]) == 1:
            parts = parts[1:]
        parse_account(parts[0] if parts else "")
    header = TransactionDirective(
        date=_date(request),
        flag=str(request.get("flag") or "*"),
        payee=request.get("payee"),
        narration=request.get("narration"),
        postings=[],
        tags=list(request.get("tags") or []),
        links=list(request.get("links") or []),
        meta=_parse_metadata([str(item) for item in request.get("meta") or []]),
    )
    header_text = writer.format_transaction(header)
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
        raise protocol.UsageError(
            "Invalid transaction options; use postings such as 'Assets:Checking -30 USD'. Nothing was written.",
            details=details,
        )
    entry = entries[0]
    snapshot = None
    currencies: list[str] = []
    allowed: dict[str, list[str] | None] = {}
    raw_postings: Any = entry.postings
    if any(p.units is not MISSING and p.units.currency is MISSING for p in raw_postings):
        snapshot = write.LedgerSnapshot.capture(file)
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
                raise protocol.UsageError(
                    f"Currency is ambiguous for {posting.account}; specify NUMBER CURRENCY explicitly.",
                    details=write.root_ledger_hints(file),
                )
            units = units._replace(currency=choices[0])
        normalized.append(posting._replace(units=units, meta={}))
    if elided > 1:
        raise protocol.UsageError("Only one posting may omit its amount; supply amounts for the other postings.")
    entry = entry._replace(postings=normalized, meta=write.metadata_for_write(entry.meta))
    rendered = writer.format_entry(entry)
    warnings = write.append(file, [rendered], allow_errors=allow_errors, into=into, snapshot=snapshot)
    return {
        "written": 1,
        "directive": entry._replace(meta=metadata_to_json(entry.meta)),
        "entry": rendered,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


def _parse_metadata(items: list[str]) -> dict[str, Any]:
    """`key:value` pairs, with native typed values read by Beancount's own parser."""
    from beancount.core.data import Transaction
    from beancount.parser import parser

    metadata: dict[str, Any] = {}
    for item in items:
        key, separator, raw = item.partition(":")
        key, raw = key.strip(), single_line(raw).strip()
        if not separator or not re.fullmatch(r"[a-z][A-Za-z0-9_-]*", key) or key in {"filename", "lineno"} or not raw:
            raise protocol.UsageError(
                "Each --meta must be 'key:value', such as 'receipt:IMG_1234.jpg'; use '\"\"' for empty text."
            )
        if key in metadata:
            raise protocol.UsageError(f"Metadata key {key!r} was supplied more than once; use one --meta per key.")
        entries, errors, _ = parser.parse_string(f'2000-01-01 * ""\n  {key}: {raw}\n')
        if not errors and len(entries) == 1 and isinstance(entries[0], Transaction) and key in entries[0].meta:
            metadata[key] = entries[0].meta[key]
        elif raw.startswith('"'):
            raise protocol.UsageError(
                f"Invalid --meta {key!r}; close the quoted string or supply a bare value such as '{key}:hello'.",
                details=[str(error.message) for error in errors],
            )
        else:
            metadata[key] = raw
    return metadata


# --------------------------------------------------------------------------- #
# transactions — a batch that is validated whole before anything is written
# --------------------------------------------------------------------------- #


def _transactions(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    del strict_read
    from pydantic import ValidationError

    from bea_engine.ledger.models import TransactionDirective

    rows = list(request.get("rows") or [])
    partial = bool(request.get("partial"))

    valid: list[tuple[int, Any]] = []
    rejected: list[str] = []
    rejected_rows: list[int] = []
    for index, item in enumerate(rows):
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
        raise protocol.LedgerError(
            f"{len(rejected_rows)} of {len(rows)} row(s) are invalid; nothing was written. "
            f"Fix them, or pass --partial to append the {len(valid)} valid row(s).",
            details=rejected,
            result={"written": 0, "written_rows": [], "rejected_rows": rejected_rows},
        )

    # Validate the entire batch first: an earlier sale may depend on a buy that
    # appears later in the input. Only partial recovery needs sequential trials.
    try:
        write.validate_append(
            file, [writer.format_transaction(d) for _, d in valid], allow_errors=allow_errors, into=into
        )
    except protocol.LedgerError as batch_error:
        if not partial:
            batch_error.result = {"written": 0, "written_rows": [], "unwritten_rows": [index for index, _ in valid]}
            raise
        accepted: list[tuple[int, Any]] = []
        texts: list[str] = []
        for index, directive in valid:
            try:
                text = writer.format_transaction(directive)
                write.validate_append(file, [*texts, text], allow_errors=allow_errors, into=into)
            except protocol.LedgerError as err:
                rejected.append(f"row {index}: {'; '.join(err.details) or str(err)}")
                rejected_rows.append(index)
            else:
                accepted.append((index, directive))
                texts.append(text)
        valid = accepted

    warnings = writer.write_transactions(file, [d for _, d in valid], allow_errors=allow_errors, into=into)
    target = str(write.destination(file, into))

    if rejected:
        count = len(rejected_rows)
        noun = "row was" if count == 1 else "rows were"
        raise protocol.LedgerError(
            f"Added {len(valid)} of {len(rows)} transactions; {count} {noun} rejected.",
            details=rejected,
            result={
                "written": len(valid),
                "written_rows": [index for index, _ in valid],
                "rejected_rows": rejected_rows,
            },
        )
    return {"written": len(valid), "rejected": [], "warnings": warnings, "target": target}


# --------------------------------------------------------------------------- #
# request field access — a bad request is a usage failure, not a traceback
# --------------------------------------------------------------------------- #


def _text(request: dict[str, Any], field: str) -> str:
    value = request.get(field)
    if not isinstance(value, str):
        raise protocol.UsageError(f"The request is missing its {field!r}.")
    return value


def _date(request: dict[str, Any], field: str = "date") -> datetime.date:
    try:
        return datetime.date.fromisoformat(_text(request, field))
    except ValueError:
        raise protocol.UsageError(f"Request field {field!r} must be a date in YYYY-MM-DD form.") from None


def _decimal(request: dict[str, Any], field: str) -> Decimal:
    try:
        return Decimal(_text(request, field))
    except InvalidOperation:
        raise protocol.UsageError(f"Request field {field!r} must be a number.") from None
