"""Pydantic models for all beancount directives."""

from __future__ import annotations

import datetime
from collections.abc import Callable
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, PlainSerializer, model_validator

from bea_engine.amounts import require_decimal_notation


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
    flag: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def amount_shorthand(cls, value: Any) -> Any:
        if not isinstance(value, dict) or "amount" not in value:
            return value
        if "units" in value:
            raise ValueError("Use either amount or units for a posting, not both.")
        value = dict(value)
        amount = value.pop("amount")
        if not isinstance(amount, str) or len(amount.split()) != 2:
            raise ValueError("amount must be a string such as '-30 USD'.")
        number, currency = amount.split()
        value["units"] = {"number": number, "currency": currency}
        return value


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


class TransactionDirective(TransactionHeader):
    """A complete transaction: a header and the postings it balances."""

    postings: list[Posting] = Field(min_length=1)


class OpenDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    currencies: list[str] = Field(default_factory=list)


class CloseDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str


class BalanceDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    amount: Amount
    tolerance: Decimal | None = None


class PadDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    source_account: str


class NoteDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    comment: str


class EventDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    type: str
    description: str


class PriceDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    currency: str
    amount: Amount


class CommodityDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    currency: str


class DocumentDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    filename: str
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)


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
