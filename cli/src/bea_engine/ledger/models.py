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

from bea_engine.amounts import (
    JsonFloat,
    parse_exact,
    refuse_scientific_notation,
    refuse_zero_divisor,
    require_plain_decimal,
    split_total_price,
)
from bea_engine.ledger.text import parse_iso_date, require_commodity, require_flag, require_link, require_tag


def _strip_sigil(sigil: str) -> Callable[[Any], Any]:
    """Accept a tag or link with or without its sigil.

    Beancount's printer writes the `#` or `^` itself, so a value that arrives
    carrying one would be emitted doubled (`^^inv-001`) and fail to parse. Both
    spellings are natural to type, so both are accepted and stored bare.
    """

    def strip(value: Any) -> Any:
        return value[1:] if isinstance(value, str) and value.startswith(sigil) else value

    return strip


def _tag_or_link(sigil: str, check: Callable[[str], str]) -> Callable[[Any, ValidationInfo], Any]:
    """Accept one tag or link with or without its sigil, storing it bare.

    On a write, anything else is refused with this kind's message quoting the
    typed value: the shared refusal named both sigils and, running after the
    sigil was stripped, quoted `##c` back as `'#c'` (w5/722). A read strips
    as before and checks nothing.
    """

    strip = _strip_sigil(sigil)

    def parse(value: Any, info: ValidationInfo) -> Any:
        if not isinstance(value, str):
            return value
        context = info.context
        if isinstance(context, dict) and context.get("write_input"):
            return check(value)
        return strip(value)

    return parse


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
Tag = Annotated[str, BeforeValidator(_tag_or_link("#", require_tag))]
Link = Annotated[str, BeforeValidator(_tag_or_link("^", require_link))]
Commodity = Annotated[str, AfterValidator(_on_write(require_commodity))]
Flag = Annotated[str, AfterValidator(_on_write(require_flag))]


def _require_calendar_date(value: Any) -> Any:
    """Reject numeric JSON dates before Pydantic's datetime coercion muddies them."""
    if isinstance(value, datetime.datetime):
        return value
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, bool) or isinstance(value, int | float | JsonFloat):
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


class PostingPrice(BaseModel):
    """A posting's per-unit price; a loaded one may not have resolved its number.

    `@ USD` leaves the number to interpolation, and a ledger read with errors
    keeps Beancount's MISSING sentinel there: converting it raised a bare
    ConversionSyntax that blocked every partial listing (w5/1044). A read
    reports it as null; a write must still state the number.
    """

    model_config = ConfigDict(extra="forbid")
    number: AmountNumber | None
    currency: Commodity


class Units(BaseModel):
    """A posting's units, whose number Beancount interpolates when left null.

    `add transaction --json` reports a number-less posting (`HOOL {100 USD}`)
    with a null number, and the round-trip guarantee needs bulk input to read
    it back: null interpolates, exactly as the flag spelling does (w5/801).
    The key stays required — an omitted number is a typo, while an explicit
    null says the number was left open — and the currency with it: the flag
    path defaults the currency before answering, so an answer never leaves
    that open. Prices and every other amount keep a required number.

    `inferred` says the ledger line leaves this number to interpolation even
    though a listing reports the booked figure. It matters for a lot: native
    booking gives a stated quantity the transaction's date as its cost date,
    but an interpolated one keeps an unknown date, so two such purchases
    share one lot a partial sale can reduce. Replayed with explicit numbers
    they became two dated lots and the sale ambiguous (w5/1018). Bulk input
    with `inferred` writes the posting number-less again and refuses a row
    whose stated number differs from what booking then interpolates. Excluded
    from dumps; only a listing opts back in, for the postings it marks.
    """

    model_config = ConfigDict(extra="forbid")
    number: AmountNumber | None
    currency: Commodity
    inferred: bool = Field(default=False, exclude=True)

    @property
    def left_open(self) -> bool:
        """Whether the written posting leaves its number for booking to interpolate."""
        return self.number is None or self.inferred


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

    @model_validator(mode="after")
    def total_names_its_currency(self) -> Cost:
        # Beancount's `{# total CUR}` needs the currency, unlike a per-unit
        # `{150}`: without it the row rendered `{# 1500}` and was refused as
        # a field that is "not one token" (w5/384).
        if self.number_total is not None and self.currency is None:
            raise ValueError('a total cost needs "currency": give it alongside "number_total".')
        return self


class Posting(BaseModel):
    model_config = ConfigDict(extra="forbid")
    account: str
    units: Units | None = None
    cost: Cost | None = None
    price: PostingPrice | None = None
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
                # Not a bare decimal, but `--posting` still reads `1,234.56 USD`
                # and `84/2 USD`: let Beancount's grammar decide, as it does
                # for every longer amount.
                pass
            else:
                # A number Decimal reads but the flag path refuses (`1e3`,
                # `1_000`, `٤٥`) is refused by `units.number`'s spelling rule,
                # at that path.
                value["units"] = {"number": number, "currency": currency}
                return value
        fragment = _posting_fragment(amount)
        # The fragment's cost or price replaced the explicit field beside it,
        # changing the cost basis and lot without a word (w5/539).
        for key in fragment:
            if value.get(key) is not None:
                what = {"price_total": "a total price"}.get(key, f"a {key}")
                raise ValueError(
                    f"amount {amount!r} carries {what} and the posting also gives {key!r}; "
                    "give it in one place, not both."
                )
        value |= fragment
        return value

    @model_validator(mode="after")
    def price_needs_a_number(self, info: ValidationInfo) -> Posting:
        context = info.context
        if isinstance(context, dict) and context.get("write_input") and self.price and self.price.number is None:
            raise ValueError('price needs a "number"; give the per-unit price, or use price_total.')
        return self

    @model_validator(mode="after")
    def cost_needs_units(self, info: ValidationInfo) -> Posting:
        # Beancount's printer renders nothing for a cost beside missing units,
        # so the lot would be dropped and the posting written as a bare
        # balancing leg. Only a write is refused; a loaded row is never.
        context = info.context
        if not (isinstance(context, dict) and context.get("write_input")) or self.cost is None:
            return self
        if self.units is None:
            raise ValueError(
                "cost on a posting without units: add units (or amount) for the lot, "
                "or omit cost for a balancing posting."
            )
        if self.cost.number_total is not None and self.units.number == 0:
            # Booking divides the total by the units and raised a bare
            # `DivisionByZero` that aborted the whole batch (w5/538).
            from bea_engine.managed_load import ZERO_UNITS_TOTAL_COST

            raise ValueError(f"the posting {ZERO_UNITS_TOTAL_COST}")
        return self


_FRAGMENT_HELP = (
    "Use 'NUMBER CURRENCY' such as '-30 USD', optionally with a cost and price such as '3 HOOL {100 USD} @ 11 USD'."
)


def comment_start(text: str) -> int | None:
    """Where a `;` outside a quoted string starts a Beancount comment in `text`, if anywhere.

    The grammar ends a posting at that `;` and drops the rest, so typed text
    after it — a note, a price, a cost, or the amount itself — vanished from a
    written posting without a word (w5/298). Quoted cost labels may hold one.
    """
    quoted = escaped = False
    for index, char in enumerate(text):
        if escaped:
            escaped = False
        elif quoted and char == "\\":
            escaped = True
        elif char == '"':
            quoted = not quoted
        elif char == ";" and not quoted:
            return index
    return None


COMMENT_HELP = "Beancount would drop everything from that ';' on; put a note in metadata instead."


def _posting_fragment(amount: str) -> dict[str, Any]:
    """Expand a cost/price shorthand fragment to structured posting fields.

    A plain decimal and a currency never reach here; this is the lot spelling
    ('3 HOOL {100 USD}') and any number the grammar has to read ('1,234.56
    USD', '84/2 EUR'), parsed by Beancount's own grammar so the shorthand
    accepts exactly the native syntax. Numbers are formatted back to plain
    decimals: str() of a tiny Decimal would spell an exponent the schema
    refuses. A `@@` total is read from the raw text for the same reason the
    flag path reads it there: the parser divides it into a unit price.
    """
    from beancount.core.number import MISSING

    from bea_engine.query import readable_parser_message

    def refuse(reason: str) -> NoReturn:
        readable = readable_parser_message(reason, text=amount)
        stop = "" if readable.endswith(".") else "."
        raise ValueError(f"Could not parse amount {amount!r} as a posting fragment: {readable}{stop} {_FRAGMENT_HELP}")

    if "\n" in amount or "\r" in amount:
        raise ValueError(f"amount {amount!r} must be one posting fragment without line breaks. {_FRAGMENT_HELP}")
    if comment_start(amount) is not None:
        raise ValueError(f"amount {amount!r} contains a ';'. {COMMENT_HELP}")
    refuse_zero_divisor(amount)
    refuse_scientific_notation(amount)
    entries, errors, _ = parse_exact(f'2026-01-02 * "probe"\n  Assets:Probe {amount}\n  Equity:Probe\n')
    entry: Any = entries[0] if len(entries) == 1 and not errors else None
    posting: Any = entry.postings[0] if entry is not None else None
    if posting is None:
        refuse(errors[0].message if errors else "it is not a valid posting")
    units = posting.units
    if units is MISSING or units.number is MISSING:
        refuse("no amount found")
    if units.currency is MISSING:
        refuse("no currency found")
    fields: dict[str, Any] = {
        "units": {"number": format(units.number, "f"), "currency": units.currency},
    }
    cost = posting.cost
    if cost is not None:
        if cost.number_total is not None and cost.number_total is not MISSING:
            if cost.number_per is not None and cost.number_per is not MISSING and cost.number_per != 0:
                raise ValueError(
                    f"amount {amount!r} uses a per-unit cost with a total ('{{... # ...}}'), which the amount "
                    'shorthand cannot express. Use "units" with a structured "cost" carrying "number", '
                    '"number_total" and "currency".'
                )
            raise ValueError(
                f"amount {amount!r} uses a total cost '{{{{...}}}}', which the amount shorthand cannot express. "
                'Split the lot into a per-unit cost \'{...}\', or use "units" with a structured "cost" '
                'carrying "number_total" and "currency".'
            )
        # A part the fragment leaves out stays out: `{USD}`, `{2026-01-02}` and
        # `{}` select an existing lot, exactly as they do in `--posting`.
        fields["cost"] = {
            "number": None if cost.number_per is MISSING else format(cost.number_per, "f"),
            "currency": None if cost.currency is MISSING else cost.currency,
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
    matching_postings: list[Any] | None = Field(
        default=None,
        exclude=True,
        description="The postings an account-filtered listing narrowed to; ignored on input, so a "
        "`list transaction --account` answer can be fed back to `add transactions` (w5/540).",
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
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
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
    #: Relative to the file that wrote the directive, which `source` names (w5/833).
    filename: str
    tags: list[Tag] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
    source: SourceLocation | None = None
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
