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
import math
import os
import re
import unicodedata
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.amounts import JsonFloat, parse_decimal_number, parse_exact
from bea_engine.ledger import write, writer
from bea_engine.ledger.text import (
    checked_operating_currencies,
    is_commodity,
    outside_ledger_tree,
    parse_account,
    root_names_of,
    single_line,
    without_root_name_errors,
)
from bea_engine.paths import expand_path

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
        "close": _close,
        "price": _price,
    }
    from pydantic import ValidationError

    build = builders.get(directive_type)
    if directive_type != "transactions":
        _refuse_undecodable_arguments(request)
    try:
        if build is not None:
            # These read the ledger to decide what to write. Reading before the
            # lock made the append refuse whatever the writer it had just
            # waited for committed, so unrelated `bea` writes started together
            # mostly failed with "the ledger changed" (w5/183). Queue first; an
            # edit that takes no lock is still caught by the snapshot. The lock
            # covers the whole graph, not just root and target, so a write to
            # an include in another directory queues too (w5/718).
            with write.locked_graph(file, write.destination(file, into), deciding=True):
                if directive_type not in ("transaction", "transactions"):
                    return build(file, request, into=into, allow_errors=allow_errors, strict_read=strict_read)
                # A positive cover keeps the label of the short lot it covers.
                with writer.short_lot_labels(lambda: _batch_holdings(file)):
                    return build(file, request, into=into, allow_errors=allow_errors, strict_read=strict_read)
        if directive_type not in TYPES:
            raise protocol.UsageError(f"Unknown directive type {directive_type!r}. Use one of: {', '.join(TYPES)}.")
        # The root file's roots, for a write to the root itself: Beancount
        # applies `name_*` per file as it parses (w5/462), so an included
        # destination may accept other roots and is left to the load.
        directive = _simple(directive_type, request, root_names_of(file) if into is None else None)
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
    # Beancount resolves paths beside the include as named, even when the
    # include itself is a symlink to a file in another directory.
    holder = root if into is None else Path(os.path.normpath(root / expand_path(into, "--into"))).parent
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


def _simple(directive_type: str, request: dict[str, Any], roots: tuple[str, ...] | None) -> Any:
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
            raw_booking, booking = booking, str(booking).strip().upper()
            if not booking:
                # An empty value is not an omitted one: it wrote an open with no
                # booking method (w5/382), the w5/239 rule for other options.
                from beancount.core.data import Booking

                choices = ", ".join(member.name for member in Booking if member is not Booking.AVERAGE)
                raise protocol.UsageError(
                    f"--booking {raw_booking!r} is blank; omit --booking for the default, or choose one of: {choices}."
                )
        raw_currencies = list(request.get("currencies") or [])
        # A repeat is written once, in first-seen order, as repeated tags and
        # links are; `-c USD -c USD` wrote `USD,USD` (w5/448).
        currencies = list(dict.fromkeys(str(item).strip() for item in raw_currencies if str(item).strip()))
        if raw_currencies and not currencies:
            raise protocol.UsageError(
                "Every --currency value is blank after trimming; supply a currency symbol or omit -c."
            )
        # One blank among others is still a lost value, `-c "$UNSET"`, not an
        # omitted one: it was dropped and the open written without it (w5/491).
        blank = next((number for number, item in enumerate(raw_currencies, start=1) if not str(item).strip()), None)
        if blank is not None:
            raise protocol.UsageError(
                f"--currency value {blank} of {len(raw_currencies)} is blank after trimming; supply a currency "
                "symbol or drop that -c. Nothing was written."
            )
        return OpenDirective.model_validate(
            {
                "date": date,
                "account": parse_account(_text(request, "account"), roots, creating=True),
                "currencies": currencies,
                "booking": booking,
            },
            context=WRITE_INPUT,
        )
    if directive_type == "close":
        return CloseDirective(date=date, account=parse_account(_text(request, "account"), roots))
    if directive_type == "pad":
        account = parse_account(_text(request, "account"), roots)
        source = parse_account(_text(request, "source_account"), roots)
        _refuse_self_pad(account, source)
        return PadDirective(date=date, account=account, source_account=source)
    if directive_type == "note":
        return NoteDirective(
            date=date,
            account=parse_account(_text(request, "account"), roots),
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
                "account": parse_account(_text(request, "account"), roots),
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
        # custom value is checked here rather than where it was typed. The
        # NFC name it returns is kept, as for every other account argument:
        # the line is written NFC, and the reload check compares against it.
        if isinstance(value, dict) and value.get("kind") == "account":
            value["value"] = parse_account(str(value.get("value", "")), roots)
        if isinstance(value, dict) and value.get("kind") == "text" and isinstance(value.get("value"), str):
            value["value"] = single_line(value["value"])
    return CustomDirective.model_validate(
        {"date": date, "type": single_line(_text(request, "type")), "values": values}, context=WRITE_INPUT
    )


def _appended(
    file: Path,
    directive: Any,
    *,
    allow_errors: bool,
    into: Path | None,
    snapshot: write.LedgerSnapshot | None = None,
) -> dict[str, Any]:
    """Append one model-shaped directive; which writer to call follows from its type.

    `snapshot` is the ledger a caller already decided against (balance only):
    the write then conflicts if the ledger changed since that decision.
    """
    from bea_engine.ledger.reader import metadata_to_json

    name = type(directive).__name__.removesuffix("Directive").lower()
    decided = {} if snapshot is None else {"snapshot": snapshot}
    warnings = getattr(writer, f"write_{name}")(file, directive, allow_errors=allow_errors, into=into, **decided)
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
# close: refuse an account that still holds a balance
# --------------------------------------------------------------------------- #


def _held_through(entries: list[Any], account: str, date: datetime.date) -> dict[str, Decimal]:
    """Units per currency in exactly `account` at the end of `date`.

    A posting dated on the close date is still allowed, so it counts; child
    accounts are separate accounts with their own close.
    """
    from beancount.core.data import Transaction

    held: dict[str, Decimal] = {}
    for entry in entries:
        if not isinstance(entry, Transaction) or entry.date > date:
            continue
        for posting in entry.postings:
            if posting.account == account and posting.units is not None and posting.units.number is not None:
                currency = posting.units.currency
                held[currency] = held.get(currency, Decimal(0)) + posting.units.number
    return {currency: number for currency, number in held.items() if number != 0}


def _drained_checks(entries: list[Any], options: Any, account: str, date: datetime.date) -> set[str]:
    """The currencies `check_drained` will assert zero for on closing `account` at `date`.

    The plugin covers balance-sheet accounts only, and skips a currency the
    ledger already asserts on the close date, whatever that assertion says; an
    Income or Expenses balance, or one a statement assertion hides, is not
    its to refuse.
    """
    from beancount.core import account_types
    from beancount.core.data import Balance
    from beancount.parser import options as beancount_options

    if not account_types.is_balance_sheet_account(
        account,
        beancount_options.get_account_types(options),  # type: ignore[no-untyped-call]
    ):
        return set()
    asserted = {
        entry.amount.currency
        for entry in entries
        if isinstance(entry, Balance) and entry.account == account and entry.date == date
    }
    return _plugin_currencies(entries, account) - asserted


def _plugin_currencies(entries: list[Any], account: str) -> set[str]:
    """Every currency the account has posted or declared, as the plugin accumulates them."""
    from beancount.core.data import Open, Transaction

    seen: set[str] = set()
    for entry in entries:
        if isinstance(entry, Transaction):
            seen |= {p.units.currency for p in entry.postings if p.account == account and p.units is not None}
        elif isinstance(entry, Open) and entry.account == account and entry.currencies:
            seen |= set(entry.currencies)
    return seen


def _stranded_lots(entries: list[Any], account: str, date: datetime.date) -> list[str]:
    """Each lot the account still holds at the end of `date` although every commodity's units net to zero.

    Units alone cannot tell: `+1 HOOL {100 USD}` and `-1 HOOL {200 USD}` are
    two lots the inventory keeps apart, worth −100 USD at cost, however
    `_held_through` reads the shares (w5/909). The booked postings are netted
    per lot (cost number, currency, date and label), and a commodity whose
    units already show a balance is left to that report.
    """
    from beancount.core.data import Transaction

    lots: dict[tuple[str, Any], Decimal] = {}
    for entry in entries:
        if not isinstance(entry, Transaction) or entry.date > date:
            continue
        for posting in entry.postings:
            if posting.account != account or posting.units is None or posting.units.number is None:
                continue
            cost: Any = posting.cost
            key = None if cost is None else (cost.number, cost.currency, cost.date, getattr(cost, "label", None))
            slot = (posting.units.currency, key)
            lots[slot] = lots.get(slot, Decimal(0)) + posting.units.number
    by_currency: dict[str, Decimal] = {}
    for (currency, _), number in lots.items():
        by_currency[currency] = by_currency.get(currency, Decimal(0)) + number
    stranded = []
    for (currency, key), number in sorted(lots.items(), key=lambda item: (item[0][0], str(item[0][1]))):
        if number == 0 or by_currency[currency] != 0:
            continue
        spelled = ""
        if key is not None:
            parts = [f"{_plain(key[0])} {key[1]}", key[2].isoformat()]
            # An empty label is a lot of its own and a quote or backslash needs
            # escaping, or the advice names a different lot than the one held
            # (w5/982).
            if key[3] is not None:
                parts.append(f'"{writer.escape_string(key[3])}"')
            spelled = f" {{{', '.join(parts)}}}"
        stranded.append(f"{_plain(number)} {currency}{spelled}")
    return stranded


def _remaining_balance(
    entries: list[Any], options: Any, account: str, date: datetime.date
) -> tuple[dict[str, Decimal], list[str]]:
    """What `account` still holds at the end of `date`, as units and as stranded lots.

    Units a loaded `check_drained` will assert zero are left to it, with its own
    hint (w5/888); lots that cancel in units but not at cost, which no units
    check can see, are named separately (w5/909).
    """
    held = _held_through(entries, account, date)
    if held and any(str(name).endswith("check_drained") for name, _ in options.get("plugin") or ()):
        covered = _drained_checks(entries, options, account, date)
        held = {currency: number for currency, number in held.items() if currency not in covered}
    return held, [] if held else _stranded_lots(entries, account, date)


def _closed_with(entries: list[Any], options: Any, account: str) -> list[str]:
    """The descendants a loaded `close_tree` plugin closes along with `account`: opened and not yet closed."""
    from beancount.core.data import Close, Open

    if not any(str(name).endswith("close_tree") for name, _ in options.get("plugin") or ()):
        return []
    prefix = f"{account}:"
    opened = {entry.account for entry in entries if isinstance(entry, Open) and entry.account.startswith(prefix)}
    closed = {entry.account for entry in entries if isinstance(entry, Close)}
    return sorted(opened - closed)


def _close(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    from bea_engine import managed_load
    from bea_engine.ledger.models import CloseDirective

    roots = root_names_of(file) if into is None else None
    directive = CloseDirective(date=_date(request), account=parse_account(_text(request, "account"), roots))
    snapshot = write.LedgerSnapshot.capture(file)
    snapshot.require_target(write.destination(file, into), into=into)
    entries, _errors, options = managed_load.load_file(file, snapshot=snapshot, check_types=True)
    # A close over a balance strands it: later postings to the account are
    # refused and reports keep counting it (w2/092). A ledger that loads
    # check_drained refuses it in validation already, with its own hint, but
    # only for what the plugin really checks (w5/888). The accounts the
    # close_tree plugin closes with this one are closed by the same write, so
    # they are judged the same way (w5/910).
    if not request.get("force"):
        day = directive.date.isoformat()
        for account in [directive.account, *_closed_with(entries, options, directive.account)]:
            held, stranded = _remaining_balance(entries, options, account, directive.date)
            own = account == directive.account
            if stranded:
                subject = f"{account} still holds {', '.join(stranded)} on {day}: the units cancel but the lots do not."
                remedy = (
                    f"Close those lots with a transaction posting each one's cost, dated on or before {day}, then "
                    f"close {directive.account}, or pass --force to close {'it' if own else 'them'} with them."
                )
            elif held:
                amounts = ", ".join(f"{_plain(number)} {currency}" for currency, number in sorted(held.items()))
                subject = f"{account} still holds {amounts} on {day}"
                subject += "." if own else f", and the close_tree plugin closes it with {directive.account}."
                remedy = (
                    f"Move that balance out of {account} with a transaction dated on or before {day}, then close "
                    f"{'it' if own else directive.account}, or pass --force to close {'it' if own else 'them'} with "
                    "the balance."
                )
            else:
                continue
            raise protocol.LedgerError(f"{subject} {remedy} Nothing was written.")
    # Write against the ledger this decision read (w5/115).
    return _appended(file, directive, allow_errors=allow_errors, into=into, snapshot=snapshot)


# --------------------------------------------------------------------------- #
# balance, with or without an explicit pad
# --------------------------------------------------------------------------- #


def _refuse_self_pad(account: str, source: str) -> None:
    """Refuse a pad whose source is the padded account: no balance can complete it (w5/799)."""
    if source == account:
        raise protocol.UsageError(
            f"The pad source must be another account: {account} cannot pad itself. Nothing was written."
        )


def _conflict_refusal(
    conflict: Any, account: str, date: Any, number: Any, currency: str, tolerance: Any
) -> protocol.ConflictError:
    where = conflict.meta.get("filename"), conflict.meta.get("lineno")
    return protocol.ConflictError(
        f"{account} already has a {date.isoformat()} balance of "
        f"{_balance_amount(conflict.amount.number, currency, conflict.tolerance)} "
        f"(at {where[0]}:{where[1]}); refusing {_balance_amount(number, currency, tolerance)}. "
        "Pass --force to record another assertion."
    )


def _balance(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    from beancount.core.data import Balance

    from bea_engine import managed_load
    from bea_engine.ledger.models import Amount, BalanceDirective, PadDirective
    from bea_engine.ledger.reader import authored_entries
    from bea_engine.query import format_error

    date = _date(request)
    number, currency, tolerance = _parse_balance_amount(_text(request, "amount"))
    account = parse_account(_text(request, "account"))
    directive = BalanceDirective(
        date=date, account=account, amount=Amount(number=number, currency=currency), tolerance=tolerance
    )
    pad_from = request.get("pad_from")
    if pad_from is not None:
        _refuse_self_pad(account, parse_account(str(pad_from)))
    snapshot = write.LedgerSnapshot.capture(file)
    target = write.destination(file, into)
    snapshot.require_target(target, into=into)
    before, errors, before_options = managed_load.load_file(file, snapshot=snapshot, check_types=True)
    ledger_errors = [format_error(error, ledger_file=file) for error in errors]
    if (
        pad_from is None
        and ledger_errors
        and strict_read
        and not all(
            "Unused Pad" in getattr(error, "message", "")
            or (write.is_unused_open(error) and error.entry.account == account)
            for error in errors
        )
    ):
        # The balance can complete a staged pad or be this account's first
        # use under nounused. Other errors still gate strict callers; final
        # validation must clear the transient error (w5/664).
        raise write.preexisting_refusal(errors, ledger_errors)
    # A pad can make validation succeed even when the assertion is a
    # duplicate or conflicts. Decide before either write path (w5/659).
    # Judged by what the files declare, not the plugin's view of them (w5/993).
    authored = authored_entries(snapshot, Balance)
    match = _balance_match(authored, date, account, number, currency, tolerance)
    if match is not None:
        snapshot.verify()
        source = {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
        warnings = list(ledger_errors)
        if pad_from is not None:
            held = write.book_units(before, account, currency, date)
            if abs(number - held) <= _balance_tolerance(match, before_options):
                warnings.append(
                    f"{_already_matches(held, number, currency, tolerance)}; "
                    f"omitted the pad from --pad-from (assertion already recorded at "
                    f"{source['filename']}:{source['lineno']})."
                )
        return {
            "written": 0,
            "directive": directive.model_dump(mode="json"),
            "pad": None,
            "warnings": warnings,
            "duplicate": True,
            "source": source,
            "target": str(target),
            **({"ledger_errors": ledger_errors} if pad_from is None else {}),
        }
    conflict = _balance_conflict(authored, date, account, number, currency, tolerance)
    if conflict is not None and not request.get("force"):
        raise _conflict_refusal(conflict, account, date, number, currency, tolerance)
    if pad_from is None and not request.get("force"):
        _refuse_used_pad_fill(before, date, account, number, currency, tolerance, before_options)
    if pad_from is None:
        # The snapshot the checks above read: a writer that landed since then
        # is a conflict, not a second assertion appended beside it (w5/115).
        return _appended(file, directive, allow_errors=allow_errors, into=into, snapshot=snapshot) | {"pad": None}

    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Pad

    padded = _date(request, "pad_date")
    # Read first, as the plain path does: the answer names what the pad
    # inserts, and a sign a statement prints is caught before it is padded (w5/611).
    held = write.book_units(before, account, currency, date)
    sign = write.negated_credit_hint(account, number, held, currency, before_options)
    if sign is not None and not request.get("force"):
        raise protocol.UsageError(
            f"{sign} Padding to {_balance_amount(number, currency, tolerance)} would insert "
            f"{_plain(number - held)} {currency}. Pass --force to pad to it anyway. Nothing was written."
        )
    entries = [
        Pad({}, padded, account, parse_account(str(pad_from))),
        Balance({}, date, account, BcAmount(number, currency), tolerance, None),
    ]
    try:
        warnings = write.append(
            file,
            [writer.format_entry(e) for e in entries],
            allow_errors=allow_errors,
            into=into,
            pad_from=True,
            pad_date_explicit=bool(request.get("pad_date_explicit")),
            snapshot=snapshot,
        )
    except protocol.LedgerError as exc:
        # Decide against one snapshot and write against the same one, as the
        # plain path does, so concurrent retries cannot each append (w5/115).
        snapshot = write.LedgerSnapshot.capture(file)
        snapshot.require_target(write.destination(file, into), into=into)
        loaded, before_errors, options = managed_load.load_file(file, snapshot=snapshot, check_types=True)
        # The plain path refuses a second, different assertion for the day
        # before writing. Here the write failed on it instead, with advice to
        # date the pad after that very day and to rerun this command (w5/487).
        authored = authored_entries(snapshot, Balance)
        conflict = _balance_conflict(authored, date, account, number, currency, tolerance)
        if conflict is not None and not request.get("force"):
            raise _conflict_refusal(conflict, account, date, number, currency, tolerance) from None
        # The only failure worth a retry is a pad Beancount reports unused;
        # anything else stands. Why it went unused decides what happens next.
        # `--allow-errors` takes the same path: the flag tolerates errors
        # already in the books, never an unused pad this write would add.
        if not _unused_pad_only(exc):
            raise
        source_account = parse_account(str(pad_from))
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
        match = _balance_match(authored, date, account, number, currency, tolerance)
        if match is not None:
            source = {"filename": match.meta.get("filename"), "lineno": match.meta.get("lineno")}
            stands = _already_matches(write.book_units(loaded, account, currency, date), number, currency, tolerance)
            return {
                "written": 0,
                "directive": directive.model_dump(mode="json"),
                "pad": None,
                "warnings": [
                    f"{stands}; "
                    f"omitted the pad from --pad-from (assertion already recorded at "
                    f"{source['filename']}:{source['lineno']})."
                ],
                "duplicate": True,
                "source": source,
                "target": str(write.destination(file, into)),
            }
        book = write.book_units(loaded, account, currency, date)
        difference = number - book
        if abs(difference) <= _balance_tolerance(entries[1], options):
            result = _appended(file, directive, allow_errors=allow_errors, into=into, snapshot=snapshot) | {"pad": None}
            warnings = list(result.get("warnings") or [])
            warnings.append(
                f"{_already_matches(book, number, currency, tolerance)}; omitted the pad from "
                "--pad-from and wrote the assertion alone."
            )
            result["warnings"] = warnings
            return result
        # The book does not match, so the new pad went unused because an
        # existing pad fills this assertion instead (Beancount pads every
        # currency of the next assertion after the latest pad) — or the new
        # pad is needed and an existing pad would go unused instead.
        cover = _covering_pad(loaded, account, date, currency)
        if cover is None:
            stranded = _unused_existing_pads(exc, loaded)
            if not stranded:
                raise
            raise _stranded_pad_refusal(stranded, loaded, account) from exc
        pad_at = f"{cover.meta.get('filename')}:{cover.meta.get('lineno')}"
        if cover.source_account != source_account:
            used = any(
                isinstance(entry, Balance) and entry.account == account and cover.date < entry.date < date
                for entry in loaded
            )
            if used:
                # The plain path refuses a used pad's silent fill too, so
                # dropping --pad-from is no remedy here (w5/796).
                advice = (
                    f"That pad already has an assertion after it; fix the amount, record the missing "
                    f"transaction, pass --pad-from {cover.source_account} to pad explicitly, or edit that "
                    f"pad first."
                )
            else:
                advice = (
                    f"Add the balance without --pad-from to let that pad insert {_plain(difference)} {currency} "
                    f"from {cover.source_account}, or edit that pad first."
                )
            raise protocol.LedgerError(
                f"The existing pad at {pad_at} ({cover.date} from {cover.source_account}) already fills this "
                f"assertion, so a pad from {source_account} would go unused; nothing was written.",
                details=[advice],
            ) from exc
        result = _appended(file, directive, allow_errors=allow_errors, into=into, snapshot=snapshot) | {"pad": None}
        warnings = list(result.get("warnings") or [])
        warnings.append(
            f"The existing pad at {pad_at} ({cover.date} from {cover.source_account}) fills this assertion, "
            f"inserting {_plain(difference)} {currency}; omitted the pad from --pad-from and wrote the assertion alone."
        )
        result["warnings"] = warnings
        return result
    # The model shape every other branch and `list pad`/`list balance` use:
    # this answer was a raw-namedtuple `directives` array carrying Beancount's
    # internal `diff_amount`, so `data.directive` vanished exactly when the
    # pad was written (w5/323).
    pad = PadDirective(date=padded, account=account, source_account=parse_account(str(pad_from)))
    # What the pad inserts was never said: a sign error padded twice the
    # balance with exit 0, found only by listing the padding entry (w5/611).
    inserted = {"number": _plain(number - held), "currency": currency}
    if before_options.get("plugin_processing_mode") == "raw":
        # Raw mode skips pad processing with the balance checks, so the pad
        # is recorded but inserts nothing and the balance never moves (w5/766).
        warnings = [
            *warnings,
            'option "plugin_processing_mode" "raw" skips Beancount\u2019s pad processing, so the pad '
            "is recorded but inserts nothing; drop the raw mode to pad balances.",
        ]
    owed = write.credit_root(account, before_options)
    if owed is not None and held == 0 and number > 0:
        # No balance to compare with, so the negated-balance refusal cannot
        # fire, and a loan padded to +5000 added to net worth in silence,
        # where the same assertion without --pad-from flags the sign (w5/827).
        warnings = [
            *warnings,
            f"{owed} balances are negative in Beancount, so an amount owed of {_plain(number)} {currency} is "
            f"asserted as -{_plain(number)} {currency}; {account} was padded to +{_plain(number)} {currency} "
            "as asserted, which counts toward net worth.",
        ]
    return {
        "written": 2,
        "directive": directive.model_dump(mode="json"),
        "pad": pad.model_dump(mode="json") | {"amount": inserted},
        "warnings": warnings,
        "duplicate": False,
        "source": None,
        "target": str(write.destination(file, into)),
    }


def _balance_match(
    entries: list[Any], date: Any, account: str, number: Decimal, currency: str, tolerance: Decimal | None
) -> Any | None:
    """An identical balance assertion already written in the ledger, or None.

    Only written assertions count: one a plugin synthesizes (`check_drained`
    stamps a zero balance with its `close` line) is on no line to cite.
    """
    from beancount.core.data import Balance

    from bea_engine.ledger.reader import entry_generated, shared_locations

    # With the loaded entries' shared locations, so a calculated assertion that
    # borrows an authored line is told from it (w5/938).
    shared = shared_locations(entries)
    return next(
        (
            entry
            for entry in entries
            if isinstance(entry, Balance)
            and entry.date == date
            and entry.account == account
            and entry.amount.currency == currency
            and _same_assertion(entry, number, tolerance)
            and not entry_generated(entry, "balance", shared)
        ),
        None,
    )


def _balance_conflict(
    entries: list[Any], date: Any, account: str, number: Decimal, currency: str, tolerance: Decimal | None
) -> Any | None:
    """A written same-key assertion with a different value, or None."""
    from beancount.core.data import Balance

    from bea_engine.ledger.reader import entry_generated, shared_locations

    shared = shared_locations(entries)
    return next(
        (
            entry
            for entry in entries
            if isinstance(entry, Balance)
            and entry.date == date
            and entry.account == account
            and entry.amount.currency == currency
            and not _same_assertion(entry, number, tolerance)
            and not entry_generated(entry, "balance", shared)
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
    if tolerance is None:
        return f"{_plain(number)} {currency}"
    return f"{_plain(number)} ~ {_plain(tolerance)} {currency}"


def _plain(number: Any) -> str:
    """A Decimal in the fixed-point spelling `bea` accepts back: `0.00000001`, never `1E-8`."""
    return format(number, "f")


def _already_matches(held: Decimal, number: Decimal, currency: str, tolerance: Decimal | None) -> str:
    """How the book stands against an assertion it satisfies: exactly, or only within tolerance.

    "Book balance already matches 100.01 USD" overstated a book holding
    100.004 USD, and dropped the `~ 0.004` that was typed (w5/611).
    """
    asserted = _balance_amount(number, currency, tolerance)
    if held == number:
        return f"Book balance already matches {asserted}"
    return f"The book holds {_plain(held)} {currency}, within the tolerance of the {asserted} assertion"


def _balance_tolerance(balance: Any, options: dict[str, Any]) -> Decimal:
    from beancount.ops.balance import get_balance_tolerance

    tolerance: Decimal = get_balance_tolerance(balance, options)  # type: ignore[no-untyped-call]
    return tolerance


def pad_already_used(entries: list[Any], account: str, pad_date: Any, date: Any, currency: str) -> bool:
    """Whether an assertion on this account has already used the pad dated `pad_date`.

    An assertion after the pad does, and so does one on the new assertion's own
    day in another currency: it settles against the pad's adjustments just as a
    later day's would, and counting only the days before `date` called a pad a
    USD assertion had used still staged for EUR (w5/955). Another assertion in
    `currency` on `date` is the new one's duplicate or conflict, not a use.
    """
    from beancount.core.data import Balance

    return any(
        isinstance(entry, Balance)
        and entry.account == account
        and (pad_date < entry.date < date or (entry.date == date and entry.amount.currency != currency))
        for entry in entries
    )


def _refuse_used_pad_fill(
    entries: list[Any],
    date: Any,
    account: str,
    number: Decimal,
    currency: str,
    tolerance: Decimal | None,
    options: dict[str, Any],
) -> None:
    """Refuse an assertion a non-staged pad would silently pad (w5/796).

    Upstream keeps a pad active for every currency it has not yet padded,
    so a pad consumed by an earlier assertion still pads a new currency's
    gap without a word. A staged pad — none of the account's balances
    between it and this assertion yet — completes silently, as the two-step
    intends.
    """
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Balance

    cover = _covering_pad(entries, account, date, currency)
    if cover is None:
        return
    held = write.book_units(entries, account, currency, date)
    candidate = Balance({}, date, account, BcAmount(number, currency), tolerance, None)
    if abs(number - held) <= _balance_tolerance(candidate, options):
        return
    if not pad_already_used(entries, account, cover.date, date, currency):
        return
    pad_at = f"{cover.meta.get('filename')}:{cover.meta.get('lineno')}"
    difference = number - held
    raise protocol.LedgerError(
        f"{account} holds {_plain(held)} {currency} but asserts {_plain(number)}; the pad at {pad_at} "
        f"({cover.date} from {cover.source_account}) would silently insert the {_plain(difference)} "
        f"{currency} difference. Nothing was written.",
        details=[
            "Record the missing transaction or fix the amount; pass "
            f"--pad-from {cover.source_account} to pad explicitly, or --force to record the padded assertion."
        ],
    )


def _covering_pad(entries: list[Any], account: str, date: datetime.date, currency: str) -> Any | None:
    """The latest pad before `date` still unconsumed for `currency`, if any.

    A pad is consumed for a currency by the first assertion in it after the
    pad — even an exact one — so a consumed pad never offers to cover (w5/797).
    """
    from beancount.core.data import Balance, Pad

    for entry in reversed(entries):
        if not (isinstance(entry, Pad) and entry.account == account and entry.date < date):
            continue
        consumed = any(
            isinstance(other, Balance)
            and other.account == account
            and other.amount.currency == currency
            and entry.date < other.date < date
            for other in entries
        )
        if not consumed:
            return entry
    return None


def _unused_existing_pads(exc: protocol.LedgerError, entries: list[Any]) -> list[Any]:
    """Loaded pads an `Unused Pad` failure names (w5/797).

    The failure carries display strings, not entries, but a pad the failed
    write would have added is on no loaded line: anything matching a loaded
    pad's file and line is an existing pad the write would strand.
    """
    from beancount.core.data import Pad

    found: dict[tuple[str, int], Any] = {}
    for detail in exc.details or []:
        if "Unused Pad" not in detail:
            continue
        filename, _, lineno = detail.partition(": Unused Pad")[0].rpartition(":")
        try:
            line = int(lineno)
        except ValueError:
            continue
        for entry in entries:
            if isinstance(entry, Pad) and entry.meta.get("filename") == filename and entry.meta.get("lineno") == line:
                found[(filename, line)] = entry
    return list(found.values())


def _stranded_pad_refusal(stranded: list[Any], entries: list[Any], account: str) -> protocol.LedgerError:
    """The refusal when the new pad would strand an existing one (w5/797)."""
    from beancount.core.data import Balance

    first = min(stranded, key=lambda entry: entry.date)
    pad_at = f"{first.meta.get('filename')}:{first.meta.get('lineno')}"
    following = next(
        (
            entry
            for entry in entries
            if isinstance(entry, Balance) and entry.account == account and entry.date > first.date
        ),
        None,
    )
    why = (
        f"the book balance already matches the {following.date} assertion"
        if following is not None
        else ("nothing after it needs padding")
    )
    others = f" (and {len(stranded) - 1} more)" if len(stranded) > 1 else ""
    remove = "those pads" if len(stranded) > 1 else "that pad"
    return protocol.LedgerError(
        f"Adding this assertion would strand the existing pad at {pad_at} ({first.date} from "
        f"{first.source_account}){others}: {why}. Nothing was written.",
        details=[f"Remove {remove} first, then retry — or fix the amount if the statement is wrong."],
    )


def _unused_pad_only(exc: protocol.LedgerError) -> bool:
    details = list(exc.details or [])
    return bool(details) and all("Unused Pad" in detail for detail in details)


def _parse_balance_amount(text: str) -> tuple[Decimal, str, Decimal | None]:
    """`NUMBER [~ TOLERANCE] CURRENCY`, read by the parser that will read it back."""
    from beancount.core.data import Balance

    from bea_engine.ledger.models import COMMENT_HELP, comment_start
    from bea_engine.query import readable_parser_message

    if "\n" in text or "\r" in text:
        raise protocol.UsageError("Balance amount must be one line: 'NUMBER [~ TOLERANCE] CURRENCY'.")
    if comment_start(text) is not None:
        # Parsed as written, the note after `;` was dropped and the assertion
        # written without it, exit 0 (w5/511), as `add price` already refuses.
        raise protocol.UsageError(f"--amount contains a ';': {text!r}. {COMMENT_HELP} Nothing was written.")
    # Amount fields have no account or quoted label to confuse with a
    # separator. Accept pasted Unicode spaces as price/bulk amounts do.
    text = "".join(" " if unicodedata.category(character) == "Zs" else character for character in text)
    entries, errors, _ = parse_exact(f"2000-01-01 balance Assets:Balance {text}\n")
    if errors or len(entries) != 1 or not isinstance(entries[0], Balance):
        raise protocol.UsageError(
            "Balance amount must be 'NUMBER [~ TOLERANCE] CURRENCY', for example '1538 ~ 1 EUR'.",
            details=[f"--amount: {readable_parser_message(error.message, text=text)}" for error in errors],
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


def one_price_per_day_plugin(options: Any) -> str | None:
    """The plugin this ledger loads that allows one price per pair and day, as a phrase, or None.

    `unique_prices` rejects a second same-day quote, so `--force` could only
    end in its bare "Disagreeing price entries" (w5/397); `pedantic` bundles
    it (w5/766). Import's advice asks the same question (w5/902).
    """
    loaded = [str(name) for name, _ in options.get("plugin") or ()]
    if any(name == "pedantic" or name.endswith(".pedantic") for name in loaded):
        return "the pedantic plugin (which bundles unique_prices)"
    if any(name.endswith("unique_prices") for name in loaded):
        return "the unique_prices plugin"
    return None


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
    from bea_engine.ledger.reader import authored_entries
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
    snapshot.require_target(target, into=into)
    entries, errors, options = managed_load.load_file(file, snapshot=snapshot, check_types=True)
    ledger_errors = [format_error(error, ledger_file=file) for error in errors]
    if ledger_errors and strict_read:
        raise write.preexisting_refusal(errors, ledger_errors)
    local_prices: list[Price] = []
    reciprocal_prices: list[Price] = []
    managed_sources: set[str] = set()
    pair = (currency, amount_currency)
    shadowed_pairs = {pair, (amount_currency, currency)}
    for entry in entries:
        if not isinstance(entry, Price) or entry.date != directive.date:
            continue
        if (entry.currency, entry.amount.currency) not in shadowed_pairs:
            continue
        filename = entry.meta.get("filename")
        managed_source = managed_source_for_path(Path(filename)) if isinstance(filename, str) and filename else None
        if managed_source is not None:
            managed_sources.add(managed_source)
    # What the files declare, not the loaded view: a filtered quote still
    # counts and an inverted one is not the quote its file spells (w5/992).
    for entry in authored_entries(snapshot, Price):
        entry_pair = (entry.currency, entry.amount.currency)
        if entry.date == directive.date and entry_pair in shadowed_pairs:
            (local_prices if entry_pair == pair else reciprocal_prices).append(entry)

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
    # unique_prices rejects a second quote for the day, so --force could only
    # end in its bare "Disagreeing price entries" (w5/397). pedantic bundles
    # unique_prices, so it counts too (w5/766).
    loader = one_price_per_day_plugin(options)
    if conflict is not None and (loader is not None or not request.get("force")):
        where = f"{conflict.meta.get('filename')}:{conflict.meta.get('lineno')}"
        if loader is not None:
            remedy = (
                f"This ledger loads {loader}, which allows one {currency} price in {amount_currency} "
                f"per day; edit the existing price at {where} instead."
            )
        else:
            remedy = "Pass --force to record another quote."
        raise protocol.ConflictError(
            f"{currency} already has a {directive.date.isoformat()} price of "
            f"{_plain(conflict.amount.number)} {amount_currency} (at {where}); "
            f"refusing {_plain(number)} {amount_currency}. {remedy}"
        )

    # A same-day quote in the other direction is the same rate for the day, and
    # one that disagrees made `balance` and `query` value the pair differently
    # by line order; with both, Beancount values by the inverse of the
    # direction quoted less often (w5/556). Agreement is judged at the typed
    # precision, as import judges it (w5/741).
    from bea_engine.ledger.prices import reciprocal_agrees

    crossing = next((entry for entry in reciprocal_prices if not reciprocal_agrees(number, entry.amount.number)), None)
    if crossing is not None and not request.get("force"):
        where = f"{crossing.meta.get('filename')}:{crossing.meta.get('lineno')}"
        raise protocol.ConflictError(
            f"{amount_currency} already has a {directive.date.isoformat()} price of "
            f"{_plain(crossing.amount.number)} {currency} (at {where}), the other direction of this pair, and "
            f"{_plain(number)} {amount_currency} disagrees with it. Pass --force to record both; Beancount then "
            "values the pair by the inverse of the direction quoted less often."
        )

    # The new quote can still lose its day: to a generated reciprocal
    # (implicit_prices), to a same-direction quote that sorts later (an
    # included file's line number beats the root's), or to a quote already
    # written. A write no read will use says so, naming the winner's location
    # (w5/741, w5/903), judged on the ledger as it would load.
    from bea_engine.ledger.prices import unused_quote_advisories

    entry = Price({}, directive.date, currency, BcAmount(number, amount_currency))
    text = writer.format_entry(entry)
    advisories: list[str] = []
    write.validate_append(
        file,
        [text],
        allow_errors=allow_errors,
        into=into,
        snapshot=snapshot,
        inspect=lambda candidate: advisories.extend(
            unused_quote_advisories(candidate, entries, [(directive.date, currency, amount_currency, number)])
        ),
    )
    warnings = write.append(file, [text], allow_errors=allow_errors, into=into, snapshot=snapshot)
    warnings.extend(advisories)
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


def _refuse_unicode_space(number: int, posting_text: str) -> None:
    """Refuse a space Beancount does not read as one, outside a quoted label.

    A no-break space pasted from a web page or a statement between account and
    amount was read as part of the account, `Expenses:Food\xa05`, and the
    refusal offered to open that account (w5/490). Only a space or tab
    separates fields.
    """
    quoted = False
    for position, character in enumerate(posting_text, start=1):
        if character == '"':
            quoted = not quoted
        elif not quoted and character.isspace() and character not in " \t":
            label = unicodedata.name(character, "a Unicode space").title()
            raise protocol.UsageError(
                f"--posting {number} holds U+{ord(character):04X} ({label}) at character {position}: "
                f"{posting_text!r}. Beancount separates fields only with an ordinary space or tab, so it would "
                "read that character as part of a name or amount. Retype it as a space. Nothing was written."
            )


def _transaction(
    file: Path, request: dict[str, Any], *, into: Path | None, allow_errors: bool, strict_read: bool
) -> dict[str, Any]:
    del strict_read  # Only an ambiguous currency reads the ledger, and it says so itself.
    from beancount.core.data import Open, Transaction
    from beancount.core.number import MISSING

    from bea_engine import managed_load
    from bea_engine.ledger.models import COMMENT_HELP, WRITE_INPUT, TransactionHeader, comment_start
    from bea_engine.ledger.reader import metadata_to_json
    from bea_engine.query import readable_parser_message

    postings: list[str] = [str(posting) for posting in request.get("postings") or []]
    for number, posting_text in enumerate(postings, start=1):
        if comment_start(posting_text) is not None:
            raise protocol.UsageError(
                f"--posting {number} contains a ';': {posting_text!r}. {COMMENT_HELP} "
                "Use --meta for a transaction note. Nothing was written."
            )
        _refuse_unicode_space(number, posting_text)
        parts = posting_text.split()
        # Native posting flags are single characters; accounts never are.
        if parts and len(parts[0]) == 1:
            parts = parts[1:]
        parse_account(parts[0] if parts else "")
    header = TransactionHeader.model_validate(
        {
            "date": _date(request),
            # Only an omitted flag defaults: `--flag ''` wrote `*` while bulk
            # add refused the same empty flag (w5/382).
            "flag": "*" if request.get("flag") is None else str(request.get("flag")),
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
    entries, errors, _ = parse_exact(text)
    # Root names are ledger options. The full candidate validation below
    # checks them in that context; this standalone parse only checks syntax.
    errors = without_root_name_errors(errors)
    if errors or len(entries) != 1 or not isinstance(entries[0], Transaction):
        details = []
        # Lines as the lexer counts them, on `\n` alone: a U+2028 in the
        # narration made `splitlines` count one more header line (w5/486).
        header_lines = header_text.count("\n")
        for error in errors:
            line = error.source.get("lineno", 0)
            # A missing closing token is noticed at the end of its line, and
            # Beancount reports that EOL on the next one: the blame moved one
            # posting down, or off the last one onto the header (w5/486).
            if "unexpected EOL" in error.message:
                line -= 1
            posting_number = line - header_lines
            blamed = 0 < posting_number <= len(postings)
            location = f"--posting {posting_number}" if blamed else "Transaction options"
            scope = postings[posting_number - 1] if blamed else ""
            details.append(f"{location}: {readable_parser_message(error.message, text=scope)}")
        if details and all(detail.startswith("Transaction options:") for detail in details):
            message = _HEADER_ERROR
        else:
            message = (
                "Invalid transaction options; use postings such as 'Assets:Checking -30 USD'. Nothing was written."
            )
        raise protocol.UsageError(message, details=details)
    entry = entries[0]
    for number, posting in enumerate(entry.postings, start=1):
        if managed_load.zero_units_at_total_cost(posting):
            # Booking divides the total by the units, and raised (w5/538).
            raise protocol.UsageError(f"--posting {number} {managed_load.ZERO_UNITS_TOTAL_COST} Nothing was written.")
        tail = managed_load.elided_units_zero_rate_tail(posting)
        if tail is not None:
            # Booking cannot infer the elided units from a zero rate, and
            # died naming no posting (w5/732).
            raise protocol.UsageError(f"--posting {number} {tail} Nothing was written.")
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
        currencies = checked_operating_currencies(options)
        # Distinct symbols: an `open ... USD, USD` already in a native file
        # allows one commodity, not two choices (w5/959).
        allowed = {e.account: list(dict.fromkeys(e.currencies or [])) for e in existing if isinstance(e, Open)}
    normalized = []
    elided = 0
    # Postings whose currency fell back to the operating currency, with what
    # the account allows: validation hints name them when a guessed currency
    # causes the failure, instead of advising an exchange never made (w5/804).
    # A forced single-currency default is not a guess and stays out.
    operating_defaults: dict[int, list[str] | None] = {}
    for number, posting in enumerate(entry.postings, start=1):
        _refuse_missing_price(postings, number, posting)
        # Beancount annotates booked postings; the parser also returns MISSING.
        units: Any = posting.units
        if units is MISSING or units.number is MISSING:
            elided += 1
        if units is not MISSING and units.currency is MISSING:
            choices = allowed.get(posting.account) or []
            from_operating = False
            if len(choices) != 1 and len(currencies) == 1 and (not choices or currencies[0] in choices):
                choices = currencies
                from_operating = True
            if len(choices) != 1:
                raise protocol.UsageError(
                    f"Currency is ambiguous for {posting.account}; specify NUMBER CURRENCY explicitly.",
                    details=write.root_ledger_hints(file),
                )
            # A commodity held at a cost in itself, or priced in itself, is
            # never what was meant: `3 {80 USD}` forgot its commodity, and
            # defaulting it wrote three dollars held at eighty dollars each,
            # exit 0 and a passing check (w5/098). A default that differs from
            # the rate's currency — an account opened for HOOL alone — stands.
            # A rate that names no currency cannot prove it differs: `3 {80}` and
            # `3 {}` defaulted the same silent way, and a price beside a cost
            # was never consulted at all (w5/800).
            rate_currencies = [
                getattr(rate, "currency", None) for rate in (posting.cost, posting.price) if rate is not None
            ]
            if rate_currencies and any(
                currency is MISSING or currency is None or currency == choices[0] for currency in rate_currencies
            ):
                if any(currency == choices[0] for currency in rate_currencies):
                    given = (
                        f"gives a cost or price in {choices[0]} but no commodity, and "
                        f"{posting.account} would default to {choices[0]} itself."
                    )
                else:
                    given = (
                        "gives a cost or price with no currency but no commodity, and "
                        f"{posting.account} would default to {choices[0]}."
                    )
                raise protocol.UsageError(
                    f"--posting {number} {given} Name the commodity: "
                    f"'{posting.account} NUMBER COMMODITY {{…}}' or '… NUMBER COMMODITY @ …'. Nothing was written."
                )
            units = units._replace(currency=choices[0])
            if from_operating:
                operating_defaults[number] = allowed.get(posting.account) or None
        # After the units are settled, so a missing commodity is named before a
        # missing total currency on a doubly bare posting (w5/800 keeps `3 {{240}}`).
        _refuse_currency_less_total(number, posting)
        # Parsed postings keep the input order, so the raw line with the `@@`
        # spelling sits at the same index; incomplete prices raised above.
        meta: dict[str, Any] = {}
        if number <= len(postings):
            total = _total_price(postings[number - 1])
            if total is not None:
                meta[writer.TOTAL_PRICE_META] = total
        normalized.append(posting._replace(units=units, meta=meta))
    if elided > 1:
        raise protocol.UsageError(_ONE_ELIDED)
    if elided == 1 and _inferred_leg_is_zero(normalized):
        raise protocol.UsageError(f"{_ZERO_NET_INFERRED} Nothing was written.")
    entry = entry._replace(postings=normalized, meta=write.metadata_for_write(entry.meta))
    # The answer below is built from this entry, so it is normalized first:
    # reporting the raw label while the file holds the escaped one cannot be
    # fed back (w5/733). Rendering normalizes again, harmlessly.
    entry = writer.normalize_entry_strings(entry)
    rendered = writer.format_entry(entry)
    totals = [(posting.meta or {}).get(writer.TOTAL_PRICE_META) for posting in entry.postings]
    # The `@@` stash served the render; the JSON answer must not carry it.
    # Normalized posting metas hold nothing else, so they go back to empty.
    entry = entry._replace(postings=[posting._replace(meta={}) for posting in entry.postings])
    # Encode the answer before the write, never after: the envelope is built
    # once this function returns, and a value it could not encode used to fail
    # with the directive already appended, so every retry appended another copy.
    answered = entry._replace(
        postings=writer.with_inferred_cost_parts(entry.postings, totals), meta=metadata_to_json(entry.meta)
    )
    directive = protocol.jsonable(answered)
    # A `@@` total is reported as the bulk schema's `price_total`, not as the
    # divided unit price, so feeding the answer back writes the same `@@`.
    for posting, total in zip(directive["postings"], totals, strict=True):
        posting["price_total"] = None if total is None else protocol.jsonable(total)
        if total is not None:
            posting["price"] = None
    warnings = write.append(
        file, [rendered], allow_errors=allow_errors, into=into, snapshot=snapshot, operating_defaults=operating_defaults
    )
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
_ONE_ELIDED = "Only one posting may omit its amount; supply amounts for the other postings."


def _amountless_postings(directive: Any) -> int:
    """Postings whose number booking must infer: no units, or units with a null number (w5/801)."""
    return sum(1 for posting in directive.postings if posting.units is None or posting.units.number is None)


def _directive_infers_zero(directive: Any) -> bool:
    """`_inferred_leg_is_zero` for a bulk row, which arrives as a model.

    The row is judged on the text it would be written as, parsed the way the
    ledger will read it; a `price_total` rides along as the exact `@@` total.
    """
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.data import Transaction
    from beancount.parser import parser

    if _amountless_postings(directive) != 1:
        return False
    entries, errors, _ = parser.parse_string(writer.format_transaction(directive))
    # Renamed roots read as invalid here, which used to skip this guard entirely.
    errors = without_root_name_errors(errors)
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
            # A total left for booking to interpolate (`{100 # USD}`) is known
            # only after it: calling copy_sign on the MISSING sentinel crashed
            # (w5/803). An empty `{# USD}` then reads as per-None-plus-total-None,
            # which the guard below already stands aside for.
            total = None if cost.number_total is MISSING else cost.number_total
            if cost.currency is MISSING or (per is None and total is None):
                return False
            weight = units.number * (per or 0)
            if total is not None:
                weight += total.copy_sign(units.number)
            weights[cost.currency] += weight
        elif price is not None:
            total = posting.meta.get(writer.TOTAL_PRICE_META) if posting.meta else None
            if total is not None:
                weights[total.currency] += total.number.copy_sign(units.number)
            else:
                weights[price.currency] += units.number * price.number
        else:
            weights[units.currency] += units.number
    # No posting with an amount leaves nothing to balance against, so the lone
    # amount-less leg is inferred as zero as well (w5/186).
    return all(weight == 0 for weight in weights.values())


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


def _refuse_currency_less_total(number: int, posting: Any) -> None:
    """A total cost without a currency names the missing part (w5/805).

    `{{240}}` parses, but the writer renders it as `{0 # 240}`, which needs a
    currency and failed as "a value that is not one token". Bulk already
    refuses the same shape ("a total cost needs currency", w5/384); the flag
    path refuses it here, before anything is rendered or written. A per-unit
    cost without a currency (`{80}`) and an interpolated total (`{100 # USD}`)
    are not total costs and pass through.
    """
    from beancount.core.number import MISSING

    from bea_engine import protocol

    cost = posting.cost
    if cost is None or cost.number_total is None or cost.number_total is MISSING:
        return
    if cost.currency is not MISSING:
        return
    total = format(cost.number_total, "f")
    example = "'{{" + total + " USD}}'"
    raise protocol.UsageError(
        f"--posting {number}: the total cost {total} has no currency; a total cost needs one "
        f"(for example {example}). Nothing was written."
    )


def _nfc(text: str) -> str:
    """One spelling for canonically equivalent input, matching the loaded ledger."""
    return unicodedata.normalize("NFC", text)


_PLAIN_NUMBER = r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?"
_META_DATE = r"[0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}"


def _is_typed_literal(raw: str, value: Any) -> bool:
    """Whether unquoted `raw` is, in full, one literal of the kind Beancount read it as.

    The metadata grammar evaluates arithmetic (`555-1234`, `1/3`), `Decimal`
    drops a zero-padded code's zeros (`02134`), a `,` is a digit separator,
    `5USD` lexes as an amount and everything after `;` is a comment. Each of
    those parses cleanly into a value nobody typed.
    """
    from beancount.core.amount import Amount

    if isinstance(value, bool):
        return raw.lower() in {"true", "false"}
    if isinstance(value, Decimal):
        return re.fullmatch(_PLAIN_NUMBER, raw) is not None
    if isinstance(value, Amount):
        match = re.fullmatch(rf"{_PLAIN_NUMBER}[ \t]+(\S+)", raw)
        return match is not None and match.group(1) == value.currency
    if isinstance(value, datetime.date):
        return re.fullmatch(_META_DATE, raw) is not None
    return False


def _may_be_typed(raw: str) -> bool:
    """Whether `raw` has the shape of a value whose reading is Beancount's to give.

    Everything else is stored as the text typed whatever the grammar makes of
    it, so it is never handed over: upstream's parser segfaults evaluating a
    zero divisor, and the cheque number `1045/0` took the engine down with
    "the outcome is unknown" (w5/272).
    """
    from beancount.core.amount import CURRENCY_RE

    if raw.startswith('"') or raw.lower() in {"true", "false"}:
        return True
    if re.fullmatch(rf"{_PLAIN_NUMBER}|{_META_DATE}", raw):
        return True
    amount = re.fullmatch(rf"{_PLAIN_NUMBER}[ \t]+(\S+)", raw)
    return amount is not None and re.fullmatch(CURRENCY_RE, amount.group(1)) is not None


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
        if not _may_be_typed(raw):
            # Text either way; the stand-in still lets Beancount judge the key.
            parsed_raw = '"x"'
        entries, errors, _ = parse_exact(f'2000-01-01 * ""\n  {key}: {parsed_raw}\n')
        errors = without_root_name_errors(errors)
        if raw.startswith('"') and not re.fullmatch(r'"((?:[^"\\]|\\.)*)"', raw):
            # A quoted literal followed by more text: the parser reads `; …`
            # as a comment and C-escapes the quotes' content, so keeping its
            # value stores text nobody typed (w5/727).
            match = re.match(r'"(?:[^"\\]|\\.)*"', raw)
            if match is None:
                raise protocol.UsageError(
                    f"Invalid --meta {key!r}; close the quoted string or supply a bare value such as '{key}:hello'.",
                    details=[str(error.message) for error in errors],
                )
            extra = raw[match.end() :].strip()
            raise protocol.UsageError(
                f"Invalid --meta {key!r}; the quoted string is closed but {extra!r} follows it. "
                "Remove the extra text, or store the value unquoted.",
            )
        if not errors and len(entries) == 1 and isinstance(entries[0], Transaction) and key in entries[0].meta:
            value = entries[0].meta[key]
            # Only the documented kinds keep the parser's reading. Unquoted
            # text the lexer happens to recognize — `#1042` as a tag, `NULL`,
            # an account — is still the text that was typed: taking the parsed
            # value dropped the `#` from a check number (w5/082).
            # The same holds for a value the grammar had to compute, normalize
            # or cut short to get there (w5/128): `2024-001` is not 2023.
            if literal := re.fullmatch(r'"((?:[^"\\]|\\.)*)"', raw):
                # One whole quoted literal is the text between its quotes.
                # The lexer's C-style escapes turned the `\t`, `\n` and `\f`
                # of a Windows path into control characters and dropped every
                # other backslash (w5/232); only `\"` and `\\` are escapes.
                metadata[key] = re.sub(r'\\(["\\])', r"\1", literal.group(1))
            else:
                metadata[key] = value if _is_typed_literal(raw, value) else raw
        elif errors and (key_errors := parser.parse_string(f'2000-01-01 * ""\n  {key}: "x"\n')[1]):
            # Judged on the key alone, with a value that cannot fail: testing
            # for `key:` inside the message blamed the key `name` for any
            # value Beancount reported as an "Invalid account name: …".
            raise protocol.UsageError(
                f"Invalid --meta key {key!r}; Beancount rejected it ({key_errors[0].message}).",
                details=[str(error.message) for error in key_errors],
            )
        elif raw.startswith('"'):
            # A whole literal the parser still rejects, such as an escape it
            # cannot read; every other quoted shape refused above (w5/727).
            raise protocol.UsageError(
                f"Invalid --meta {key!r}; close the quoted string or supply a bare value such as '{key}:hello'.",
                details=[str(error.message) for error in errors],
            )
        elif re.fullmatch(_META_DATE, raw):
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
    'use text, a boolean, a whole number, or a tagged object such as {"kind":"number","value":"1.25"}, '
    '{"kind":"date","value":"2026-08-03"} or {"kind":"amount","number":"5.25","currency":"USD"}.'
)


def _untagged_float_problem(value: float | JsonFloat) -> str:
    """Why an untagged JSON float is no metadata value, and the tagged number to send."""
    if isinstance(value, JsonFloat):
        return (
            f"JSON float {value.literal} cannot represent a decimal exactly. Send a tagged number instead, "
            f'such as {{"kind":"number","value":"{value.literal}"}}.'
        )
    if not math.isfinite(value):
        return f"{value!r} is not a finite number, so it has no decimal form; send it as text or leave it out."
    exact = format(Decimal(repr(value)), "f")
    return (
        f"JSON float {value!r} cannot represent a decimal exactly. Send a tagged number instead, "
        f'such as {{"kind":"number","value":"{exact}"}}.'
    )


def _bulk_meta_problems(location: str, meta: dict[str, Any]) -> list[str]:
    """Each bulk metadata value Beancount cannot write as asked, as `location.key: reason`.

    Write input only — listings convert loaded metadata without this check.
    Reserved source-location keys used to be dropped silently, and a value the
    printer cannot render (an array) escaped per-row handling, aborting the
    whole batch with no row number even under `--partial`. A key outside
    Beancount's grammar did the same when the batch was read back (w5/129).
    """
    problems = []
    for key, value in meta.items():
        path = f"{location}.{key}"
        if key in {"filename", "lineno"}:
            problems.append(
                f"{path}: Metadata key {key!r} is reserved for Beancount source location; choose another key."
            )
            continue
        if not re.fullmatch(r"[a-z][A-Za-z0-9_-]+", key):
            # `--meta`'s rule. The printer renders any key, so a bad one only
            # failed when the batch was read back — a usage error naming no
            # row, even under `--partial` — and a `__` key was dropped silently.
            problems.append(
                f"{path}: Invalid metadata key {key!r}; keys must match [a-z][A-Za-z0-9_-]+ "
                "(start with a lowercase letter, at least two characters)."
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
            currency = value.get("currency")
            if kind == "amount" and not (isinstance(currency, str) and is_commodity(currency)):
                # Printed bare, so `usd` only failed on read-back and a
                # non-string tripped an assertion in Beancount (w5/184).
                problems.append(
                    f"{path}: Invalid 'amount' metadata for {key!r}: currency must be one commodity "
                    f"such as 'USD'; got {currency!r}."
                )
                continue
            number = value.get("value" if kind == "number" else "number")
            if kind != "date" and isinstance(number, str):
                # Amounts' spelling rule: `Decimal()` alone reads `1_000`, `1e3`
                # and non-ASCII digits that no other write path accepts.
                try:
                    parse_decimal_number(number, grouping=False)
                except ValueError:
                    problems.append(
                        f"{path}: Invalid {kind!r} metadata for {key!r}: expected a decimal string with "
                        f"ASCII digits and no exponent or underscores, such as '1.25'; got {number!r}."
                    )
                    continue
        elif isinstance(value, (float, JsonFloat)):
            # Written through `Decimal(str(value))` (w3/230), a float recorded
            # its binary value: 12345678901234567890.123 became
            # 12345678901234567000, and 0.3-style values kept their noise
            # (w5/420). A JSON integer is exact and stays accepted.
            problems.append(f"{path}: {_untagged_float_problem(value)}")
            continue
        elif value is not None and not isinstance(value, str | bool | int):
            problems.append(f"{path}: Unsupported metadata value of type {type(value).__name__}; {_META_VALUE_HELP}")
            continue
        try:
            write.metadata_for_write({key: value})
        except protocol.LedgerError as exc:
            problems.append(f"{path}: {exc}")
    return problems


_SURROGATE = re.compile(r"[\ud800-\udfff]")


def _surrogate_problems(value: Any, path: str = "") -> list[str]:
    """Each string in a bulk row holding half a surrogate pair, as `field.path: reason`.

    JSON may spell a lone `\\ud83d` — what a tool leaves when it cuts text in
    the middle of an emoji — and the parser keeps it, but no UTF-8 file can
    hold one. It used to reach the first encode of the staged batch, a raw
    codec error that named no row and wrote nothing even under `--partial`.
    """

    def escaped(text: str) -> str:
        return _SURROGATE.sub(lambda match: f"\\u{ord(match[0]):04x}", text)

    if isinstance(value, str):
        found = _SURROGATE.search(value)
        if found is None:
            return []
        return [
            f"{path or 'transaction'}: Text holds an unpaired surrogate (\\u{ord(found[0]):04x}), usually half "
            "of a cut-off emoji, which cannot be written as UTF-8; send the whole character or remove it."
        ]
    if isinstance(value, dict):
        problems = []
        for key, item in value.items():
            name = str(key)
            here = f"{path}.{escaped(name)}" if path else escaped(name)
            if _SURROGATE.search(name):
                problems.extend(_surrogate_problems(name, f"{here} (key)"))
            problems.extend(_surrogate_problems(item, here))
        return problems
    if isinstance(value, list):
        return [
            problem
            for n, item in enumerate(value)
            for problem in _surrogate_problems(item, f"{path}.{n}" if path else str(n))
        ]
    return []


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
            surrogates = _surrogate_problems(item)
        except RecursionError:
            # The frontend refuses this depth first; a direct engine caller
            # gets the same usage error rather than a bare RecursionError.
            raise protocol.UsageError(f"Row {index + 1} nests JSON too deeply; send a flat array of rows.") from None
        if surrogates:
            rejected.extend(f"Row {index + 1}, {problem}" for problem in surrogates)
            rejected_rows.append(index)
            continue
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
        # The schema takes any string for an account, and the printer writes
        # it bare: `expenses:food` or `Expenses:Food Court` only failed when
        # the batch was read back (w5/184). The root is the ledger's to judge.
        for n, posting in enumerate(directive.postings):
            try:
                parse_account(posting.account)
            except protocol.UsageError as exc:
                meta_errors.append(f"Row {index + 1}, postings.{n}.account: {exc}")
        if not meta_errors:
            # Every later step renders the row; a failure there would abort
            # the whole batch and ignore --partial, so it is judged here. So
            # would text that does not read back as one transaction — a
            # keyword for a currency, say — which no field check above names.
            try:
                problem = write.one_entry_problem(writer.format_transaction(directive))
            except (protocol.LedgerError, ValueError, TypeError) as exc:
                meta_errors.append(f"Row {index + 1}: {exc}")
            else:
                if problem is not None:
                    meta_errors.append(f"Row {index + 1}: This row {problem}")
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
    # inferred posting would be written, then dropped by every read. So does
    # its one-elided-posting rule: two number-less legs each infer zero, a
    # ghost transaction the checks pass (w5/801).
    kept: list[tuple[int, Any]] = []
    for index, directive in valid:
        if _amountless_postings(directive) > 1:
            rejected.append(f"Row {index + 1}: {_ONE_ELIDED}")
            rejected_rows.append(index)
        elif _directive_infers_zero(directive):
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
    # appears later in the input. Partial recovery drops the rows that load's
    # errors name; only errors it cannot place need a bisection of the batch.
    # Rows that book in input order keep it; only a sale with no position to
    # book against moves after its same-day purchase (w5/730).
    valid = _booking_order(valid, file=file, allow_errors=allow_errors, into=into)
    batch_texts = [writer.format_transaction(d) for _, d in valid]
    try:
        write.validate_append(file, batch_texts, allow_errors=allow_errors, into=into)
    except protocol.LedgerError as batch_error:
        if not partial:
            message = str(batch_error)
            details = list(batch_error.details)
            result: dict[str, Any] = {
                "written": 0,
                "written_rows": [],
                "unwritten_rows": sorted(index for index, _ in valid),
            }
            # The rows the hint counts as valid are known, so the rest are
            # named here as `--partial` names them: the refusal said "the 49
            # valid rows" and left the user to bisect for the 50th (w5/337).
            named = _named_rows(file, batch_texts, batch_error, allow_errors=allow_errors, into=into)
            if named is not None:
                details = [
                    f"Row {index + 1}: {'; '.join(named[number])}"
                    for number, (index, _) in enumerate(valid)
                    if number in named
                ]
                result["rejected_rows"] = [index for number, (index, _) in enumerate(valid) if number in named]
                recoverable = len(valid) - len(named)
                if recoverable:
                    noun = "row" if recoverable == 1 else "rows"
                    message = f"{message} Pass --partial to append the {recoverable} valid {noun}."
            elif len(valid) > 1 and not _only_preexisting(batch_error):
                message = f"{message} Pass --partial to append the rows that validate."
            raise protocol.LedgerError(
                message, details=details, ledger_errors=list(batch_error.ledger_errors), result=result
            ) from batch_error
        if _only_preexisting(batch_error):
            # The ledger refuses every write by itself; no row is the cause,
            # so the failure is reported once, as the ledger's (w5/725).
            rejected_rows.extend(index for index, _ in valid)
            raise protocol.LedgerError(
                str(batch_error),
                details=[*rejected, *batch_error.details],
                ledger_errors=list(batch_error.ledger_errors),
                result={
                    "written": 0,
                    "written_rows": [],
                    "rejected_rows": rejected_rows,
                },
            ) from batch_error
        named = _named_rows(file, batch_texts, batch_error, allow_errors=allow_errors, into=into)
        if named is None:
            # Errors the batch error names are still dropped first when sibling
            # errors cannot be placed; only their remainder is bisected (w5/720).
            named = _refused_with_placed(file, batch_texts, batch_error, allow_errors=allow_errors, into=into)
        accepted: list[tuple[int, Any]] = []
        # Human labels count from 1, like the schema rejections above;
        # `rejected_rows` stays a zero-based index for scripts.
        if named is not None:
            for number, (index, directive) in enumerate(valid):
                if number in named:
                    rejected.append(f"Row {index + 1}: {'; '.join(named[number])}")
                    rejected_rows.append(index)
                else:
                    accepted.append((index, directive))
        else:
            refused = _refused_in_order(file, batch_texts, batch_error, allow_errors=allow_errors, into=into)
            for number, (index, directive) in enumerate(valid):
                err = refused.get(number)
                if err is None:
                    accepted.append((index, directive))
                else:
                    rejected.append(f"Row {index + 1}: {'; '.join(err.details) or str(err)}")
                    rejected_rows.append(index)
        valid = accepted

    warnings = writer.write_transactions(file, [d for _, d in valid], allow_errors=allow_errors, into=into)
    target = str(write.destination(file, into))

    if rejected:
        count = len(rejected_rows)
        noun = "row was" if count == 1 else "rows were"
        raise protocol.LedgerError(
            f"Added {len(valid)} of {len(rows)} transactions; {count} {noun} rejected.",
            details=rejected,
            ledger_errors=warnings,
            result={
                "written": len(valid),
                "written_rows": sorted(index for index, _ in valid),
                "rejected_rows": rejected_rows,
            },
        )
    return {"written": len(valid), "rejected": [], "warnings": warnings, "target": target}


def _batch_holdings(file: Path | None) -> list[Any]:
    """Ledger entries a bulk add's sales book against, or none when unreadable.

    A missing ledger holds no lots to match, so the reorder then behaves as
    it did before the gate (w5/543). A ledger that fails to load fails the
    batch's own validation next; the gate must not fail first (w5/730).
    """
    if file is None:
        return []
    from bea_engine import managed_load

    try:
        entries, _, _ = managed_load.load_file(file)
    except (OSError, ValueError):
        return []
    return entries


def _booking_order(
    valid: list[tuple[int, Any]], *, file: Path | None, allow_errors: bool, into: Path | None
) -> list[tuple[int, Any]]:
    """The order the batch books in: the same-day rule's, else the first alternative that validates.

    The rule above reads signs and sets, which cannot tell whether a sale
    books: a partial holding, the wrong cost lot, a purchase whose units
    booking infers, and a short opened and covered the same day each defeat
    it (w5/884). So when its order does not validate, the input order and the
    order that puts every same-day sale after its purchases are tried against
    the ledger, and the first that books wins. When none does, the rule's
    order stands and its refusal is the one reported.
    """
    ordered = _same_day_purchases_first(valid, file=file)
    if file is None:
        return ordered
    # Only a batch whose same-day rows could book another way is tried at all.
    eager = _same_day_purchases_first(valid, file=file, eager=True)

    def books(candidate: list[tuple[int, Any]]) -> bool:
        try:
            write.validate_append(
                file, [writer.format_transaction(d) for _, d in candidate], allow_errors=allow_errors, into=into
            )
        except protocol.LedgerError:
            return False
        return True

    def distinct(candidates: list[list[tuple[int, Any]]], alternative: list[tuple[int, Any]]) -> bool:
        return all([i for i, _ in alternative] != [i for i, _ in seen] for seen in candidates)

    candidates = [ordered]
    if distinct(candidates, valid):
        candidates.append(valid)
    eager_differs = distinct(candidates, eager)
    if len(candidates) == 1 and not eager_differs:
        return ordered
    for candidate in candidates:
        if books(candidate):
            return candidate
    # The eager order books anything with a same-day purchase of its lot first,
    # which also moves a sale that already books past its purchase and picks a
    # different LIFO/HIFO lot (w5/1002). So build the order row by row first,
    # which moves a row only as far as it must (w5/980), and keep the eager one
    # for a batch that the builder cannot place.
    built = _built_booking_order(valid, file=file, allow_errors=allow_errors, into=into)
    if built is not None:
        return built
    if eager_differs and books(eager):
        return eager
    return ordered


#: The advice lines a failed balance assertion adds to its error, which are no errors of their own.
_BALANCE_ADVICE = ("Balance assertions run at the start", "Review transactions against the existing assertion")


def _only_balance_failures(exc: protocol.LedgerError) -> bool:
    """Whether a refusal is nothing but balance assertions a part of the batch has not yet satisfied.

    A prefix of the rows can sit before an assertion that the whole batch
    meets, so it must not count as unbookable; the complete order is
    validated when it is written (w5/1007).
    """
    details = getattr(exc, "details", None) or []
    return bool(details) and all("Balance failed" in line or line.startswith(_BALANCE_ADVICE) for line in details)


def _built_booking_order(
    valid: list[tuple[int, Any]], *, file: Path, allow_errors: bool, into: Path | None
) -> list[tuple[int, Any]] | None:
    """An order found by placing each date's rows one at a time where the ledger accepts them, else None.

    Within a date, the first remaining row (in input order) that books after
    the rows already placed goes next, so a row waits only for what it needs.
    Earlier dates are placed first. Only reached when no whole-batch order
    tried above validates, and costs a validation per placement.

    A row that books first can still strand the rest: a transfer B→C ahead of
    its purchase opens an unlabelled short in B that the A→B transfer then
    cannot fill, and a sale ahead of its split opens a short the split cannot
    reduce (w5/980). So a dead end backs up and tries the next row that books
    there, within a bounded number of validations.
    """
    from collections import defaultdict

    by_date: dict[Any, list[tuple[int, Any]]] = defaultdict(list)
    for item in valid:
        by_date[item[1].date].append(item)

    def books(rows: list[tuple[int, Any]]) -> bool:
        try:
            write.validate_append(
                file, [writer.format_transaction(d) for _, d in rows], allow_errors=allow_errors, into=into
            )
        except protocol.LedgerError as exc:
            return _only_balance_failures(exc)
        return True

    budget = 0

    def extend(placed: list[tuple[int, Any]], remaining: list[tuple[int, Any]]) -> list[tuple[int, Any]] | None:
        nonlocal budget
        if not remaining:
            return placed
        for row in remaining:
            if budget <= 0:
                return None
            budget -= 1
            if books([*placed, row]):
                found = extend([*placed, row], [other for other in remaining if other is not row])
                if found is not None:
                    return found
        return None

    placed: list[tuple[int, Any]] = []
    for date in sorted(by_date):
        rows = by_date[date]
        # Enough for the row-by-row pass, n(n+1)/2 validations, with room to back up.
        budget = len(rows) ** 2 + 64
        found = extend(placed, rows)
        if found is None:
            return None
        placed = found
    return placed


def _same_day_purchases_first(
    valid: list[tuple[int, Any]], *, file: Path | None = None, eager: bool = False
) -> list[tuple[int, Any]]:
    """`valid` with each day's sales at cost after that day's purchases of the same lots (w5/543).

    Beancount books one date's entries in file order, and rows are appended
    in input order, so a broker export or a newest-first listing that put a
    same-day sale before the buy it closes found no lot: refused with `{}`,
    booked as a short position with an explicit cost. A row selling a
    commodity at cost that another row of the same date buys at cost into
    the same account moves after that date's other rows, keeping the slots
    each date held; nothing else changes order.

    A sale that already books in input order stays where it is: the ledger
    holds the lot through its date, or an earlier row bought it — the same
    date listed before it, or any earlier date anywhere in the input, since
    rows book chronologically. Only a sale with no position to book
    against moves after its same-day purchase (w5/730).

    `eager` drops that test: every sale with a same-day purchase of its lot
    moves behind it, and a purchase whose units are left to booking counts.
    """
    from collections import Counter, defaultdict

    def lots(directive: Any, negative: bool) -> set[tuple[str, str]]:
        # A null units number interpolates at booking, so its sign is unknown
        # here; it books no reorder either way (w5/801).
        return {
            (posting.account, posting.units.currency)
            for posting in directive.postings
            if posting.cost is not None
            and posting.units is not None
            and (
                (eager and not negative and posting.units.number is None)
                or (
                    posting.units.number is not None
                    and (posting.units.number < 0) == negative
                    and posting.units.number != 0
                )
            )
        }

    slots: dict[Any, list[int]] = defaultdict(list)
    for position, (_, directive) in enumerate(valid):
        slots[directive.date].append(position)
    by_date: dict[Any, list[Any]] = defaultdict(list)
    for _, directive in valid:
        by_date[directive.date].append(directive)
    earlier: dict[Any, set[tuple[str, str]]] = {}
    accumulated: set[tuple[str, str]] = set()
    for date in sorted(by_date):
        earlier[date] = set(accumulated)
        for directive in by_date[date]:
            accumulated |= lots(directive, negative=False)
    entries: list[Any] | None = None
    held_cache: dict[tuple[str, Any], dict[str, Decimal]] = {}

    def file_holds(account: str, currency: str, date: Any) -> bool:
        nonlocal entries
        key = (account, date)
        if key not in held_cache:
            if entries is None:
                entries = _batch_holdings(file)
            held_cache[key] = _held_through(entries, account, date)
        return held_cache[key].get(currency, Decimal(0)) != 0

    ordered = list(valid)
    for positions in slots.values():
        rows = [valid[position] for position in positions]
        bought = [lots(directive, negative=False) for _, directive in rows]
        buyers = Counter(lot for own in bought for lot in own)
        selling = [
            any(buyers[lot] > (lot in own) for lot in lots(directive, negative=True))
            for (_, directive), own in zip(rows, bought, strict=True)
        ]
        if not any(selling):
            continue
        date = rows[0][1].date
        before = set(earlier[date])
        gated = []
        for (_, directive), own, moves in zip(rows, bought, selling, strict=True):
            gated.append(
                moves
                and (
                    eager
                    or any(
                        buyers[lot] > (lot in own) and lot not in before and not file_holds(*lot, date)
                        for lot in lots(directive, negative=True)
                    )
                )
            )
            before |= own
        if not any(gated):
            continue
        rearranged = [row for row, sells in zip(rows, gated, strict=True) if not sells]
        rearranged += [row for row, sells in zip(rows, gated, strict=True) if sells]
        for position, row in zip(positions, rearranged, strict=True):
            ordered[position] = row
    return ordered


def _only_preexisting(batch_error: protocol.LedgerError) -> bool:
    """Whether the refused batch adds nothing wrong: the books were already broken (w5/725)."""
    return isinstance(batch_error, write.CandidateRejected) and batch_error.preexisting_only


def _named_rows(
    file: Path, texts: list[str], batch_error: protocol.LedgerError, *, allow_errors: bool, into: Path | None
) -> dict[int, list[str]] | None:
    """Positions in `texts` the refused batch's errors name, each with its own detail lines.

    The rows left over are confirmed with one more load, so `--partial` costs
    a fixed number of loads however long the batch is, where a trial per row
    cost a full ledger load and a re-parse of every accepted row (w5/123).
    None means the errors could not be attributed to rows, or the rest still fail.
    """
    if not isinstance(batch_error, write.CandidateRejected):
        return None
    rows, unplaced = _partitioned_rows(file, texts, batch_error, into=into)
    if unplaced:
        return None
    kept = [text for number, text in enumerate(texts) if number not in rows]
    if kept:
        try:
            write.validate_append(file, kept, allow_errors=allow_errors, into=into)
        except protocol.LedgerError:
            return None
    return {number: batch_error.details_at(rows[number]) for number in sorted(rows)}


def _refused_in_order(
    file: Path, texts: list[str], batch_error: protocol.LedgerError, *, allow_errors: bool, into: Path | None
) -> dict[int, protocol.LedgerError]:
    """Positions in `texts` the forward scan refuses, each with the refusal it met.

    Scanning in input order, every leading run that loads is kept and the row
    that breaks it is refused — which keeps a row a later kept row offsets
    even when it fails alone (row 1 of w5/720's four-row case). A trial per
    row would instead judge each row alone after the rows kept before it, but
    those trials cost a full load per row over a growing batch, so an error no
    row can be named for (an existing balance assertion the batch breaks) made
    `--partial` quadratic. Bisecting for the first refused row instead costs a
    load per halving while bad rows are few (w5/537); the loads spent past
    the rows decided accumulate, and once they pass one round's worth —
    bisection then costs more per row than judging in order, k·log n past n
    in aggregate — the rest are judged in order (w5/720). A batch that
    adds nothing wrong to already-broken books never reaches the search
    (w5/725); a batch that adds its own errors to them would bisect down
    to every row, so it keeps one trial per row.
    """
    spent = 0

    def refusal(candidate: list[str]) -> protocol.LedgerError | None:
        nonlocal spent
        spent += 1
        try:
            write.validate_append(file, candidate, allow_errors=allow_errors, into=into)
        except protocol.LedgerError as err:
            return err
        return None

    refused: dict[int, protocol.LedgerError] = {}
    kept: list[str] = []
    rest = list(range(len(texts)))
    error: protocol.LedgerError | None = batch_error
    ledger_loads: bool | None = None
    halvings = math.ceil(math.log2(max(len(texts), 2)))
    overspend = 0

    def judge_rest() -> None:
        for number in rest:
            found = refusal([*kept, texts[number]])
            if found is None:
                kept.append(texts[number])
            else:
                refused[number] = found

    while rest and error is not None:
        # `kept` with rest[:low] loads; `kept` with rest[:high] meets `error`.
        round_start = spent
        low, high = 0, len(rest)
        while high - low > 1:
            middle = (low + high) // 2
            found = refusal([*kept, *(texts[number] for number in rest[:middle])])
            if found is None:
                low = middle
            else:
                high, error = middle, found
        if not kept and low == 0:
            if ledger_loads is None:
                ledger_loads = refusal([]) is None
            if not ledger_loads:
                judge_rest()
                return refused
        decided = low + 1
        round_loads = spent - round_start
        refused[rest[low]] = error
        kept.extend(texts[number] for number in rest[:low])
        rest = rest[low + 1 :]
        error = refusal([*kept, *(texts[number] for number in rest)]) if rest else None
        # Loads spent past the rows decided, floored: a sparse head must not
        # subsidize a dense tail's halving searches (w5/720).
        overspend = max(0, overspend + round_loads + 1 - decided)
        if rest and error is not None and overspend > halvings + 1:
            judge_rest()
            return refused
    return refused


def _partitioned_rows(
    file: Path, texts: list[str], batch_error: write.CandidateRejected, *, into: Path | None
) -> tuple[dict[int, list[int]], bool]:
    """Positions in `texts` whose appended lines carry an error, and whether any error went unplaced.

    Each position maps to the positions of its errors in the batch error's
    `locations`. An error the spans cannot place (a balance assertion the
    batch breaks, or a location outside the appended blocks) no longer sinks
    the placed ones: the caller drops the named rows and searches only the
    remainder (w5/720).
    """
    locations = batch_error.locations
    if not locations:
        return {}, True
    target = write.destination(file, into)
    try:
        original = target.read_bytes() if target.exists() else b""
        content = write.appended_content(original, texts)
    except (OSError, UnicodeDecodeError):
        return {}, True
    # Blocks are appended one after another, each after one separating line;
    # walking back from the end gives every block's line span.
    spans: list[tuple[int, int]] = []
    end = content.count("\n")
    for text in reversed(texts):
        size = text.rstrip().count("\n") + 1  # the lexer's line count: `\n` only (w1/136)
        spans.append((end - size + 1, end))
        end -= size + 1
    spans.reverse()
    rows: dict[int, list[int]] = {}
    unplaced = False
    for position, (source, lineno) in enumerate(locations):
        if lineno is None or Path(source).resolve() != target:
            unplaced = True
            continue
        hits = [number for number, (first, last) in enumerate(spans) if first <= lineno <= last]
        if not hits:
            unplaced = True
            continue
        rows.setdefault(hits[0], []).append(position)
    return rows, unplaced


def _refused_with_placed(
    file: Path, texts: list[str], batch_error: protocol.LedgerError, *, allow_errors: bool, into: Path | None
) -> dict[int, list[str]] | None:
    """Refused positions in `texts` with detail lines, or None when no error names a row.

    The rows the batch error names are dropped and their remainder is
    confirmed with one load; when the remainder still fails it is bisected
    with the remainder's own refusal, and the dropped rows rejoin the refused
    with the batch error's lines for them (w5/720).
    """
    if not isinstance(batch_error, write.CandidateRejected):
        return None
    placed, _ = _partitioned_rows(file, texts, batch_error, into=into)
    if not placed:
        return None
    kept_numbers = [number for number in range(len(texts)) if number not in placed]
    if not kept_numbers:
        return None
    kept_texts = [texts[number] for number in kept_numbers]
    try:
        write.validate_append(file, kept_texts, allow_errors=allow_errors, into=into)
    except protocol.LedgerError as kept_error:
        found = _refused_in_order(file, kept_texts, kept_error, allow_errors=allow_errors, into=into)
        merged = {number: batch_error.details_at(placed[number]) for number in sorted(placed)}
        for number, err in found.items():
            merged[kept_numbers[number]] = ["; ".join(err.details) or str(err)]
        return merged
    return {number: batch_error.details_at(placed[number]) for number in sorted(placed)}


# --------------------------------------------------------------------------- #
# request field access — a bad request is a usage failure, not a traceback
# --------------------------------------------------------------------------- #


#: The `bea add` option each request field comes from. A blank value named
#: the internal field (`Request field 'currency'`) instead of the `-c` the
#: user typed (w5/425).
_OPTION_FOR_FIELD = {
    "account": "-a/--account",
    "amount": "--amount",
    "amount_currency": "--amount",
    "comment": "-m/--comment",
    "currency": "-c/--currency",
    "description": "-d/--description",
    "filename": "--filename",
    "source_account": "-s/--source",
    "type": "-t/--type",
}


#: What the user typed for each request field `add` builds from its command line.
_ARGUMENT_FOR_FIELD = {
    **_OPTION_FOR_FIELD,
    "narration": "The narration",
    "payee": "--payee",
    "postings": "-p/--posting",
    "tags": "--tag",
    "links": "--link",
    "meta": "--meta",
    "flag": "--flag",
    "path": "--path",
}


def _refuse_undecodable_arguments(request: dict[str, Any]) -> None:
    """Refuse a command-line value holding a byte that is not UTF-8, naming where it was typed.

    Python hands an argv byte it cannot decode — a Latin-1 `é` from an old
    script or terminal — over as a lone surrogate (U+DC80-U+DCFF). It reached
    Beancount's parser, which failed with a raw `UnicodeEncodeError` filed as a
    validation failure (w5/650); bulk rows already refused it (w5/185).
    """
    for field, value in request.items():
        for text in value if isinstance(value, list) else [value]:
            found = _SURROGATE.search(text) if isinstance(text, str) else None
            if found is None:
                continue
            label = _ARGUMENT_FOR_FIELD.get(field, f"The {field!r} value")
            code = ord(found[0])
            if 0xDC80 <= code <= 0xDCFF:
                raise protocol.UsageError(
                    f"{label} is not valid UTF-8 (byte 0x{code - 0xDC00:02x} at position {found.start()}); "
                    "re-type it in a UTF-8 terminal."
                )
            raise protocol.UsageError(
                f"{label} holds an unpaired surrogate (\\u{code:04x}), which cannot be written as UTF-8; "
                "send the whole character or remove it."
            )


def _text(request: dict[str, Any], field: str) -> str:
    value = request.get(field)
    if not isinstance(value, str):
        raise protocol.UsageError(f"The request is missing its {field!r}.")
    if not value.strip():
        option = _OPTION_FOR_FIELD.get(field)
        if option is not None:
            raise protocol.UsageError(f"{option} must not be empty; give it a value.")
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
