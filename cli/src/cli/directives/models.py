"""Pydantic models for all beancount directives.

Adapted from backend-cluster/beancount-ledger/app/schemas/entries.py.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class Amount(BaseModel):
    number: Decimal
    currency: str


class Cost(BaseModel):
    number: Decimal
    currency: str
    date: datetime.date
    label: str | None = None


class Posting(BaseModel):
    account: str
    units: Amount
    cost: Cost | None = None
    price: Amount | None = None
    flag: str | None = None


class TransactionDirective(BaseModel):
    date: datetime.date
    flag: str = "*"
    payee: str | None = None
    narration: str | None = None
    postings: list[Posting]
    tags: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)


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
    tags: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)


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


CustomDirectiveValue = Annotated[
    CustomDirectiveValueText | CustomDirectiveValueNumber | CustomDirectiveValueAmount | CustomDirectiveValueAccount,
    Field(discriminator="kind"),
]


class CustomDirective(BaseModel):
    date: datetime.date
    type: str
    values: list[CustomDirectiveValue] = Field(default_factory=list)
