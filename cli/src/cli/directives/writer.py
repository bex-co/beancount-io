"""Write beancount directives to local .bean files."""

from __future__ import annotations

import datetime
from decimal import Decimal
from pathlib import Path
from collections.abc import Callable
from typing import Any, NamedTuple

from beancount.core import account as beancount_account
from beancount.core.amount import Amount as BcAmount
from beancount.core.data import (
    Balance,
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
from beancount.core.position import CostSpec
from beancount.parser.printer import format_entry as upstream_format_entry
from beancount.utils import misc_utils

from cli import ledger_write
from cli.utils import single_line

from cli.directives.models import (
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
)


class _ValueType(NamedTuple):
    value: object
    dtype: type


escape_string: Callable[[str], str] = misc_utils.escape_string


def normalize_entry_strings(entry: Any) -> Any:
    """Flatten untrusted transaction text and metadata without mutating the input.

    Source filenames describe real paths, so they are left intact. Other
    directives' text fields and document paths retain their native semantics.
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
    return entry


def format_entry(entry: Any) -> str:
    """Fill upstream printer escaping gaps without changing the input entry."""
    entry = normalize_entry_strings(entry)
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
            values=[_ValueType(escape_string(v.value) if v.dtype is str else v.value, v.dtype) for v in entry.values]
        )
    rendered = str(upstream_format_entry(entry))
    if isinstance(entry, Open):
        # The upstream printer pads opens to 47 columns; bean-format leaves
        # those spaces untouched. Match init without changing metadata lines.
        first, separator, rest = rendered.partition("\n")
        rendered = first.replace(f"{entry.account:47}", entry.account, 1) + separator + rest
    return rendered


def _append(file_path: Path, *texts: str, allow_errors: bool = False, into: Path | None = None) -> list[str]:
    return ledger_write.append(file_path, list(texts), allow_errors=allow_errors, into=into)


def format_transaction(directive: TransactionDirective) -> str:
    postings = [
        Posting(
            account=p.account,
            units=BcAmount(p.units.number, p.units.currency) if p.units else None,
            cost=CostSpec(p.cost.number, None, p.cost.currency, p.cost.date, p.cost.label, False) if p.cost else None,
            price=BcAmount(p.price.number, p.price.currency) if p.price else None,
            flag=p.flag,
            meta=ledger_write.metadata_for_write(p.meta),
        )
        for p in directive.postings
    ]
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
    entry = Open(
        meta={},
        date=directive.date,
        account=directive.account,
        currencies=directive.currencies if directive.currencies else [],
        booking=None,
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
    entry = Commodity(meta={}, date=directive.date, currency=directive.currency)
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
    return _append(file_path, format_entry(entry), allow_errors=allow_errors, into=into)
