"""Pydantic models for all beancount directives."""

from __future__ import annotations

import datetime
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal, NoReturn

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, PlainSerializer, model_validator

from bea_engine.amounts import require_decimal_notation, split_total_price


def _strip_sigil(sigil: str) -> Callable[[Any], Any]:
    """Accept a tag or link with or without its sigil.

    Beancount's printer writes the `#` or `^` itself, so a value that arrives
    carrying one would be emitted doubled (`^^inv-001`) and fail to parse. Both
    spellings are natural to type, so both are accepted and stored bare.
    """

    def strip(value: Any) -> Any:
        return value[1:] if isinstance(value, str) and value.startswith(sigil) else value

    return strip


Tag = Annotated[str, BeforeValidator(_strip_sigil("#"))]
Link = Annotated[str, BeforeValidator(_strip_sigil("^"))]


def _require_calendar_date(value: Any) -> Any:
    """Reject numeric JSON dates before Pydantic's datetime coercion muddies them."""
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, bool) or isinstance(value, int | float):
        raise ValueError("date must be a string in YYYY-MM-DD form, not a number.")
    return value


LedgerDate = Annotated[datetime.date, BeforeValidator(_require_calendar_date)]


# Listings must remain valid bulk input even when Decimal internally chooses
# exponent notation for a tiny number. Preserve all digits and trailing zeros.
AmountNumber = Annotated[
    Decimal,
    BeforeValidator(require_decimal_notation),
    PlainSerializer(lambda number: format(number, "f"), return_type=str, when_used="json"),
]


class Amount(BaseModel):
    number: AmountNumber
    currency: str


class Cost(BaseModel):
    number: AmountNumber
    currency: str
    date: datetime.date | None = None
    label: str | None = None


class Posting(BaseModel):
    model_config = ConfigDict(extra="forbid")
    account: str
    units: Amount | None = None
    cost: Cost | None = None
    price: Amount | None = None
    price_total: Amount | None = None
    flag: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def exclusive_price(cls, value: Any) -> Any:
        if isinstance(value, dict) and value.get("price") is not None and value.get("price_total") is not None:
            raise ValueError("Use either price or price_total for a posting, not both.")
        return value

    @model_validator(mode="before")
    @classmethod
    def amount_shorthand(cls, value: Any) -> Any:
        if not isinstance(value, dict) or "amount" not in value:
            return value
        if "units" in value:
            raise ValueError("Use either amount or units for a posting, not both.")
        value = dict(value)
        amount = value.pop("amount")
        if not isinstance(amount, str):
            raise ValueError("amount must be a string such as '-30 USD'.")
        if len(amount.split()) == 2:
            number, currency = amount.split()
            try:
                Decimal(number)
            except InvalidOperation:
                raise ValueError(
                    f"Could not parse amount {amount!r} as 'NUMBER CURRENCY': {number!r} is not a number. "
                    f"{_FRAGMENT_HELP}"
                ) from None
            value["units"] = {"number": number, "currency": currency}
            return value
        value |= _posting_fragment(amount)
        return value


_FRAGMENT_HELP = (
    "Use 'NUMBER CURRENCY' such as '-30 USD', optionally with a cost and price such as '3 HOOL {100 USD} @ 11 USD'."
)


def _posting_fragment(amount: str) -> dict[str, Any]:
    """Expand a cost/price shorthand fragment to structured posting fields.

    Plain two-token amounts never reach here; this is the lot spelling ('3
    HOOL {100 USD}'), parsed by Beancount's own grammar so the shorthand
    accepts exactly the native syntax. Numbers are formatted back to plain
    decimals: str() of a tiny Decimal would spell an exponent the schema
    refuses. A `@@` total is read from the raw text for the same reason the
    flag path reads it there: the parser divides it into a unit price.
    """
    from beancount.core.number import MISSING
    from beancount.parser import parser as beancount_parser

    def refuse(reason: str) -> NoReturn:
        raise ValueError(f"Could not parse amount {amount!r} as a posting fragment: {reason}. {_FRAGMENT_HELP}")

    if "\n" in amount or "\r" in amount:
        raise ValueError(f"amount {amount!r} must be one posting fragment without line breaks. {_FRAGMENT_HELP}")
    entries, errors, _ = beancount_parser.parse_string(
        f'2026-01-02 * "probe"\n  Assets:Probe {amount}\n  Equity:Probe\n'
    )
    entry: Any = entries[0] if len(entries) == 1 and not errors else None
    posting: Any = entry.postings[0] if entry is not None else None
    if posting is None:
        refuse(errors[0].message if errors else "it is not a valid posting")
    units = posting.units
    if units is MISSING or units.number is MISSING or units.currency is MISSING:
        refuse("no amount found")
    fields: dict[str, Any] = {
        "units": {"number": format(units.number, "f"), "currency": units.currency},
    }
    cost = posting.cost
    if cost is not None:
        if cost.number_total is not None and cost.number_total is not MISSING:
            raise ValueError(
                f"amount {amount!r} uses a total cost '{{{{...}}}}', which bulk input cannot express. "
                "Split the lot into a per-unit cost '{...}', or use `add transaction` for a total cost."
            )
        if cost.number_per is MISSING or cost.currency is MISSING:
            refuse("incomplete cost")
        fields["cost"] = {
            "number": format(cost.number_per, "f"),
            "currency": cost.currency,
            "date": cost.date,
            "label": cost.label,
        }
    total = split_total_price(amount)
    if total is not None:
        fields["price_total"] = {"number": total[0], "currency": total[1]}
    elif posting.price is not None:
        price = posting.price
        if price is MISSING or price.number is MISSING or price.currency is MISSING:
            refuse("incomplete price")
        fields["price"] = {"number": format(price.number, "f"), "currency": price.currency}
    return fields


class SourceLocation(BaseModel):
    filename: str
    lineno: int


class TransactionHeader(BaseModel):
    """A transaction's own fields, with no postings required under them.

    `bea add transaction` renders the header and appends the user's native
    posting lines as text, so it has to build one before any posting exists.
    It still needs validation: this is where a tag or link written with its
    sigil loses it, so that formatting does not write it a second time.
    """

    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    flag: str = "*"
    payee: str | None = None
    narration: str | None = None
    postings: list[Posting] = Field(default_factory=list)
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    source: SourceLocation | None = None
    generated: bool = Field(
        default=False,
        exclude=True,
        description="A plugin synthesized this row; it is not text in any ledger file. "
        "Excluded from dumps so only listings opt back in.",
    )


class TransactionDirective(TransactionHeader):
    """A complete transaction: a header and the postings it balances."""

    postings: list[Posting] = Field(min_length=1)


class OpenDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    currencies: list[str] = Field(default_factory=list)
    booking: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class CloseDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    generated: bool = Field(default=False, exclude=True)


class BalanceDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    amount: Amount
    tolerance: Decimal | None = None
    generated: bool = Field(default=False, exclude=True)


class PadDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    source_account: str
    generated: bool = Field(default=False, exclude=True)


class NoteDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    comment: str
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class EventDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    type: str
    description: str
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class PriceDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    currency: str
    amount: Amount
    generated: bool = Field(default=False, exclude=True)


class CommodityDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    currency: str
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class DocumentDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    filename: str
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class CustomDirectiveValueText(BaseModel):
    kind: Literal["text"]
    value: str


class CustomDirectiveValueNumber(BaseModel):
    kind: Literal["number"]
    value: Decimal


class CustomDirectiveValueAmount(BaseModel):
    kind: Literal["amount"]
    number: Decimal
    currency: str


class CustomDirectiveValueAccount(BaseModel):
    kind: Literal["account"]
    value: str


class CustomDirectiveValueBoolean(BaseModel):
    kind: Literal["bool"]
    value: bool


class CustomDirectiveValueDate(BaseModel):
    kind: Literal["date"]
    value: datetime.date


CustomDirectiveValue = Annotated[
    CustomDirectiveValueText
    | CustomDirectiveValueNumber
    | CustomDirectiveValueAmount
    | CustomDirectiveValueAccount
    | CustomDirectiveValueBoolean
    | CustomDirectiveValueDate,
    Field(discriminator="kind"),
]


class CustomDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    type: str
    values: list[CustomDirectiveValue] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)
