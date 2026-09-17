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
import unicodedata
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
        booking = request.get("booking")
        if booking is not None:
            booking = str(booking).strip().upper() or None
        raw_currencies = list(request.get("currencies") or [])
        currencies = [str(item).strip() for item in raw_currencies if str(item).strip()]
        if raw_currencies and not currencies:
            raise protocol.UsageError(
                "Every --currency value is blank after trimming; supply a currency symbol or omit -c."
            )
        return OpenDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            currencies=currencies,
            booking=booking,
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
        return CommodityDirective(
            date=date,
            currency=_text(request, "currency"),
            meta=_parse_metadata([str(item) for item in request.get("meta") or []]),
        )
    if directive_type == "document":
        filename = _text(request, "filename")
        if Path(filename).is_absolute():
            raise protocol.UsageError(
                f"Document path {filename!r} must be relative to the destination ledger file's "
                "directory so copies of the ledger stay portable. Pass a relative --path."
            )
        return DocumentDirective(
            date=date,
            account=parse_account(_text(request, "account")),
            filename=filename,
            tags=list(request.get("tags") or []),
            links=list(request.get("links") or []),
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
    return CustomDirective.model_validate({"date": date, "type": single_line(_text(request, "type")), "values": values})


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

    account = parse_account(_text(request, "account"))
    padded = _date(request, "pad_date")
    entries = [
        Pad({}, padded, account, parse_account(str(pad_from))),
        Balance({}, date, account, BcAmount(number, currency), tolerance, None),
    ]
    try:
        warnings = write.append(file, [writer.format_entry(e) for e in entries], allow_errors=allow_errors, into=into)
    except protocol.LedgerError as exc:
        # A zero residual makes Beancount reject the pad as unused. The atomic
        # --pad-from path still wants the assertion; write that alone.
        if allow_errors or not _unused_pad_only(exc):
            raise
        result = _appended(
            file,
            BalanceDirective(
                date=date,
                account=account,
                amount=Amount(number=number, currency=currency),
                tolerance=tolerance,
            ),
            allow_errors=allow_errors,
            into=into,
        )
        warnings = list(result.get("warnings") or [])
        warnings.append(
            f"Book balance already matches {number} {currency}; omitted the pad from "
            "--pad-from and wrote the assertion alone."
        )
        result["warnings"] = warnings
        return result
    return {
        "written": 2,
        "directives": entries,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


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
    ledger_errors = [format_error(error, ledger_file=file) for error in errors]
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

    from bea_engine.ledger.models import TransactionHeader
    from bea_engine.ledger.reader import metadata_to_json

    postings: list[str] = [str(posting) for posting in request.get("postings") or []]
    for posting_text in postings:
        parts = posting_text.split()
        # Native posting flags are single characters; accounts never are.
        if parts and len(parts[0]) == 1:
            parts = parts[1:]
        parse_account(parts[0] if parts else "")
    header = TransactionHeader(
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
        if details and all(detail.startswith("Transaction options:") for detail in details):
            message = (
                "Invalid transaction header (--tag, --link, --flag, --payee, --narration, or --meta). "
                "Nothing was written."
            )
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
        existing, _, options = loader.load_file(file)
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
    if elided == 1:
        from collections import defaultdict
        from decimal import Decimal

        totals: dict[str, Decimal] = defaultdict(lambda: Decimal(0))
        for posting in normalized:
            units = posting.units
            if units is MISSING or units.number is MISSING:
                continue
            totals[str(units.currency)] += units.number
        if totals and all(number == 0 for number in totals.values()):
            raise protocol.UsageError(
                "Refusing a zero-net transaction with an inferred balancing posting; "
                "Beancount drops that leg from list/query. Supply an explicit amount "
                "(for example 'Assets:Cash 0 USD') or use nonzero postings. Nothing was written."
            )
    entry = entry._replace(postings=normalized, meta=write.metadata_for_write(entry.meta))
    rendered = writer.format_entry(entry)
    # The `@@` stash served the render; the JSON answer must not carry it.
    # Normalized posting metas hold nothing else, so they go back to empty.
    entry = entry._replace(postings=[posting._replace(meta={}) for posting in entry.postings])
    warnings = write.append(file, [rendered], allow_errors=allow_errors, into=into, snapshot=snapshot)
    return {
        "written": 1,
        "directive": entry._replace(meta=metadata_to_json(entry.meta)),
        "entry": rendered,
        "warnings": warnings,
        "target": str(write.destination(file, into)),
    }


_PLAIN_DECIMAL = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)")
"""A decimal without exponent notation, the only spelling that reaches here."""


def _total_price(posting_text: str) -> Any | None:
    """The `@@` total from a raw posting line, or None without one.

    The parser has already validated the line, so a total that cannot be
    read here means the split misread the text — never a user error — and
    the posting falls back to its parsed unit price. The rendered candidate
    is fully revalidated before anything is written, so a misread could only
    ever refuse a valid line, never corrupt one.
    """
    from beancount.core.amount import Amount as BcAmount

    unquoted = re.sub(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*', "", posting_text)
    if "@@" not in unquoted:
        return None
    tail = unquoted.rsplit("@@", 1)[1].split()
    if len(tail) < 2 or not _PLAIN_DECIMAL.fullmatch(tail[0]):
        return None
    try:
        return BcAmount(Decimal(tail[0]), tail[1])
    except InvalidOperation:
        return None


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
        elif re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
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
            f"{len(rejected_rows)} of {len(rows)} row(s) failed schema validation; nothing was written. "
            f"Fix them, or pass --partial to try appending schema-valid rows "
            f"(ledger validation may still reject some of the {len(valid)}).",
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
            recoverable: list[int] = []
            probe_texts: list[str] = []
            for index, directive in valid:
                try:
                    text = writer.format_transaction(directive)
                    write.validate_append(file, [*probe_texts, text], allow_errors=allow_errors, into=into)
                except protocol.LedgerError:
                    continue
                else:
                    recoverable.append(index)
                    probe_texts.append(text)
            message = str(batch_error)
            if recoverable:
                noun = "row" if len(recoverable) == 1 else "rows"
                message = f"{message} Pass --partial to append the {len(recoverable)} valid {noun}."
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
