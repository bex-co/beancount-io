"""Pydantic models for all beancount directives."""

from __future__ import annotations

import datetime
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal, NoReturn

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
    ValidationInfo,
    model_validator,
)

from bea_engine.amounts import require_plain_decimal, split_total_price
from bea_engine.ledger.text import parse_iso_date, require_commodity, require_flag, require_tag_or_link


def _strip_sigil(sigil: str) -> Callable[[Any], Any]:
    """Accept a tag or link with or without its sigil.

    Beancount's printer writes the `#` or `^` itself, so a value that arrives
    carrying one would be emitted doubled (`^^inv-001`) and fail to parse. Both
    spellings are natural to type, so both are accepted and stored bare.
    """

    def strip(value: Any) -> Any:
        return value[1:] if isinstance(value, str) and value.startswith(sigil) else value

    return strip


#: Validation context for a directive built from a write request — `bea add`,
#: a bulk row. Only then are the single-token fields held to Beancount's
#: grammar; a row read back from a ledger is never refused for what a plugin
#: put in it, so one odd generated entry cannot fail a whole listing.
WRITE_INPUT: dict[str, bool] = {"write_input": True}


def _on_write(check: Callable[[str], str]) -> Callable[[Any, ValidationInfo], Any]:
    def validate(value: Any, info: ValidationInfo) -> Any:
        context = info.context
        return check(value) if isinstance(context, dict) and context.get("write_input") else value

    return validate


# Each is written as one bare token, so a write must supply exactly one: a
# value such as `a ^b` or one with a line break would otherwise print as extra
# tags, links or whole directives the caller never asked for.
Tag = Annotated[str, BeforeValidator(_strip_sigil("#")), AfterValidator(_on_write(require_tag_or_link))]
Link = Annotated[str, BeforeValidator(_strip_sigil("^")), AfterValidator(_on_write(require_tag_or_link))]
Commodity = Annotated[str, AfterValidator(_on_write(require_commodity))]
Flag = Annotated[str, AfterValidator(_on_write(require_flag))]


def _require_calendar_date(value: Any) -> Any:
    """Reject numeric JSON dates before Pydantic's datetime coercion muddies them."""
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, bool) or isinstance(value, int | float):
        raise ValueError("date must be a string in YYYY-MM-DD form, not a number.")
    if isinstance(value, str):
        # Strictly `YYYY-MM-DD`: Pydantic would read "1769904000" as a Unix
        # timestamp. Loaded rows arrive as date objects and never reach here.
        return parse_iso_date(value)
    return value


LedgerDate = Annotated[datetime.date, BeforeValidator(_require_calendar_date)]


# Listings must remain valid bulk input even when Decimal internally chooses
# exponent notation for a tiny number. Preserve all digits and trailing zeros.
AmountNumber = Annotated[
    Decimal,
    BeforeValidator(require_plain_decimal),
    PlainSerializer(lambda number: format(number, "f"), return_type=str, when_used="json"),
]


class Amount(BaseModel):
    # Unknown keys are refused, not dropped: a misspelled key inside a nested
    # object would otherwise leave a valid but different amount or lot.
    model_config = ConfigDict(extra="forbid")
    number: AmountNumber
    currency: Commodity


class Cost(BaseModel):
    """A lot's cost constraint: any of a per-unit number, a total, a currency.

    Every field is optional because Beancount's own cost syntax is: `{}` selects
    a lot without constraining it, `{EUR}` constrains only the commodity, and
    `{{250.00 USD}}` states a total with no per-unit figure. A required number
    and currency meant the answer `bea add transaction` gives for such a posting
    could not be fed back in, though `USAGE.md` promises that round trip.

    Because every field is optional, an unknown key must be refused: dropping
    a misspelled `number_per` left the valid selector `{USD}`, and booking then
    sold whichever lot it chose.
    """

    model_config = ConfigDict(extra="forbid")
    number: AmountNumber | None = None
    number_total: AmountNumber | None = None
    currency: Commodity | None = None
    date: LedgerDate | None = None
    label: str | None = None


class Posting(BaseModel):
    model_config = ConfigDict(extra="forbid")
    account: str
    units: Amount | None = None
    cost: Cost | None = None
    price: Amount | None = None
    price_total: Amount | None = None
    flag: Flag | None = None
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
            # A number Decimal reads but the flag path refuses (`1e3`, `1_000`,
            # `٤٥`) is refused by `units.number`'s spelling rule, at that path.
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
                f"amount {amount!r} uses a total cost '{{{{...}}}}', which the amount shorthand cannot express. "
                'Split the lot into a per-unit cost \'{...}\', or use "units" with a structured "cost" '
                'carrying "number_total" and "currency".'
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

    Reads use it too: Beancount accepts a transaction with no postings, so a
    loaded one must list rather than fail `TransactionDirective`'s input rule.
    """

    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    flag: Flag = "*"
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
    currencies: list[Commodity] = Field(default_factory=list)
    booking: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class CloseDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class BalanceDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    amount: Amount
    tolerance: AmountNumber | None = None
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class PadDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    account: str
    source_account: str
    meta: dict[str, Any] = Field(default_factory=dict)
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
    currency: Commodity
    amount: Amount
    meta: dict[str, Any] = Field(default_factory=dict)
    generated: bool = Field(default=False, exclude=True)


class CommodityDirective(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: LedgerDate
    currency: Commodity
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
    value: AmountNumber


class CustomDirectiveValueAmount(BaseModel):
    kind: Literal["amount"]
    number: AmountNumber
    currency: Commodity


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
