"""Pydantic models for all beancount directives."""

from __future__ import annotations

import datetime
from collections.abc import Callable
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator


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


class Amount(BaseModel):
    number: Decimal
    currency: str


class Cost(BaseModel):
    number: Decimal
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


class TransactionDirective(BaseModel):
    date: datetime.date
    flag: str = "*"
    payee: str | None = None
    narration: str | None = None
    postings: list[Posting]
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    source: SourceLocation | None = None


class OpenDirective(BaseModel):
    date: datetime.date
    account: str
    currencies: list[str] = Field(default_factory=list)


class CloseDirective(BaseModel):
    date: datetime.date
    account: str


class BalanceDirective(BaseModel):
    date: datetime.date
    account: str
    amount: Amount
    tolerance: Decimal | None = None


class PadDirective(BaseModel):
    date: datetime.date
    account: str
    source_account: str


class NoteDirective(BaseModel):
    date: datetime.date
    account: str
    comment: str


class EventDirective(BaseModel):
    date: datetime.date
    type: str
    description: str


class PriceDirective(BaseModel):
    date: datetime.date
    currency: str
    amount: Amount


class CommodityDirective(BaseModel):
    date: datetime.date
    currency: str


class DocumentDirective(BaseModel):
    date: datetime.date
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
    date: datetime.date
    type: str
    values: list[CustomDirectiveValue] = Field(default_factory=list)
