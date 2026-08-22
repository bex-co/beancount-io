"""Helpers to create entries."""

from __future__ import annotations

from decimal import Decimal as _Decimal
from typing import TYPE_CHECKING, Any, NamedTuple, overload

from beancount.core import account as _beancount_account
from beancount.core import data
from beancount.core.amount import A as BEANCOUNT_A
from beancount.core.amount import Amount as BeancountAmount
from beancount.core.position import Cost as BeancountCost
from beancount.core.position import Position as BeancountPosition


class _ValueType(NamedTuple):
    value: Any
    dtype: Any


if TYPE_CHECKING:  # pragma: no cover
    import datetime
    from collections.abc import Sequence
    from decimal import Decimal

    from .abc import Balance, Close, Commodity, Custom, Document, Event, Meta, Note, Open, Position, Posting, Price, Transaction
    from .flags import Flag
    from .protocols import Amount, Cost


@overload
def amount(amt: Amount) -> Amount: ...  # pragma: no cover


@overload
def amount(amt: str) -> Amount: ...  # pragma: no cover


@overload
def amount(amt: Decimal, currency: str) -> Amount: ...  # pragma: no cover


def amount(amt: Amount | Decimal | str, currency: str | None = None) -> Amount:
    """Amount from a string or tuple."""
    if isinstance(amt, str):
        return BEANCOUNT_A(amt)  # type: ignore[return-value]
    if hasattr(amt, "number") and hasattr(amt, "currency"):
        return amt
    if not isinstance(currency, str):  # pragma: no cover
        raise TypeError
    return BeancountAmount(amt, currency)  # type: ignore[return-value]


_amount = amount


def cost(
    number: Decimal,
    currency: str,
    date: datetime.date,
    label: str | None = None,
) -> Cost:
    """Create a Cost."""
    return BeancountCost(number, currency, date, label)


def position(units: Amount, cost: Cost | None) -> Position:
    """Create a Position."""
    return BeancountPosition(  # type: ignore[return-value]
        units,  # type: ignore[arg-type]
        cost,  # type: ignore[arg-type]
    )


def posting(
    account: str,
    units: Amount | str | None = None,
    cost: Cost | None = None,
    price: Amount | str | None = None,
    flag: str | None = None,
    meta: Meta | None = None,
) -> Posting:
    """Create a Beancount Posting."""
    if price is not None:
        price = amount(price)
    return data.Posting(  # type: ignore[return-value]
        account,
        amount(units) if units is not None else None,  # type: ignore[arg-type]
        cost,  # type: ignore[arg-type]
        price,  # type: ignore[arg-type]
        flag,
        dict(meta) if meta is not None else None,
    )


_EMPTY_SET: frozenset[str] = frozenset()


def transaction(
    meta: Meta,
    date: datetime.date,
    flag: Flag,
    payee: str | None,
    narration: str | None,
    tags: frozenset[str] | None = None,
    links: frozenset[str] | None = None,
    postings: list[Posting] | None = None,
) -> Transaction:
    """Create a Beancount Transaction."""
    return data.Transaction(  # type: ignore[return-value]
        dict(meta),
        date,
        flag,
        payee,
        narration if narration is not None else "",
        tags if tags is not None else _EMPTY_SET,
        links if links is not None else _EMPTY_SET,
        postings if postings is not None else [],  # type: ignore[arg-type]
    )


def balance(
    meta: Meta,
    date: datetime.date,
    account: str,
    amount: Amount | str,
    tolerance: Decimal | None = None,
    diff_amount: Amount | None = None,
) -> Balance:
    """Create a Beancount Balance."""
    return data.Balance(  # type: ignore[return-value]
        dict(meta),
        date,
        account,
        _amount(amount),  # type: ignore[arg-type]
        tolerance,
        diff_amount,  # type: ignore[arg-type]
    )


def close(
    meta: Meta,
    date: datetime.date,
    account: str,
) -> Close:
    """Create a Beancount Open."""
    return data.Close(  # type: ignore[return-value]
        dict(meta),
        date,
        account,
    )


def document(
    meta: Meta,
    date: datetime.date,
    account: str,
    filename: str,
    tags: frozenset[str] | None = None,
    links: frozenset[str] | None = None,
) -> Document:
    """Create a Beancount Document."""
    return data.Document(  # type: ignore[return-value]
        dict(meta),
        date,
        account,
        filename,
        tags,
        links,
    )


def note(
    meta: Meta,
    date: datetime.date,
    account: str,
    comment: str,
    tags: frozenset[str] | None = None,
    links: frozenset[str] | None = None,
) -> Note:
    """Create a Beancount Note."""
    return data.Note(  # type: ignore[return-value]
        dict(meta), date, account, comment, tags, links
    )


def open(
    meta: Meta,
    date: datetime.date,
    account: str,
    currencies: list[str],
    booking: data.Booking | None = None,
) -> Open:
    """Create a Beancount Open."""
    return data.Open(  # type: ignore[return-value]
        dict(meta),
        date,
        account,
        currencies,
        booking,
    )


def commodity(
    meta: Meta,
    date: datetime.date,
    currency: str,
) -> Commodity:
    """Create a Beancount Commodity directive."""
    return data.Commodity(dict(meta), date, currency)  # type: ignore[return-value]


def price(
    meta: Meta,
    date: datetime.date,
    currency: str,
    amount: Amount | str,
) -> Price:
    """Create a Beancount Price directive."""
    return data.Price(dict(meta), date, currency, _amount(amount))  # type: ignore[return-value, arg-type]


def event(
    meta: Meta,
    date: datetime.date,
    type: str,
    description: str,
) -> Event:
    """Create a Beancount Event directive."""
    return data.Event(dict(meta), date, type, description)  # type: ignore[return-value]


def custom(
    meta: Meta,
    date: datetime.date,
    type: str,
    values: Sequence[Any],
) -> Custom:
    """Create a Beancount Custom directive."""
    return data.Custom(dict(meta), date, type, list(values))  # type: ignore[return-value]


def custom_value_text(value: str) -> _ValueType:
    """Create a text custom directive value."""
    return _ValueType(value=value, dtype=str)


def custom_value_number(value: _Decimal) -> _ValueType:
    """Create a number custom directive value."""
    return _ValueType(value=value, dtype=_Decimal)


def custom_value_amount(number: _Decimal, currency: str) -> _ValueType:
    """Create an amount custom directive value."""
    return _ValueType(value=amount(number, currency), dtype=BeancountAmount)


def custom_value_account(value: str) -> _ValueType:
    """Create an account custom directive value."""
    return _ValueType(value=value, dtype=_beancount_account.TYPE)
