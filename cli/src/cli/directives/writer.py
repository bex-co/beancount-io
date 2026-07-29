"""Write beancount directives to local .bean files."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import NamedTuple

from beancount.core import account as beancount_account
from beancount.core.amount import Amount as BcAmount
from beancount.core.data import (  # type: ignore[attr-defined]
    Balance,
    Close,
    Commodity,
    Cost as BcCost,
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
from beancount.parser.printer import format_entry

from cli.directives.models import (
    BalanceDirective,
    CloseDirective,
    CommodityDirective,
    CustomDirective,
    CustomDirectiveValueAccount,
    CustomDirectiveValueAmount,
    CustomDirectiveValueNumber,
    CustomDirectiveValueText,
    DocumentDirective,
    EventDirective,
    NoteDirective,
    OpenDirective,
    PadDirective,
    PriceDirective,
    TransactionDirective,
)


class _ValueType(NamedTuple):
    value: object
    dtype: type


def _append(file_path: Path, text: str) -> None:
    with file_path.open("a", encoding="utf-8") as f:
        f.write("\n" + text.rstrip() + "\n")


def write_transaction(file_path: Path, directive: TransactionDirective) -> None:
    postings = [
        Posting(
            account=p.account,
            units=BcAmount(p.units.number, p.units.currency),
            cost=BcCost(p.cost.number, p.cost.currency, p.cost.date, p.cost.label) if p.cost else None,
            price=BcAmount(p.price.number, p.price.currency) if p.price else None,
            flag=p.flag,
            meta=None,
        )
        for p in directive.postings
    ]
    entry = Transaction(
        meta={},
        date=directive.date,
        flag=directive.flag,
        payee=directive.payee,
        narration=directive.narration,
        tags=frozenset(directive.tags),
        links=frozenset(directive.links),
        postings=postings,
    )
    _append(file_path, format_entry(entry))


def write_open(file_path: Path, directive: OpenDirective) -> None:
    entry = Open(
        meta={},
        date=directive.date,
        account=directive.account,
        currencies=directive.currencies if directive.currencies else [],
        booking=None,
    )
    _append(file_path, format_entry(entry))


def write_close(file_path: Path, directive: CloseDirective) -> None:
    entry = Close(meta={}, date=directive.date, account=directive.account)
    _append(file_path, format_entry(entry))


def write_balance(file_path: Path, directive: BalanceDirective) -> None:
    entry = Balance(
        meta={},
        date=directive.date,
        account=directive.account,
        amount=BcAmount(directive.amount.number, directive.amount.currency),
        tolerance=None,
        diff_amount=None,
    )
    _append(file_path, format_entry(entry))


def write_pad(file_path: Path, directive: PadDirective) -> None:
    entry = Pad(meta={}, date=directive.date, account=directive.account, source_account=directive.source_account)
    _append(file_path, format_entry(entry))


def write_note(file_path: Path, directive: NoteDirective) -> None:
    entry = Note(
        meta={}, date=directive.date, account=directive.account, comment=directive.comment, tags=None, links=None
    )
    _append(file_path, format_entry(entry))


def write_event(file_path: Path, directive: EventDirective) -> None:
    entry = Event(meta={}, date=directive.date, type=directive.type, description=directive.description)
    _append(file_path, format_entry(entry))


def write_price(file_path: Path, directive: PriceDirective) -> None:
    entry = Price(
        meta={},
        date=directive.date,
        currency=directive.currency,
        amount=BcAmount(directive.amount.number, directive.amount.currency),
    )
    _append(file_path, format_entry(entry))


def write_commodity(file_path: Path, directive: CommodityDirective) -> None:
    entry = Commodity(meta={}, date=directive.date, currency=directive.currency)
    _append(file_path, format_entry(entry))


def write_document(file_path: Path, directive: DocumentDirective) -> None:
    entry = Document(
        meta={},
        date=directive.date,
        account=directive.account,
        filename=directive.filename,
        tags=frozenset(directive.tags) if directive.tags else None,
        links=frozenset(directive.links) if directive.links else None,
    )
    _append(file_path, format_entry(entry))


def write_custom(file_path: Path, directive: CustomDirective) -> None:
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
    entry = Custom(meta={}, date=directive.date, type=directive.type, values=values)
    _append(file_path, format_entry(entry))
