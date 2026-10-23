"""Write beancount directives to local .bean files."""

from __future__ import annotations

import datetime
import re
import unicodedata
from collections.abc import Callable, Iterable
from contextlib import contextmanager
from contextvars import ContextVar
from decimal import Context, Decimal
from pathlib import Path
from typing import Any, NamedTuple, cast

from beancount.core import account as beancount_account
from beancount.core.amount import Amount as BcAmount
from beancount.core.data import (
    Balance,
    Booking,
    Close,
    Commodity,
    Custom,
    Document,
    Event,
    Note,
    Open,
    Pad,
    Posting,
    Price,
    Query,
    Transaction,
)
from beancount.core.position import Cost, CostSpec, cost_to_str
from beancount.core.number import MISSING
from beancount.parser.printer import EntryPrinter
from beancount.utils import misc_utils

from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.models import (
    BalanceDirective,
    CloseDirective,
    CommodityDirective,
    CustomDirective,
    CustomDirectiveValueAccount,
    CustomDirectiveValueAmount,
    CustomDirectiveValueBoolean,
    CustomDirectiveValueDate,
    CustomDirectiveValueNumber,
    CustomDirectiveValueText,
    DocumentDirective,
    EventDirective,
    NoteDirective,
    OpenDirective,
    PadDirective,
    PriceDirective,
    TransactionDirective,
    TransactionHeader,
)
from bea_engine.ledger.text import single_line
from bea_engine import protocol


class _ValueType(NamedTuple):
    value: object
    dtype: type


escape_string: Callable[[str], str] = misc_utils.escape_string

TOTAL_PRICE_META = "__bea_total_price__"
"""Posting meta key carrying a `@@` total the Beancount object cannot hold.

Posting.price is always a unit price, so a parsed `@@` total would print
back as `@` with a divided, possibly repeating value. The stash rides the
`__` never-write convention — the printer, `metadata_for_write`, and
`metadata_to_json` all skip it — and only `DirectivePrinter` reads it.
The value is a Beancount Amount. A ledger file cannot smuggle the key in:
metadata names there are lowercase without leading underscores.
"""


class DirectivePrinter(EntryPrinter):
    """Preserve directive values when printing new writes or query exports.

    This only prepares values for Beancount syntax. Input normalization belongs
    to `format_entry`: an export must retain existing multiline ledger strings.
    """

    def __call__(self, entry: Any) -> str:
        fields = {
            Note: ("comment",),
            Document: ("filename",),
            Event: ("type", "description"),
            Custom: ("type",),
            Query: ("name", "query_string"),
        }.get(type(entry), ())
        if fields:
            entry = entry._replace(**{field: escape_string(getattr(entry, field)) for field in fields})
        if isinstance(entry, Custom):
            entry = entry._replace(
                values=[
                    _ValueType(escape_string(v.value) if v.dtype is str else _custom_value(v.value), v.dtype)
                    for v in entry.values
                ]
            )
        entry = entry._replace(meta=_fixed_point_metadata(entry.meta))
        if isinstance(entry, Transaction):
            # Upstream quotes a lot label but never escapes it. Cost and
            # CostSpec are both namedtuples; copy rather than mutate the input.
            entry = entry._replace(
                postings=[
                    _escape_cost_label(p)._replace(meta=_fixed_point_metadata(p.meta) if p.meta else p.meta)
                    for p in entry.postings
                ]
            )
        return str(super().__call__(entry))  # type: ignore[no-untyped-call]

    def render_posting_strings(self, posting: Any) -> tuple[str, str, str]:
        units = posting.units
        if units is not None and units is not MISSING and getattr(units, "currency", None) is MISSING:
            # A stated number with its currency left to interpolation: upstream
            # prints the sentinel class, which no ledger can hold (w5/926).
            placeholder = " \u0000currency"
            flag_account, position_str, weight_str = super().render_posting_strings(  # type: ignore[no-untyped-call]
                posting._replace(units=BcAmount(units.number, placeholder.strip()))
            )
            return flag_account, position_str.replace(placeholder, "", 1), weight_str
        flag_account, position_str, weight_str = super().render_posting_strings(posting)  # type: ignore[no-untyped-call]
        if isinstance(posting.cost, CostSpec):
            dropped = cost_to_str(posting.cost, self.dformat, True)  # type: ignore[no-untyped-call]
            faithful = _cost_spec_text(posting.cost, self.dformat)
            if faithful != dropped:
                position_str = position_str.replace(f"{{{dropped}}}", f"{{{faithful}}}", 1)
        elif isinstance(posting.cost, Cost) and posting.cost.label == "":
            # A booked cost is what a loaded ledger holds, so query exports and
            # a native importer's resolved lots reach here; upstream drops its
            # empty label, merging a lot the ledger kept apart (w5/915).
            booked = posting.cost
            spec = CostSpec(booked.number, None, booked.currency, booked.date, booked.label, False)
            dropped = cost_to_str(booked, self.dformat, True)  # type: ignore[no-untyped-call]
            position_str = position_str.replace(f"{{{dropped}}}", f"{{{_cost_spec_text(spec, self.dformat)}}}", 1)
        total = (posting.meta or {}).get(TOTAL_PRICE_META)
        if total is None:
            return flag_account, position_str, weight_str
        # Only a posting that holds a unit price has one to strip, and it is
        # the trailing one. A structured row carries the total alone, and
        # splitting there landed inside a lot label such as "AAPL @ Schwab".
        if posting.price is not None:
            position_str = position_str.rpartition(" @ ")[0] or position_str
        return flag_account, f"{position_str} @@ {total.to_string(self.dformat_max)}", weight_str


class _FixedPointDecimal(Decimal):
    """A Decimal that prints as fixed-point text, never `1E-8`.

    The upstream printer renders scalar metadata and custom values with
    `str()`, which switches to scientific notation below 1E-6; Beancount then
    reads `1E-8` back as the number 1 in commodity `E-8`.
    """

    def __str__(self) -> str:
        return format(self, "f")


def _fixed_point(value: Any) -> Any:
    return _FixedPointDecimal(value) if isinstance(value, Decimal) else value


class _CustomValueDecimal(Decimal):
    """A `custom` value that prints fixed-point, and parenthesized when negative.

    Custom values are printed space-separated, and Beancount's grammar reads
    `NUMBER - NUMBER` as a subtraction: `custom "budget" 5 -2` reloads as the
    single value `3`. A parenthesized value is its own value (`5 (-2)` reloads
    as `5` and `-2`), so a negative number is always written in parentheses —
    unambiguous wherever it sits, and byte-identical to before for positives.

    `__format__` is overridden as well as `__str__` because an Amount value
    renders through the display formatter (`'{:f}'.format(number)`), not `str`.
    """

    def __str__(self) -> str:
        text = Decimal.__format__(self, "f")
        return f"({text})" if self.is_signed() else text

    def __format__(self, spec: str, context: Context | None = None, /) -> str:
        del spec, context  # Every custom value is written at its own exact precision.
        return self.__str__()


def _unsigned_zero(value: Decimal) -> Decimal:
    """Zero without a sign: `-0.00` renders parenthesized but reloads as `0.00` (w5/729)."""
    return value.copy_abs() if value.is_zero() else value


def _custom_value(value: Any) -> Any:
    """One custom value, rendered so the written line reloads as the same value."""
    if isinstance(value, BcAmount) and isinstance(value.number, Decimal):
        return value._replace(number=_CustomValueDecimal(_unsigned_zero(value.number)))
    if isinstance(value, Decimal):
        return _CustomValueDecimal(_unsigned_zero(value))
    return value


def _cost_spec_text(cost: Any, dformat: Any) -> str:
    """A CostSpec rendered without losing what upstream's printer drops.

    `beancount.core.position.cost_to_str` prints a cost's currency only
    alongside a number, so a currency-only constraint (`{EUR}`) renders as the
    empty `{}` — a different lot selector, silently accepted by validation.
    Keep an explicit per-unit zero beside a total: `{0 # total CUR}` means
    `{{total CUR}}`, whereas `{# total CUR}` leaves the unit cost to interpolate.
    Likewise a missing total keeps its `#` interpolation marker.
    """
    parts: list[str] = []
    amounts: list[str] = []
    total = cost.number_total if isinstance(cost.number_total, Decimal) else None
    per = cost.number_per if isinstance(cost.number_per, Decimal) else None
    if per is not None:
        amounts.append(dformat.format(per))
    if total is not None or cost.number_total is MISSING:
        amounts.append("#")
        if total is not None:
            amounts.append(dformat.format(total))
    if isinstance(cost.currency, str):
        amounts.append(cost.currency)
    if amounts:
        parts.append(" ".join(amounts))
    if cost.date:
        parts.append(cost.date.isoformat())
    if cost.label is not None:
        parts.append(f'"{cost.label}"')
    if cost.merge:
        parts.append("*")
    return ", ".join(parts)


def _fixed_point_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    return {key: _fixed_point(value) for key, value in (meta or {}).items()}


#: A short lot by what names it: account, commodity, label, then the cost's number, currency and date.
ShortLot = tuple[str, str, str, Decimal | None, str | None, datetime.date | None]

#: Asks which lots the ledger being written holds short on a date (None: at its end); set around a write.
_SHORT_LOT_LABELS: ContextVar[Callable[[datetime.date | None], frozenset[ShortLot]]] = ContextVar(
    "short_lot_labels", default=lambda _date: frozenset()
)


#: The `(account, label)` short lots the entries normalized so far in this write open, for a cover that
#: follows its opening in the same batch; None outside a write that tracks them (w5/983).
BATCH_SHORT_LABELS: ContextVar[set[tuple[str, str]] | None] = ContextVar("batch_short_labels", default=None)


def _cost_parts(cost: Any, units: Any = None) -> tuple[Decimal | None, str | None, datetime.date | None]:
    """A cost's per-unit number, currency and date; a total is spread over the units as booking does (w5/1006)."""
    number = getattr(cost, "number", None)
    if number is None:
        number = getattr(cost, "number_per", None)
    total = getattr(cost, "number_total", None)
    count = getattr(units, "number", None)
    if isinstance(total, Decimal) and isinstance(count, Decimal) and count:
        number = ((number if isinstance(number, Decimal) else Decimal(0)) * abs(count) + total) / abs(count)
    elif isinstance(total, Decimal):
        number = None
    currency = getattr(cost, "currency", None)
    date = getattr(cost, "date", None)
    return (
        number if isinstance(number, Decimal) else None,
        currency if isinstance(currency, str) and currency else None,
        date if isinstance(date, datetime.date) else None,
    )


def held_short_lots(entries: Iterable[Any]) -> Callable[[datetime.date | None], frozenset[ShortLot]]:
    """The labelled lots the entries leave short, by full cost, as of a date.

    Netting by label alone let a long at another cost hide a real short, and
    netting over the whole ledger hid a short a later cover had already closed
    by the end, though a backdated cover meets it (w5/1001).
    """
    transactions = [entry for entry in entries if isinstance(entry, Transaction)]
    memo: dict[datetime.date | None, frozenset[ShortLot]] = {}

    def as_of(date: datetime.date | None) -> frozenset[ShortLot]:
        if date not in memo:
            nets: dict[ShortLot, Decimal] = {}
            for entry in transactions:
                if date is not None and entry.date > date:
                    continue
                for posting in entry.postings:
                    label = getattr(posting.cost, "label", None)
                    if not label or posting.units is None or posting.units.number is None:
                        continue
                    key = (posting.account, posting.units.currency, label, *_cost_parts(posting.cost, posting.units))
                    nets[key] = nets.get(key, Decimal(0)) + posting.units.number
            memo[date] = frozenset(key for key, net in nets.items() if net < 0)
        return memo[date]

    return as_of


def _covers_short(posting: Posting, label: str, held: frozenset[ShortLot]) -> bool:
    """Whether the lot this positive posting names, as far as it states it, is one that is short."""
    number, currency, date = _cost_parts(posting.cost, posting.units)
    units = posting.units
    commodity = getattr(units, "currency", None)
    return any(
        (account, held_commodity, held_label) == (posting.account, commodity, label)
        and number in (None, held_number)
        and currency in (None, held_currency)
        and date in (None, held_date)
        for account, held_commodity, held_label, held_number, held_currency, held_date in held
    )


@contextmanager
def short_lot_labels(entries: Callable[[], Iterable[Any]]) -> Any:
    """Make the ledger's short labelled lots known to `normalize_entry_strings` for one write (w5/925).

    `entries` is called at most once, and only when a positive posting carries a
    lot label, so a write that has none never reads the ledger for this.
    """
    memo: list[Callable[[datetime.date | None], frozenset[ShortLot]]] = []

    def labels(date: datetime.date | None) -> frozenset[ShortLot]:
        if not memo:
            memo.append(held_short_lots(entries()))
        return memo[0](date)

    token = _SHORT_LOT_LABELS.set(labels)
    batch = BATCH_SHORT_LABELS.set(set())
    try:
        yield
    finally:
        BATCH_SHORT_LABELS.reset(batch)
        _SHORT_LOT_LABELS.reset(token)


def normalize_entry_strings(entry: Any) -> Any:
    """Flatten untrusted directive text and metadata without mutating the input.

    Source filenames describe real paths, so they are left intact. Other string
    fields that agents type (payee, narration, cost label, note comment, event
    description, custom text) flatten CR/LF to spaces so every write stays one
    ledger line.
    """

    def metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
        return {
            key: single_line(value) if isinstance(value, str) and key != "filename" else value
            for key, value in (meta or {}).items()
        }

    def posting_strings(posting: Posting, date: datetime.date | None) -> Posting:
        # A lot label sits right before `@ price`, where a bidi override would
        # reorder how the rest of the row reads; it was written raw (w5/542).
        # A reduction's label is the exception: it selects an existing lot,
        # so escaping it would select nothing — it is matched, and written,
        # exactly as typed (w5/733).
        cost: Any = posting.cost
        units: Any = posting.units
        known = units is not None and units is not MISSING and getattr(units, "number", MISSING) is not MISSING
        label = getattr(cost, "label", None)
        # A short lot this write opens is remembered as it passes, so a cover
        # later in the same batch is not flattened into another lot's label
        # (w5/983).
        batch_short = BATCH_SHORT_LABELS.get()
        if known and units.number < 0 and isinstance(label, str) and label and batch_short is not None:
            batch_short.add((posting.account, label))
        # Negative units sell a lot; positive units cover one only when the
        # ledger holds that short lot, which only the ledger can say (w5/925).
        # Asked only for a labelled positive posting: any other write never
        # reads the ledger for this.
        reduction = known and (
            units.number < 0
            or (
                units.number > 0
                and isinstance(label, str)
                and bool(label)
                and (
                    (posting.account, label) in (batch_short or ())
                    or _covers_short(posting, label, _SHORT_LOT_LABELS.get()(date))
                )
            )
        )
        if not reduction and isinstance(getattr(cost, "label", None), str):
            posting = posting._replace(cost=cost._replace(label=single_line(cost.label)))
        return posting._replace(meta=metadata(posting.meta))

    entry = entry._replace(meta=metadata(entry.meta))
    if isinstance(entry, Transaction):
        entry = entry._replace(
            payee=single_line(entry.payee) if entry.payee is not None else None,
            narration=single_line(entry.narration) if entry.narration is not None else None,
            postings=[posting_strings(posting, entry.date) for posting in entry.postings],
        )
    elif isinstance(entry, Note):
        entry = entry._replace(comment=single_line(entry.comment))
    elif isinstance(entry, Event):
        entry = entry._replace(type=single_line(entry.type), description=single_line(entry.description))
    elif isinstance(entry, Custom):
        entry = entry._replace(
            type=single_line(entry.type),
            values=[
                value._replace(value=single_line(value.value)) if isinstance(value.value, str) else value
                for value in entry.values
            ],
        )
    return entry


def _escape_cost_label(posting: Posting) -> Posting:
    cost = posting.cost
    label = getattr(cost, "label", None)
    if cost is None or not isinstance(label, str):
        return posting
    return posting._replace(cost=cost._replace(label=escape_string(label)))


def nfc_entry_accounts(entry: Any) -> Any:
    """The entry with every account name in NFC, so new directives are canonical.

    Reads normalize to NFC before parsing, so a newly written NFD name would
    compare unequal to the identical account until the next load; emitting NFC
    keeps the file canonical from the first write. Untouched entries pass
    through unchanged.
    """
    if isinstance(entry, Transaction):
        postings = [
            posting._replace(account=unicodedata.normalize("NFC", posting.account)) for posting in entry.postings
        ]
        return entry._replace(postings=postings)
    if isinstance(entry, Pad):
        fields: dict[str, Any] = {"account": unicodedata.normalize("NFC", entry.account)}
        if entry.source_account is not None:
            fields["source_account"] = unicodedata.normalize("NFC", entry.source_account)
        return entry._replace(**fields)
    if isinstance(entry, (Open, Close, Balance, Note, Document)):
        return entry._replace(account=unicodedata.normalize("NFC", entry.account))
    if isinstance(entry, Custom):
        values = []
        for v in entry.values:
            if v.dtype is beancount_account.TYPE and isinstance(v.value, str):
                values.append(v._replace(value=unicodedata.normalize("NFC", v.value)))
            else:
                values.append(v)
        return entry._replace(values=values)
    return entry


def format_entry(entry: Any) -> str:
    """Normalize new directive input and print it without changing the entry."""
    entry = nfc_entry_accounts(entry)
    entry = normalize_entry_strings(entry)
    rendered = DirectivePrinter()(entry)  # type: ignore[no-untyped-call]
    first, separator, rest = rendered.partition("\n")
    if isinstance(entry, Open | Balance):
        # The upstream printer pads opens and balances to 47 columns. bean-format
        # leaves an open's spaces untouched and would carry a balance's padding
        # into every other line's alignment, so both start from a single space.
        # Metadata lines are unchanged.
        first = first.replace(f"{entry.account:47}", entry.account, 1)
    elif isinstance(entry, Price):
        # Likewise 22 columns each for the commodity and the amount.
        first = re.sub(r" {2,}", " ", first.replace(f"{entry.currency:<22}", entry.currency, 1))
    return first + separator + rest


def _append(
    file_path: Path,
    *texts: str,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: ledger_write.LedgerSnapshot | None = None,
    stages_pad: bool = False,
) -> list[str]:
    return ledger_write.append(
        file_path, list(texts), allow_errors=allow_errors, into=into, snapshot=snapshot, stages_pad=stages_pad
    )


def format_transaction(directive: TransactionHeader, *, loaded: bool = False) -> str:
    """A transaction model as Beancount text.

    `loaded` renders an entry the ledger already holds as it holds it: the
    write sanitizer turned a TAB into a literal `\\x09` and a line break into
    a space, so `list --details` showed strings that parse back as others (w5/834).
    """
    postings = []
    for p in directive.postings:
        # The schema forbids price and price_total together; a total travels
        # as a stash because a Beancount Posting cannot hold one.
        price = BcAmount(p.price.number, p.price.currency) if p.price else None
        meta = ledger_write.metadata_for_write(p.meta)
        if p.price_total is not None:
            price = None
            meta[TOTAL_PRICE_META] = BcAmount(p.price_total.number, p.price_total.currency)
        cost = None
        if p.cost is not None:
            # A total with no per-unit number is a total cost, `{{total}}`, as
            # `add transaction --json` reports one. Writing `{# total}` instead
            # would leave the per-unit cost to interpolate, a second unknown
            # beside an amount-less balancing leg.
            per = Decimal(0) if p.cost.number is None and p.cost.number_total is not None else p.cost.number
            cost = CostSpec(per, p.cost.number_total, p.cost.currency, p.cost.date, p.cost.label, False)
        postings.append(
            Posting(
                account=p.account,
                # A null number interpolates at booking, as the flag spelling
                # does; the printer reads MISSING, not None (w5/801).
                units=BcAmount(
                    cast(Decimal, p.units.number if p.units.number is not None else MISSING), p.units.currency
                )
                if p.units
                else None,
                cost=cost,
                price=price,
                flag=p.flag,
                meta=meta,
            )
        )
    entry = Transaction(
        meta=ledger_write.metadata_for_write(directive.meta),
        date=directive.date,
        flag=directive.flag,
        payee=directive.payee,
        narration=directive.narration,
        tags=frozenset(directive.tags),
        links=frozenset(directive.links),
        postings=postings,
    )
    if loaded:
        return str(DirectivePrinter()(entry))  # type: ignore[no-untyped-call]
    return str(format_entry(entry))


def write_transaction(
    file_path: Path, directive: TransactionDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    return _append(file_path, format_transaction(directive), allow_errors=allow_errors, into=into)


def write_transactions(
    file_path: Path, directives: list[TransactionDirective], *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    """Append a batch in one open/write. Byte-identical to writing them one at a time."""
    return _append(file_path, *(format_transaction(d) for d in directives), allow_errors=allow_errors, into=into)


def write_open(
    file_path: Path, directive: OpenDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    booking = None
    if directive.booking is not None:
        # Beancount declares AVERAGE but rejects every reduction booked with
        # it, so an account opened that way could buy and never sell.
        choices = ", ".join(member.name for member in Booking if member is not Booking.AVERAGE)
        if directive.booking == Booking.AVERAGE.name:
            raise protocol.UsageError(
                "Booking method 'AVERAGE' is not supported by Beancount: an account opened with it "
                f"can never reduce a position. Choose one of: {choices}."
            )
        try:
            booking = Booking[directive.booking]
        except KeyError as exc:
            raise protocol.UsageError(
                f"Unknown booking method {directive.booking!r}. Choose one of: {choices}."
            ) from exc
    entry = Open(
        meta={},
        date=directive.date,
        account=directive.account,
        currencies=directive.currencies if directive.currencies else [],
        booking=booking,
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_close(
    file_path: Path,
    directive: CloseDirective,
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: ledger_write.LedgerSnapshot | None = None,
) -> list[str]:
    entry = Close(meta={}, date=directive.date, account=directive.account)
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into, snapshot=snapshot)


def write_balance(
    file_path: Path,
    directive: BalanceDirective,
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: ledger_write.LedgerSnapshot | None = None,
) -> list[str]:
    entry = Balance(
        meta={},
        date=directive.date,
        account=directive.account,
        amount=BcAmount(directive.amount.number, directive.amount.currency),
        tolerance=directive.tolerance,
        diff_amount=None,
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into, snapshot=snapshot)


def write_pad(
    file_path: Path, directive: PadDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Pad(meta={}, date=directive.date, account=directive.account, source_account=directive.source_account)
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into, stages_pad=True)


def write_note(
    file_path: Path, directive: NoteDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Note(
        meta={}, date=directive.date, account=directive.account, comment=directive.comment, tags=None, links=None
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_event(
    file_path: Path, directive: EventDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Event(meta={}, date=directive.date, type=directive.type, description=directive.description)
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_price(
    file_path: Path, directive: PriceDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Price(
        meta={},
        date=directive.date,
        currency=directive.currency,
        amount=BcAmount(directive.amount.number, directive.amount.currency),
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_commodity(
    file_path: Path, directive: CommodityDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Commodity(
        meta=ledger_write.metadata_for_write(directive.meta), date=directive.date, currency=directive.currency
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_document(
    file_path: Path, directive: DocumentDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Document(
        meta={},
        date=directive.date,
        account=directive.account,
        filename=directive.filename,
        tags=frozenset(directive.tags) if directive.tags else None,
        links=frozenset(directive.links) if directive.links else None,
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_custom(
    file_path: Path, directive: CustomDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    values: list[_ValueType] = []
    for v in directive.values:
        if isinstance(v, CustomDirectiveValueText):
            values.append(_ValueType(value=v.value, dtype=str))
        elif isinstance(v, CustomDirectiveValueNumber):
            values.append(_ValueType(value=_unsigned_zero(v.value), dtype=Decimal))
        elif isinstance(v, CustomDirectiveValueAmount):
            values.append(_ValueType(value=BcAmount(_unsigned_zero(v.number), v.currency), dtype=BcAmount))
        elif isinstance(v, CustomDirectiveValueAccount):
            values.append(_ValueType(value=v.value, dtype=beancount_account.TYPE))  # type: ignore[arg-type]
        elif isinstance(v, CustomDirectiveValueBoolean):
            values.append(_ValueType(value=v.value, dtype=bool))
        elif isinstance(v, CustomDirectiveValueDate):
            values.append(_ValueType(value=v.value, dtype=datetime.date))
    entry = Custom(meta={}, date=directive.date, type=directive.type, values=values)
    text = format_entry(entry)
    _require_custom_roundtrip(values, text)
    return _append(file_path, text, allow_errors=allow_errors, into=into)


def _custom_value_key(value: Any, dtype: Any) -> tuple[str, str]:
    """One custom value as the pair that identifies it across a write and a read."""
    if dtype is beancount_account.TYPE:
        return ("account", str(value))
    if isinstance(value, bool):
        return ("boolean", "true" if value else "false")
    if isinstance(value, str):
        # Writes flatten CR/LF, so compare against the line that was written.
        return ("text", single_line(value))
    if isinstance(value, BcAmount):
        return ("amount", f"{value.number:f} {value.currency}")
    if isinstance(value, Decimal):
        return ("number", format(value, "f"))
    if isinstance(value, datetime.date):
        return ("date", value.isoformat())
    return ("other", str(value))


def _require_custom_roundtrip(values: list[_ValueType], text: str) -> None:
    """Refuse a `custom` line that Beancount would read back as other values.

    Custom values are free-form and space-separated, so the printer's output is
    not self-evidently the input: `5` then `-2` used to render as `5 -2`, which
    the grammar reads as the single value `3`. Parsing the rendered line back is
    the only check that covers every spelling, including ones nobody has met
    yet, and it costs one parse per written directive.
    """
    from beancount.parser import parser

    from bea_engine.ledger.text import without_root_name_errors

    entries, errors, _ = parser.parse_string(text)
    # An account value under a renamed root is the ledger's to judge (w5/080).
    errors = without_root_name_errors(errors)
    reloaded = entries[0].values if len(entries) == 1 and isinstance(entries[0], Custom) and not errors else None
    if reloaded is None:
        raise protocol.UsageError(
            f"The custom directive would not reload as written; nothing was written. Rendered: {text.strip()!r}",
            details=[error.message for error in errors],
        )
    wanted = [_custom_value_key(v.value, v.dtype) for v in values]
    got = [_custom_value_key(v.value, v.dtype) for v in reloaded]
    if wanted != got:
        raise protocol.UsageError(
            f"The custom directive would reload as different values; nothing was written. Rendered: {text.strip()!r}",
            details=[
                f"requested: {', '.join(f'{kind}:{shown}' for kind, shown in wanted)}",
                f"reloads as: {', '.join(f'{kind}:{shown}' for kind, shown in got)}",
            ],
        )


def _stated_cost_weight(cost: Any, number: Decimal) -> Decimal | None:
    """What a posting of `number` units weighs at a cost with nothing left to infer, else None."""
    per = getattr(cost, "number_per", None)
    total = getattr(cost, "number_total", None)
    if per is None and total is None and isinstance(getattr(cost, "number", None), Decimal):
        per = cost.number
    if not isinstance(getattr(cost, "currency", None), str):
        return None
    parts = [part for part in (per, total) if part is not None]
    if not parts or not all(isinstance(part, Decimal) for part in parts):
        return None
    return number * (per if per is not None else Decimal(0)) + (
        total.copy_sign(number) if total is not None else Decimal(0)
    )


def with_inferred_prices(postings: list[Any]) -> list[Any]:
    """The postings with a price that the file leaves to booking (`@ USD`, `@@ USD`) filled in.

    Import hashed and compared the omitted price as no price, so two purchases
    at different cash prices shared an identity and the second was skipped
    (w5/995). The price is solved when the other legs are all explicit amounts
    in its currency and it is the only open price; anything else is left as
    written. The written text is never changed.
    """
    from beancount.core.amount import Amount as BcAmount
    from beancount.core.number import MISSING

    open_prices = [
        index
        for index, posting in enumerate(postings)
        if posting.price is not None and posting.price.number is MISSING and posting.cost is None
    ]
    if len(open_prices) != 1:
        return postings
    index = open_prices[0]
    posting = postings[index]
    units = posting.units
    currency = posting.price.currency
    count = getattr(units, "number", None)
    if not isinstance(count, Decimal) or not count or not isinstance(currency, str):
        return postings
    others = Decimal(0)
    for other_index, other in enumerate(postings):
        if other_index == index:
            continue
        number = getattr(other.units, "number", None)
        if not isinstance(number, Decimal) or getattr(other.units, "currency", None) != currency:
            return postings
        if other.cost is not None or other.price is not None:
            return postings
        others += number
    solved = abs(others / count)
    if not solved or others * count > 0 or solved * abs(count) != abs(others):
        return postings
    price = BcAmount(solved, currency)
    return [*postings[:index], posting._replace(price=price), *postings[index + 1 :]]


def with_inferred_cost_parts(postings: list[Any], totals: list[Any]) -> list[Any]:
    """The postings with the one cost component the file leaves to booking filled in.

    `{# 0.50 USD}` and `{5 # USD}` leave a per-unit or total part for booking
    to infer. An answer that reported the open part as null did not replay: bulk
    read null beside a number as the other form (w5/949). Import compared a
    cost with the open part taken as zero, so two trades at different cash
    prices shared a lot and an id (w5/950). The part is solved from the other
    legs when they are all explicit amounts in the cost currency and the result
    reproduces the balance exactly; anything else is left as written. A part
    that solves to zero stays unstated. The written text is never changed: this
    is for answers and comparisons.
    """
    from beancount.core.number import MISSING

    for index, posting in enumerate(postings):
        cost = posting.cost
        units = posting.units
        if cost is None or units is MISSING or not isinstance(getattr(units, "number", None), Decimal):
            continue
        per, total = getattr(cost, "number_per", None), getattr(cost, "number_total", None)
        currency = cost.currency
        # Only a part the file left for booking: a booked Cost has none, and
        # `{5 USD}` states no total at all (None, not MISSING).
        if not isinstance(currency, str) or (per is MISSING) == (total is MISSING):
            continue
        if not isinstance(per if total is MISSING else total, Decimal):
            continue
        others = Decimal(0)
        for other_index, other in enumerate(postings):
            if other_index == index:
                continue
            other_units = other.units
            number = getattr(other_units, "number", None)
            if other_units is MISSING or not isinstance(number, Decimal):
                others = None  # type: ignore[assignment]
                break
            if other.cost is not None:
                # A fully stated cost weighs what it states, in its own currency
                # (w5/994); a part left to booking is not a known weight.
                weight = _stated_cost_weight(other.cost, number)
                if weight is None or other.cost.currency != currency:
                    others = None  # type: ignore[assignment]
                    break
                others += weight
            elif totals[other_index] is not None:
                priced = totals[other_index]
                if priced.currency != currency:
                    others = None  # type: ignore[assignment]
                    break
                others += priced.number.copy_sign(number)
            elif other.price is not None:
                if other.price.currency != currency:
                    others = None  # type: ignore[assignment]
                    break
                others += number * other.price.number
            elif other_units.currency == currency:
                others += number
            else:
                others = None  # type: ignore[assignment]
                break
        if others is None:
            continue
        needed = -others
        count = units.number
        if per is MISSING:
            assert isinstance(total, Decimal)
            solved = (needed - total.copy_sign(count)) / count
            rebuilt = count * solved + total.copy_sign(count)
            field = {"number_per": solved}
        else:
            solved = abs((needed - count * per).copy_sign(count))
            rebuilt = count * per + solved.copy_sign(count)
            field = {"number_total": solved}
        if not solved or solved < 0 or rebuilt != needed:
            continue
        postings = [*postings[:index], posting._replace(cost=cost._replace(**field)), *postings[index + 1 :]]
    return postings
