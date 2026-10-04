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
import os
import re
import unicodedata
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.amounts import parse_decimal_number
from bea_engine.ledger import write, writer
from bea_engine.ledger.text import outside_ledger_tree, parse_account, single_line

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
    from pydantic import ValidationError

    build = builders.get(directive_type)
    try:
        if build is not None:
            return build(file, request, into=into, allow_errors=allow_errors, strict_read=strict_read)
        if directive_type not in TYPES:
            raise protocol.UsageError(f"Unknown directive type {directive_type!r}. Use one of: {', '.join(TYPES)}.")
        directive = _simple(directive_type, request)
        if directive_type == "document":
            _require_document_in_tree(file, into, directive.filename)
        return _appended(file, directive, allow_errors=allow_errors, into=into)
    except ValidationError as exc:
        # A typed field the models refused — a tag, link, flag or commodity that
        # is not one Beancount token — is bad input, refused before any write.
        message = (
            _HEADER_ERROR
            if directive_type == "transaction"
            else f"Invalid {directive_type} options. Nothing was written."
        )
        raise protocol.UsageError(message, details=_validation_details(exc)) from None


def _require_document_in_tree(file: Path, into: Path | None, filename: str) -> None:
    """Refuse a relative path that climbs out of the ledger tree, as `check` would.

    Beancount resolves a document path against the directory of the file that
    holds it, and `check` refuses one that lands outside the root ledger's
    directory; checking only for an absolute path let `../elsewhere.pdf` write
    a ledger the very next `check` failed.
    """
    root = Path(os.path.abspath(file)).parent
    holder = root if into is None else write.destination(file, into).parent
    if outside_ledger_tree(holder / filename, root):
        raise protocol.UsageError(
            f"Document path {filename!r} resolves outside the ledger directory {root.resolve()}, which "
            "`bea check` refuses because copies of the ledger would lose it. Move the file under the "
            "ledger directory and pass a relative --path."
        )


_HEADER_ERROR = (
    "Invalid transaction header (--tag, --link, --flag, --payee, --narration, or --meta). Nothing was written."
)
_OPTION_NAMES = {"tags": "--tag", "links": "--link", "flag": "--flag", "currencies": "--currency", "values": "--value"}


def _validation_details(exc: Any) -> list[str]:
    """One `--option: reason` line per refused field."""
    details = []
    for error in exc.errors(include_url=False, include_input=False):
        field = str(error["loc"][0]) if error["loc"] else ""
        option = _OPTION_NAMES.get(field, f"--{field.replace('_', '-')}" if field else "input")
        details.append(f"{option}: {str(error['msg']).removeprefix('Value error, ')}")
    return details


# --------------------------------------------------------------------------- #
# The nine directives that are just their own fields
# --------------------------------------------------------------------------- #


def _simple(directive_type: str, request: dict[str, Any]) -> Any:
    from bea_engine.ledger.models import (
        WRITE_INPUT,
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
        booking = request.get("booking")
        if booking is not None:
            booking = str(booking).strip().upper() or None
        raw_currencies = list(request.get("currencies") or [])
        currencies = [str(item).strip() for item in raw_currencies if str(item).strip()]
        if raw_currencies and not currencies:
            raise protocol.UsageError(
                "Every --currency value is blank after trimming; supply a currency symbol or omit -c."
            )
        return OpenDirective.model_validate(
            {
                "date": date,
                "account": parse_account(_text(request, "account")),
                "currencies": currencies,
                "booking": booking,
            },
            context=WRITE_INPUT,
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
            comment=single_line(_text(request, "comment")),
        )
    if directive_type == "event":
        return EventDirective(
            date=date,
            type=single_line(_text(request, "type")),
            description=single_line(_text(request, "description")),
        )
    if directive_type == "commodity":
        return CommodityDirective.model_validate(
            {
                "date": date,
                "currency": _text(request, "currency"),
                "meta": _parse_metadata([str(item) for item in request.get("meta") or []]),
            },
            context=WRITE_INPUT,
        )
    if directive_type == "document":
        filename = _text(request, "filename")
        if Path(filename).is_absolute():
            raise protocol.UsageError(
                f"Document path {filename!r} must be relative to the destination ledger file's "
                "directory so copies of the ledger stay portable. Pass a relative --path."
            )
        return DocumentDirective.model_validate(
            {
                "date": date,
                "account": parse_account(_text(request, "account")),
                "filename": filename,
                "tags": list(request.get("tags") or []),
                "links": list(request.get("links") or []),
            },
            context=WRITE_INPUT,
        )
    values = list(request.get("values") or [])
    if not values:
        raise protocol.UsageError(
            "Custom directives need at least one value "
            "(for example --value 'text:x'). An empty custom breaks Beancount's pad plugin."
        )
    for value in values:
        # Only this side knows what a valid account is, so an account-typed
        # custom value is checked here rather than where it was typed.
        if isinstance(value, dict) and value.get("kind") == "account":
            parse_account(str(value.get("value", "")))
        if isinstance(value, dict) and value.get("kind") == "text" and isinstance(value.get("value"), str):
            value["value"] = single_line(value["value"])
    return CustomDirective.model_validate(
        {"date": date, "type": single_line(_text(request, "type")), "values": values}, context=WRITE_INPUT
    )


def _appended(file: Path, directive: Any, *, allow_errors: bool, into: Path | None) -> dict[str, Any]:
    """Append one model-shaped directive; which writer to call follows from its type."""
    from bea_engine.ledger.reader import metadata_to_json

    name = type(directive).__name__.removesuffix("Directive").lower()
    warnings = getattr(writer, f"write_{name}")(file, directive, allow_errors=allow_errors, into=into)
    written = directive.model_dump(mode="json")
    # Metadata holds Beancount values, and a plain JSON dump would flatten a
    # number or a date into text. Answer with the tagged shape the rest of the
    # CLI reads and writes, so what comes back can be sent again unchanged.
    if getattr(directive, "meta", None):
        written["meta"] = metadata_to_json(directive.meta)
    return {
        "written": 1,
        "directive": written,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


# --------------------------------------------------------------------------- #
# balance, with or without an explicit pad
# --------------------------------------------------------------------------- #


def _balance(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    from beancount.core.data import Balance

    from bea_engine import managed_load
    from bea_engine.ledger.models import Amount, BalanceDirective
    from bea_engine.query import format_error

    date = _date(request)
    number, currency, tolerance = _parse_balance_amount(_text(request, "amount"))
    account = parse_account(_text(request, "account"))
    directive = BalanceDirective(
        date=date, account=account, amount=Amount(number=number, currency=currency), tolerance=tolerance
    )
    pad_from = request.get("pad_from")
    if pad_from is None:
        snapshot = write.LedgerSnapshot.capture(file)
        target = write.destination(file, into)
        snapshot.require_target(target)
        entries, errors, _ = managed_load.load_file(file, snapshot=snapshot)
        ledger_errors = [format_error(error, ledger_file=file) for error in errors]
        if ledger_errors and strict_read and not all("Unused Pad" in error for error in ledger_errors):
            # A staged pad is the transient error this very write resolves:
            # the two-step pad flow stages with --allow-errors, then completes
            # with the balance. Anything else still gates strict callers.
            raise protocol.LedgerError(
                f"Ledger has {len(ledger_errors)} error(s). Pass --allow-errors to report anyway.",
                details=ledger_errors,
            )
        match = _balance_match(entries, date, account, number, currency, tolerance)
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
        conflict = _balance_conflict(entries, date, account, number, currency, tolerance)
        if conflict is not None and not request.get("force"):
            where = conflict.meta.get("filename"), conflict.meta.get("lineno")
            raise protocol.UsageError(
                f"{account} already has a {date.isoformat()} balance of "
                f"{_balance_amount(conflict.amount.number, currency, conflict.tolerance)} "
                f"(at {where[0]}:{where[1]}); refusing {_balance_amount(number, currency, tolerance)}. "
                "Pass --force to record another assertion."
            )
        return _appended(file, directive, allow_errors=allow_errors, into=into)

    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Pad

    padded = _date(request, "pad_date")
    entries = [
        Pad({}, padded, account, parse_account(str(pad_from))),
        Balance({}, date, account, BcAmount(number, currency), tolerance, None),
    ]
    try:
        warnings = write.append(file, [writer.format_entry(e) for e in entries], allow_errors=allow_errors, into=into)
    except protocol.LedgerError as exc:
        # The only failure worth a retry is a pad Beancount reports unused;
        # anything else stands. Why it went unused decides what happens next.
        if allow_errors or not _unused_pad_only(exc):
            raise
        source_account = parse_account(str(pad_from))
        loaded, before_errors, options = managed_load.load_file(file)
        staged = [
            f"{format_error(error, ledger_file=file)} "
            f"({error.entry.date} pad {error.entry.account} {error.entry.source_account})"
            for error in before_errors
            if "Unused Pad" in getattr(error, "message", "") and isinstance(error.entry, Pad)
        ]
        if staged:
            # A pad already waiting for its balance is the failure, not this
            # write; retrying without the new pad only blamed the assertion.
            raise protocol.LedgerError(
                "The ledger has a staged pad still waiting for its balance assertion; nothing was written. "
                "Complete that pair (add its balance without --pad-from) or remove the pad, then retry.",
                details=staged,
            ) from exc
        match = _balance_match(loaded, date, account, number, currency, tolerance)
        if match is not None:
            source = {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
            return {
                "written": 0,
                "directive": directive.model_dump(mode="json"),
                "warnings": [
                    f"Book balance already matches {number} {currency}; omitted the pad from "
                    f"--pad-from (assertion already recorded at {source['filename']}:{source['lineno']})."
                ],
                "duplicate": True,
                "source": source,
                "target": str(write.destination(file, into)),
            }
        difference = number - _book_units(loaded, account, currency, date)
        if abs(difference) <= _balance_tolerance(entries[1], options):
            result = _appended(file, directive, allow_errors=allow_errors, into=into)
            warnings = list(result.get("warnings") or [])
            warnings.append(
                f"Book balance already matches {number} {currency}; omitted the pad from "
                "--pad-from and wrote the assertion alone."
            )
            result["warnings"] = warnings
            return result
        # The book does not match, so the new pad went unused because an
        # existing pad fills this assertion instead (Beancount pads every
        # currency of the next assertion after the latest pad).
        cover = _covering_pad(loaded, account, date)
        if cover is None:
            raise
        pad_at = f"{cover.meta.get('filename')}:{cover.meta.get('lineno')}"
        if cover.source_account != source_account:
            raise protocol.LedgerError(
                f"The existing pad at {pad_at} ({cover.date} from {cover.source_account}) already fills this "
                f"assertion, so a pad from {source_account} would go unused; nothing was written.",
                details=[
                    f"Add the balance without --pad-from to let that pad insert {difference} {currency} "
                    f"from {cover.source_account}, or edit that pad first."
                ],
            ) from exc
        result = _appended(file, directive, allow_errors=allow_errors, into=into)
        warnings = list(result.get("warnings") or [])
        warnings.append(
            f"The existing pad at {pad_at} ({cover.date} from {cover.source_account}) fills this assertion, "
            f"inserting {difference} {currency}; omitted the pad from --pad-from and wrote the assertion alone."
        )
        result["warnings"] = warnings
        return result
    return {
        "written": 2,
        "directives": entries,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


def _balance_match(
    entries: list[Any], date: Any, account: str, number: Decimal, currency: str, tolerance: Decimal | None
) -> Any | None:
    """An identical balance assertion already in the ledger, or None."""
    from beancount.core.data import Balance

    return next(
        (
            entry
            for entry in entries
            if isinstance(entry, Balance)
            and entry.date == date
            and entry.account == account
            and entry.amount.currency == currency
            and _same_assertion(entry, number, tolerance)
        ),
        None,
    )


def _balance_conflict(
    entries: list[Any], date: Any, account: str, number: Decimal, currency: str, tolerance: Decimal | None
) -> Any | None:
    """A same-key assertion with a different value, or None."""
    from beancount.core.data import Balance

    return next(
        (
            entry
            for entry in entries
            if isinstance(entry, Balance)
            and entry.date == date
            and entry.account == account
            and entry.amount.currency == currency
            and not _same_assertion(entry, number, tolerance)
        ),
        None,
    )


def _same_assertion(entry: Any, number: Decimal, tolerance: Decimal | None) -> bool:
    """Whether an existing balance asserts exactly what `number`/`tolerance` would.

    Without an explicit tolerance Beancount infers one from the number's
    precision, so `10.3 USD` (within 0.05) and `10.30 USD` (within 0.005) are
    different assertions even though the Decimals compare equal.
    """
    if entry.amount.number != number or entry.tolerance != tolerance:
        return False
    return tolerance is not None or entry.amount.number.as_tuple().exponent == number.as_tuple().exponent


def _balance_amount(number: Decimal, currency: str, tolerance: Decimal | None) -> str:
    """A balance amount as the user typed it, tolerance included."""
    return f"{number} {currency}" if tolerance is None else f"{number} ~ {tolerance} {currency}"


def _book_units(entries: list[Any], account: str, currency: str, date: datetime.date) -> Decimal:
    """Units of `currency` in `account` and its children when a `date` assertion runs.

    Assertions run at the start of the day, so only earlier postings count —
    including the padding Beancount already inserted for earlier pads.
    """
    from beancount.core.data import Transaction

    prefix = f"{account}:"
    return sum(
        (
            posting.units.number
            for entry in entries
            if isinstance(entry, Transaction) and entry.date < date
            for posting in entry.postings
            if (posting.account == account or posting.account.startswith(prefix))
            and posting.units is not None
            and posting.units.currency == currency
            and posting.units.number is not None
        ),
        Decimal(0),
    )


def _balance_tolerance(balance: Any, options: dict[str, Any]) -> Decimal:
    from beancount.ops.balance import get_balance_tolerance

    tolerance: Decimal = get_balance_tolerance(balance, options)  # type: ignore[no-untyped-call]
    return tolerance


def _covering_pad(entries: list[Any], account: str, date: datetime.date) -> Any | None:
    """The pad Beancount would apply to an assertion on `account` at `date`: the latest before it."""
    from beancount.core.data import Pad

    return next(
        (
            entry
            for entry in reversed(entries)
            if isinstance(entry, Pad) and entry.account == account and entry.date < date
        ),
        None,
    )


def _unused_pad_only(exc: protocol.LedgerError) -> bool:
    details = list(exc.details or [])
    return bool(details) and all("Unused Pad" in detail for detail in details)


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
    """Append a price, or report the ledger-authored directive already recording it.

    Repeating a local quote is a no-op with its source location. A managed
    quote can be pinned or overridden in the ledger without forcing a conflict.
    """
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Price

    from bea_engine import managed_load
    from bea_engine.ledger.models import WRITE_INPUT, PriceDirective
    from bea_engine.ledger.reader import entry_generated
    from bea_engine.managed_price_cache import managed_source_for_path
    from bea_engine.query import format_error

    currency = _text(request, "currency")
    number = _decimal(request, "number")
    amount_currency = _text(request, "amount_currency")
    directive = PriceDirective.model_validate(
        {"date": _date(request), "currency": currency, "amount": {"number": number, "currency": amount_currency}},
        context=WRITE_INPUT,
    )
    snapshot = write.LedgerSnapshot.capture(file)
    target = write.destination(file, into)
    snapshot.require_target(target)
    entries, errors, _ = managed_load.load_file(file, snapshot=snapshot)
    ledger_errors = [format_error(error, ledger_file=file) for error in errors]
    if ledger_errors and strict_read:
        raise protocol.LedgerError(
            f"Ledger has {len(ledger_errors)} error(s). Pass --allow-errors to report anyway.", details=ledger_errors
        )
    local_prices: list[Price] = []
    managed_sources: set[str] = set()
    pair = (currency, amount_currency)
    shadowed_pairs = {pair, (amount_currency, currency)}
    for entry in entries:
        if not isinstance(entry, Price) or entry.date != directive.date:
            continue
        entry_pair = (entry.currency, entry.amount.currency)
        if entry_pair not in shadowed_pairs:
            continue
        filename = entry.meta.get("filename")
        managed_source = managed_source_for_path(Path(filename)) if isinstance(filename, str) and filename else None
        if managed_source is not None:
            managed_sources.add(managed_source)
        elif entry_pair == pair and not entry_generated(entry, "price"):
            # A plugin-made price (implicit_prices) borrows its transaction's
            # location; it is no ledger-authored quote to match or conflict with.
            local_prices.append(entry)

    match = next((entry for entry in local_prices if entry.amount.number == number), None)
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
    conflict = next((entry for entry in local_prices if entry.amount.number != number), None)
    if conflict is not None and not request.get("force"):
        where = conflict.meta.get("filename"), conflict.meta.get("lineno")
        raise protocol.UsageError(
            f"{currency} already has a {directive.date.isoformat()} price of "
            f"{conflict.amount.number} {amount_currency} (at {where[0]}:{where[1]}); "
            f"refusing {number} {amount_currency}. Pass --force to record another quote."
        )

    entry = Price({}, directive.date, currency, BcAmount(number, amount_currency))
    warnings = write.append(file, [writer.format_entry(entry)], allow_errors=allow_errors, into=into, snapshot=snapshot)
    warnings.extend(f"Ledger price shadows the managed quote from {source}." for source in sorted(managed_sources))
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
    from beancount.core.data import Open, Transaction
    from beancount.core.number import MISSING
    from beancount.parser import parser
    from beancount.parser.grammar import ParserError

    from bea_engine import managed_load
    from bea_engine.ledger.models import WRITE_INPUT, TransactionHeader
    from bea_engine.ledger.reader import metadata_to_json

    postings: list[str] = [str(posting) for posting in request.get("postings") or []]
    for posting_text in postings:
        parts = posting_text.split()
        # Native posting flags are single characters; accounts never are.
        if parts and len(parts[0]) == 1:
            parts = parts[1:]
        parse_account(parts[0] if parts else "")
    header = TransactionHeader.model_validate(
        {
            "date": _date(request),
            "flag": str(request.get("flag") or "*"),
            "payee": request.get("payee"),
            "narration": request.get("narration"),
            "postings": [],
            "tags": list(request.get("tags") or []),
            "links": list(request.get("links") or []),
            "meta": _parse_metadata([str(item) for item in request.get("meta") or []]),
        },
        context=WRITE_INPUT,
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
        if details and all(detail.startswith("Transaction options:") for detail in details):
            message = _HEADER_ERROR
        else:
            message = (
                "Invalid transaction options; use postings such as 'Assets:Checking -30 USD'. Nothing was written."
            )
        raise protocol.UsageError(message, details=details)
    entry = entries[0]
    # The ledger loads NFC-normalized; the parsed postings must match it before
    # currency inference compares them against the opened accounts below.
    entry = entry._replace(postings=[posting._replace(account=_nfc(posting.account)) for posting in entry.postings])
    snapshot = None
    currencies: list[str] = []
    allowed: dict[str, list[str] | None] = {}
    raw_postings: Any = entry.postings
    if any(p.units is not MISSING and p.units.currency is MISSING for p in raw_postings):
        snapshot = write.LedgerSnapshot.capture(file)
        existing, _, options = managed_load.load_file(file)
        currencies = options["operating_currency"]
        allowed = {e.account: e.currencies for e in existing if isinstance(e, Open)}
    normalized = []
    elided = 0
    for number, posting in enumerate(entry.postings, start=1):
        _refuse_missing_price(postings, number, posting)
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
        # Parsed postings keep the input order, so the raw line with the `@@`
        # spelling sits at the same index; incomplete prices raised above.
        meta: dict[str, Any] = {}
        if number <= len(postings):
            total = _total_price(postings[number - 1])
            if total is not None:
                meta[writer.TOTAL_PRICE_META] = total
        normalized.append(posting._replace(units=units, meta=meta))
    if elided > 1:
        raise protocol.UsageError("Only one posting may omit its amount; supply amounts for the other postings.")
    if elided == 1 and _inferred_leg_is_zero(normalized):
        raise protocol.UsageError(f"{_ZERO_NET_INFERRED} Nothing was written.")
    entry = entry._replace(postings=normalized, meta=write.metadata_for_write(entry.meta))
    rendered = writer.format_entry(entry)
    totals = [(posting.meta or {}).get(writer.TOTAL_PRICE_META) for posting in entry.postings]
    # The `@@` stash served the render; the JSON answer must not carry it.
    # Normalized posting metas hold nothing else, so they go back to empty.
    entry = entry._replace(postings=[posting._replace(meta={}) for posting in entry.postings])
    # Encode the answer before the write, never after: the envelope is built
    # once this function returns, and a value it could not encode used to fail
    # with the directive already appended, so every retry appended another copy.
    directive = protocol.jsonable(entry._replace(meta=metadata_to_json(entry.meta)))
    # A `@@` total is reported as the bulk schema's `price_total`, not as the
    # divided unit price, so feeding the answer back writes the same `@@`.
    for posting, total in zip(directive["postings"], totals, strict=True):
        posting["price_total"] = None if total is None else protocol.jsonable(total)
        if total is not None:
            posting["price"] = None
    warnings = write.append(file, [rendered], allow_errors=allow_errors, into=into, snapshot=snapshot)
    return {
        "written": 1,
        "directive": directive,
        "entry": rendered,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


_ZERO_NET_INFERRED = (
    "Refusing a zero-net transaction with an inferred balancing posting; "
    "Beancount drops that leg from list/query. Supply an explicit amount "
    "(for example 'Assets:Cash 0 USD') or use nonzero postings."
)


def _directive_infers_zero(directive: Any) -> bool:
    """`_inferred_leg_is_zero` for a bulk row, which arrives as a model.

    The row is judged on the text it would be written as, parsed the way the
    ledger will read it; a `price_total` rides along as the exact `@@` total.
    """
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Transaction
    from beancount.parser import parser

    if sum(1 for posting in directive.postings if posting.units is None) != 1:
        return False
    entries, errors, _ = parser.parse_string(writer.format_transaction(directive))
    if errors or len(entries) != 1 or not isinstance(entries[0], Transaction):
        return False  # Ledger validation reports what is wrong with it.
    parsed = []
    if len(entries[0].postings) != len(directive.postings):
        return False
    for posting, source in zip(entries[0].postings, directive.postings, strict=True):
        total = source.price_total
        meta = {writer.TOTAL_PRICE_META: BcAmount(total.number, total.currency)} if total else {}
        parsed.append(posting._replace(meta=meta))
    return _inferred_leg_is_zero(parsed)


def _inferred_leg_is_zero(postings: list[Any]) -> bool:
    """Whether the one amount-less posting would be inferred as zero.

    Beancount balances a transaction by *weight* — a posting's cost when it
    has one, else its price, else its units — and an inferred leg of zero
    weight is dropped on read. Summing raw units instead cancelled a sale
    against a repurchase (`-1 HOOL {50 USD} @ 60 USD`, `1 HOOL {60 USD}`)
    whose weights leave a 10 USD gain to infer.

    A weight that is only known after booking — an empty `{}` reducing an
    existing lot — makes the answer unknowable here, so the guard stands
    aside and ordinary ledger validation decides.
    """
    from collections import defaultdict

    from beancount.core.number import MISSING

    weights: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
    for posting in postings:
        units = posting.units
        if units is MISSING or units.number is MISSING:
            continue
        cost, price = posting.cost, posting.price
        if cost is not None:
            per = None if cost.number_per is MISSING else cost.number_per
            if cost.currency is MISSING or (per is None and cost.number_total is None):
                return False
            weight = units.number * (per or 0)
            if cost.number_total is not None:
                weight += cost.number_total.copy_sign(units.number)
            weights[cost.currency] += weight
        elif price is not None:
            total = posting.meta.get(writer.TOTAL_PRICE_META) if posting.meta else None
            if total is not None:
                weights[total.currency] += total.number.copy_sign(units.number)
            else:
                weights[price.currency] += units.number * price.number
        else:
            weights[units.currency] += units.number
    return bool(weights) and all(weight == 0 for weight in weights.values())


def _total_price(posting_text: str) -> Any | None:
    """The `@@` total from a raw posting line, or None without one.

    The parser has already validated the line, so a total that cannot be
    read here means the split misread the text — never a user error — and
    the posting falls back to its parsed unit price. The rendered candidate
    is fully revalidated before anything is written, so a misread could only
    ever refuse a valid line, never corrupt one.
    """
    from beancount.core.amount import Amount as BcAmount

    from bea_engine.amounts import split_total_price

    total = split_total_price(posting_text)
    if total is None:
        return None
    return BcAmount(Decimal(total[0]), total[1])


def _refuse_missing_price(postings: list[str], number: int, posting: Any) -> None:
    """A bare `@` or `@@` names its missing part and the accepted syntax.

    The parser accepts an incomplete price and marks the absent part with the
    MISSING sentinel, which the writer would otherwise stringify into the
    ledger text as `<class 'beancount.core.number.MISSING'>` — so the mistake
    is refused here, before anything is rendered or written. Incomplete costs
    need no such guard: the printer renders a partial `{…}` back verbatim and
    the loader reports the booking failure readably.
    """
    from beancount.core.number import MISSING

    from bea_engine import protocol

    price = posting.price
    number_missing = price is MISSING or getattr(price, "number", None) is MISSING
    currency_missing = price is MISSING or getattr(price, "currency", None) is MISSING
    if not (number_missing or currency_missing):
        return
    text = postings[number - 1] if 0 < number <= len(postings) else ""
    marker = "@@" if "@@" in text else "@"
    total = "total " if marker == "@@" else ""
    if number_missing and currency_missing:
        need = f"the {total}price after {marker} is missing"
    elif number_missing:
        need = f"the {total}price after {marker} needs a number"
    else:
        need = f"the {total}price after {marker} needs a currency"
    example = f"'{posting.account} 10 HOOL {marker} 5.00 USD'"
    raise protocol.UsageError(f"--posting {number}: {need}: write {example}. Nothing was written.")


def _nfc(text: str) -> str:
    """One spelling for canonically equivalent input, matching the loaded ledger."""
    return unicodedata.normalize("NFC", text)


def _parse_metadata(items: list[str]) -> dict[str, Any]:
    """`key:value` pairs, with native typed values read by Beancount's own parser."""
    from beancount.core.data import Transaction
    from beancount.parser import parser

    metadata: dict[str, Any] = {}
    for item in items:
        key, separator, raw = item.partition(":")
        key, raw = key.strip(), single_line(raw).strip()
        if not separator:
            raise protocol.UsageError(
                "Each --meta must be 'key:value', such as 'receipt:IMG_1234.jpg'; use '\"\"' for empty text."
            )
        if not re.fullmatch(r"[a-z][A-Za-z0-9_-]*", key):
            raise protocol.UsageError(
                f"Invalid --meta key {key!r}; keys must match [a-z][A-Za-z0-9_-]* (start with a lowercase letter)."
            )
        if key in {"filename", "lineno"}:
            raise protocol.UsageError(
                f"Metadata key {key!r} is reserved for Beancount source location; choose another key."
            )
        if not raw:
            raise protocol.UsageError(
                "Each --meta must be 'key:value', such as 'receipt:IMG_1234.jpg'; use '\"\"' for empty text."
            )
        if len(key) < 2:
            raise protocol.UsageError(
                f"Invalid --meta key {key!r}; Beancount metadata keys need at least two characters "
                f"(for example 'id:3' or 'n{key}:3')."
            )
        if key in metadata:
            raise protocol.UsageError(f"Metadata key {key!r} was supplied more than once; use one --meta per key.")
        # Beancount booleans are TRUE/FALSE; accept the usual spellings so
        # `--meta cleared:true` matches bulk JSON bool meta instead of quoting.
        parsed_raw = raw.upper() if raw.lower() in {"true", "false"} else raw
        entries, errors, _ = parser.parse_string(f'2000-01-01 * ""\n  {key}: {parsed_raw}\n')
        if not errors and len(entries) == 1 and isinstance(entries[0], Transaction) and key in entries[0].meta:
            metadata[key] = entries[0].meta[key]
        elif raw.startswith('"'):
            raise protocol.UsageError(
                f"Invalid --meta {key!r}; close the quoted string or supply a bare value such as '{key}:hello'.",
                details=[str(error.message) for error in errors],
            )
        elif errors and any(f"{key}:" in str(error.message) for error in errors):
            raise protocol.UsageError(
                f"Invalid --meta key {key!r}; Beancount rejected it ({errors[0].message}).",
                details=[str(error.message) for error in errors],
            )
        elif re.fullmatch(r"[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}", raw):
            # Beancount's date grammar: a slash or unpadded spelling of an
            # impossible day used to fall through and be stored as text.
            raise protocol.UsageError(
                f"Invalid --meta date for {key!r}: {raw!r} is not a valid calendar date. "
                "Use YYYY-MM-DD (for example 2020-01-15). Nothing was written."
            )
        else:
            metadata[key] = raw
    return metadata


# --------------------------------------------------------------------------- #
# transactions — a batch that is validated whole before anything is written
# --------------------------------------------------------------------------- #


_TAGGED_META_KEYS = {
    "number": {"kind", "value"},
    "date": {"kind", "value"},
    "amount": {"kind", "number", "currency"},
}

_META_VALUE_HELP = (
    'use text, a boolean, a number, or a tagged object such as {"kind":"number","value":"1.25"}, '
    '{"kind":"date","value":"2026-08-03"} or {"kind":"amount","number":"5.25","currency":"USD"}.'
)


def _bulk_meta_problems(location: str, meta: dict[str, Any]) -> list[str]:
    """Each bulk metadata value Beancount cannot write as asked, as `location.key: reason`.

    Write input only — listings convert loaded metadata without this check.
    Reserved source-location keys used to be dropped silently, and a value the
    printer cannot render (an array) escaped per-row handling, aborting the
    whole batch with no row number even under `--partial`.
    """
    problems = []
    for key, value in meta.items():
        path = f"{location}.{key}"
        if key in {"filename", "lineno"}:
            problems.append(
                f"{path}: Metadata key {key!r} is reserved for Beancount source location; choose another key."
            )
            continue
        if isinstance(value, dict):
            kind = value.get("kind")
            expected = _TAGGED_META_KEYS.get(kind) if isinstance(kind, str) else None
            if expected is None:
                problems.append(f"{path}: Unsupported metadata value; {_META_VALUE_HELP}")
                continue
            if set(value) != expected:
                keys = ", ".join(sorted(expected))
                problems.append(f"{path}: A {kind!r} metadata object takes exactly the keys {keys}.")
                continue
            number = value.get("value" if kind == "number" else "number")
            if kind != "date" and isinstance(number, str):
                # Amounts' spelling rule: `Decimal()` alone reads `1_000`, `1e3`
                # and non-ASCII digits that no other write path accepts.
                try:
                    parse_decimal_number(number)
                except ValueError:
                    problems.append(
                        f"{path}: Invalid {kind!r} metadata for {key!r}: expected a decimal string with "
                        f"ASCII digits and no exponent or underscores, such as '1.25'; got {number!r}."
                    )
                    continue
        elif value is not None and not isinstance(value, str | bool | int | float):
            problems.append(f"{path}: Unsupported metadata value of type {type(value).__name__}; {_META_VALUE_HELP}")
            continue
        try:
            write.metadata_for_write({key: value})
        except protocol.LedgerError as exc:
            problems.append(f"{path}: {exc}")
    return problems


def _transactions(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    del strict_read
    from pydantic import ValidationError

    from bea_engine.ledger.models import WRITE_INPUT, TransactionDirective

    rows = list(request.get("rows") or [])
    partial = bool(request.get("partial"))

    valid: list[tuple[int, Any]] = []
    rejected: list[str] = []
    rejected_rows: list[int] = []
    for index, item in enumerate(rows):
        try:
            directive = TransactionDirective.model_validate(item, context=WRITE_INPUT)
        except ValidationError as exc:
            for error in exc.errors(include_url=False, include_input=False):
                location = ".".join(str(part) for part in error["loc"]) or "transaction"
                rejected.append(f"Row {index + 1}, {location}: {error['msg']}")
            rejected_rows.append(index)
            continue
        # Typed metadata is only converted when rendered; check it here so a
        # bad value (such as a JSON float) is refused per row, not mid-batch.
        meta_errors: list[str] = []
        for location, meta in [
            ("meta", directive.meta),
            *((f"postings.{n}.meta", p.meta) for n, p in enumerate(directive.postings)),
        ]:
            meta_errors.extend(f"Row {index + 1}, {problem}" for problem in _bulk_meta_problems(location, meta))
        if not meta_errors:
            # Every later step renders the row; a failure there would abort
            # the whole batch and ignore --partial, so it is judged here.
            try:
                writer.format_transaction(directive)
            except (protocol.LedgerError, ValueError, TypeError) as exc:
                meta_errors.append(f"Row {index + 1}: {exc}")
        if meta_errors:
            rejected.extend(meta_errors)
            rejected_rows.append(index)
        else:
            valid.append((index, directive))

    if rejected:
        rejected.append(
            'Example posting: {"account":"Assets:Checking","amount":"-30 USD"}. '
            "Use bea add transactions --help for a complete row."
        )

    # The single add's lost-leg refusal holds for every row too: a zero
    # inferred posting would be written, then dropped by every read.
    kept: list[tuple[int, Any]] = []
    for index, directive in valid:
        if _directive_infers_zero(directive):
            rejected.append(f"Row {index + 1}: {_ZERO_NET_INFERRED}")
            rejected_rows.append(index)
        else:
            kept.append((index, directive))
    valid = kept

    if rejected and not partial:
        # `--partial` only helps when some row passed; with none, the advice
        # would cost a round trip that writes nothing.
        remedy = (
            f"Fix them, or pass --partial to try appending schema-valid rows "
            f"(ledger validation may still reject some of the {len(valid)})."
            if valid
            else "Fix them and retry."
        )
        raise protocol.LedgerError(
            f"{len(rejected_rows)} of {len(rows)} row(s) failed validation; nothing was written. {remedy}",
            details=rejected,
            result={"written": 0, "written_rows": [], "rejected_rows": rejected_rows},
        )

    # Validate the entire batch first: an earlier sale may depend on a buy that
    # appears later in the input. Only partial recovery needs sequential trials.
    batch_texts = [writer.format_transaction(d) for _, d in valid]
    try:
        write.validate_append(file, batch_texts, allow_errors=allow_errors, into=into)
    except protocol.LedgerError as batch_error:
        if not partial:
            message = str(batch_error)
            recoverable = _recoverable_rows(file, valid, batch_texts, batch_error, allow_errors=allow_errors, into=into)
            if recoverable:
                noun = "row" if len(recoverable) == 1 else "rows"
                message = f"{message} Pass --partial to append the {len(recoverable)} valid {noun}."
            elif recoverable is None and len(valid) > 1:
                message = f"{message} Pass --partial to append the rows that validate."
            raise protocol.LedgerError(
                message,
                details=list(batch_error.details),
                result={
                    "written": 0,
                    "written_rows": [],
                    "unwritten_rows": [index for index, _ in valid],
                },
            ) from batch_error
        accepted: list[tuple[int, Any]] = []
        texts: list[str] = []
        for index, directive in valid:
            try:
                text = writer.format_transaction(directive)
                write.validate_append(file, [*texts, text], allow_errors=allow_errors, into=into)
            except protocol.LedgerError as err:
                # Human labels count from 1, like the schema rejections above;
                # `rejected_rows` stays a zero-based index for scripts.
                rejected.append(f"Row {index + 1}: {'; '.join(err.details) or str(err)}")
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


def _recoverable_rows(
    file: Path,
    valid: list[tuple[int, Any]],
    texts: list[str],
    batch_error: protocol.LedgerError,
    *,
    allow_errors: bool,
    into: Path | None,
) -> list[int] | None:
    """The rows `--partial` could append, from the refused batch's own errors.

    Probing row by row cost a full ledger load per row — over a minute for a
    dozen rows on a large ledger — just to word a hint. Instead the batch
    error's line numbers are mapped back to the appended rows, and the rest
    are confirmed with one more load. None means the errors could not be
    attributed to rows (or the rest still fail), so no count is promised.
    """
    rows = _rows_with_errors(file, texts, batch_error, into=into)
    if rows is None:
        return None
    kept = [(valid[number][0], text) for number, text in enumerate(texts) if number not in rows]
    if not kept:
        return []
    try:
        write.validate_append(file, [text for _, text in kept], allow_errors=allow_errors, into=into)
    except protocol.LedgerError:
        return None
    return [index for index, _ in kept]


def _rows_with_errors(
    file: Path, texts: list[str], batch_error: protocol.LedgerError, *, into: Path | None
) -> set[int] | None:
    """Positions in `texts` whose appended lines carry an error, or None when one cannot be placed."""
    locations = getattr(batch_error, "locations", None)
    if not locations:
        return None
    target = write.destination(file, into)
    try:
        original = target.read_bytes() if target.exists() else b""
        content = write.appended_content(original, texts)
    except (OSError, UnicodeDecodeError):
        return None
    # Blocks are appended one after another, each after one separating line;
    # walking back from the end gives every block's line span.
    spans: list[tuple[int, int]] = []
    end = content.count("\n")
    for text in reversed(texts):
        size = text.rstrip().count("\n") + 1  # the lexer's line count: `\n` only (w1/136)
        spans.append((end - size + 1, end))
        end -= size + 1
    spans.reverse()
    rows: set[int] = set()
    for source, lineno in locations:
        if lineno is None or Path(source).resolve() != target:
            return None
        hits = [number for number, (first, last) in enumerate(spans) if first <= lineno <= last]
        if not hits:
            return None
        rows.add(hits[0])
    return rows


# --------------------------------------------------------------------------- #
# request field access — a bad request is a usage failure, not a traceback
# --------------------------------------------------------------------------- #


def _text(request: dict[str, Any], field: str) -> str:
    value = request.get(field)
    if not isinstance(value, str):
        raise protocol.UsageError(f"The request is missing its {field!r}.")
    if not value.strip():
        raise protocol.UsageError(f"Request field {field!r} must be a non-empty string.")
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
