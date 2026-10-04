"""Write beancount directives to local .bean files."""

from __future__ import annotations

import datetime
import re
import unicodedata
from collections.abc import Callable
from decimal import Context, Decimal
from pathlib import Path
from typing import Any, NamedTuple

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
    Transaction,
)
from beancount.core.position import CostSpec, cost_to_str
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
        flag_account, position_str, weight_str = super().render_posting_strings(posting)  # type: ignore[no-untyped-call]
        if isinstance(posting.cost, CostSpec):
            dropped = cost_to_str(posting.cost, self.dformat, True)  # type: ignore[no-untyped-call]
            faithful = _cost_spec_text(posting.cost, self.dformat)
            if faithful != dropped:
                position_str = position_str.replace(f"{{{dropped}}}", f"{{{faithful}}}", 1)
        total = (posting.meta or {}).get(TOTAL_PRICE_META)
        if total is None:
            return flag_account, position_str, weight_str
        head, separator, _unit = position_str.rpartition(" @ ")
        base = head if separator else position_str
        return flag_account, f"{base} @@ {total.to_string(self.dformat_max)}", weight_str


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
        return f"({text})" if self.is_signed() and text != "-0" else text

    def __format__(self, spec: str, context: Context | None = None, /) -> str:
        del spec, context  # Every custom value is written at its own exact precision.
        return self.__str__()


def _custom_value(value: Any) -> Any:
    """One custom value, rendered so the written line reloads as the same value."""
    if isinstance(value, BcAmount) and isinstance(value.number, Decimal):
        return value._replace(number=_CustomValueDecimal(value.number))
    return _CustomValueDecimal(value) if isinstance(value, Decimal) else value


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
    if cost.label:
        parts.append(f'"{cost.label}"')
    if cost.merge:
        parts.append("*")
    return ", ".join(parts)


def _fixed_point_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    return {key: _fixed_point(value) for key, value in (meta or {}).items()}


def normalize_entry_strings(entry: Any) -> Any:
    """Flatten untrusted directive text and metadata without mutating the input.

    Source filenames describe real paths, so they are left intact. Other string
    fields that agents type (payee, narration, note comment, event description,
    custom text) flatten CR/LF to spaces so every write stays one ledger line.
    """

    def metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
        return {
            key: single_line(value) if isinstance(value, str) and key != "filename" else value
            for key, value in (meta or {}).items()
        }

    entry = entry._replace(meta=metadata(entry.meta))
    if isinstance(entry, Transaction):
        entry = entry._replace(
            payee=single_line(entry.payee) if entry.payee is not None else None,
            narration=single_line(entry.narration) if entry.narration is not None else None,
            postings=[posting._replace(meta=metadata(posting.meta)) for posting in entry.postings],
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


def _nfc_entry_accounts(entry: Any) -> Any:
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
    entry = _nfc_entry_accounts(entry)
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


def _append(file_path: Path, *texts: str, allow_errors: bool = False, into: Path | None = None) -> list[str]:
    return ledger_write.append(file_path, list(texts), allow_errors=allow_errors, into=into)


def format_transaction(directive: TransactionHeader) -> str:
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
                units=BcAmount(p.units.number, p.units.currency) if p.units else None,
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
        try:
            booking = Booking[directive.booking]
        except KeyError as exc:
            choices = ", ".join(member.name for member in Booking)
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
    file_path: Path, directive: CloseDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Close(meta={}, date=directive.date, account=directive.account)
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_balance(
    file_path: Path, directive: BalanceDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Balance(
        meta={},
        date=directive.date,
        account=directive.account,
        amount=BcAmount(directive.amount.number, directive.amount.currency),
        tolerance=directive.tolerance,
        diff_amount=None,
    )
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


def write_pad(
    file_path: Path, directive: PadDirective, *, allow_errors: bool = False, into: Path | None = None
) -> list[str]:
    entry = Pad(meta={}, date=directive.date, account=directive.account, source_account=directive.source_account)
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)


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
            values.append(_ValueType(value=v.value, dtype=Decimal))
        elif isinstance(v, CustomDirectiveValueAmount):
            values.append(_ValueType(value=BcAmount(v.number, v.currency), dtype=BcAmount))
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

    entries, errors, _ = parser.parse_string(text)
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
