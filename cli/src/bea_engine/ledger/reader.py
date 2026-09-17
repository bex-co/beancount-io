"""Read and parse beancount directives from .bean files."""

from __future__ import annotations

import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import beancount.loader
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
    Price,
    Transaction,
)

from bea_engine.ledger.models import (
    Amount,
    BalanceDirective,
    CloseDirective,
    CommodityDirective,
    Cost,
    CustomDirective,
    CustomDirectiveValue,
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
    Posting,
    PriceDirective,
    SourceLocation,
    TransactionDirective,
)
from bea_engine.ledger.text import fold_account


def load_file(file_path: Path) -> tuple[list[Any], list[Any]]:
    """Load a ledger and hand back its errors instead of dropping them.

    The caller decides what an unloadable ledger means; a reader that silently
    discarded errors would let a partial journal look like the whole ledger.
    """
    entries, errors, _options = beancount.loader.load_file(str(file_path))
    return list(entries), list(errors)


def _in_date_range(
    entry_date: datetime.date,
    from_date: datetime.date | None,
    to_date: datetime.date | None,
) -> bool:
    if from_date and entry_date < from_date:
        return False
    if to_date and entry_date > to_date:
        return False
    return True


def _to_amount(bc_amount: Any) -> Amount:
    return Amount(number=Decimal(str(bc_amount.number)), currency=bc_amount.currency)


def metadata_to_json(meta: dict[str, Any] | None) -> dict[str, Any]:
    from beancount.core.amount import Amount as BcAmount

    result = {}
    for key, value in (meta or {}).items():
        if key in {"filename", "lineno"} or key.startswith("__"):
            continue
        if isinstance(value, Decimal):
            value = {"kind": "number", "value": str(value)}
        elif isinstance(value, datetime.date):
            value = {"kind": "date", "value": value.isoformat()}
        elif isinstance(value, BcAmount):
            value = {"kind": "amount", "number": str(value.number), "currency": value.currency}
        result[key] = value
    return result


def _to_transaction(entry: Any) -> TransactionDirective:
    postings = []
    for p in entry.postings:
        cost = None
        if p.cost is not None:
            cost = Cost(
                number=Decimal(str(p.cost.number)),
                currency=p.cost.currency,
                date=p.cost.date,
                label=p.cost.label,
            )
        price = _to_amount(p.price) if p.price is not None else None
        postings.append(
            Posting(
                account=p.account,
                units=_to_amount(p.units),
                cost=cost,
                price=price,
                flag=p.flag,
                meta=metadata_to_json(p.meta),
            )
        )
    return TransactionDirective(
        date=entry.date,
        flag=entry.flag,
        payee=entry.payee,
        narration=entry.narration,
        postings=postings,
        tags=sorted(entry.tags),
        links=sorted(entry.links),
        meta=metadata_to_json(entry.meta),
        source=SourceLocation(filename=entry.meta["filename"], lineno=entry.meta["lineno"]),
    )


def list_transactions(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
    newest: bool = False,
    flag: str | None = None,
    search: list[str] | None = None,
    tags: list[str] | None = None,
    links: list[str] | None = None,
) -> list[TransactionDirective]:
    terms = [(term or "").casefold() for term in search or []]
    wanted_tags = {tag.lstrip("#") for tag in tags or []}
    wanted_links = {link.lstrip("^") for link in links or []}
    results = []
    for entry in reversed(entries) if newest else entries:
        if not isinstance(entry, Transaction):
            continue
        if flag is not None and entry.flag != flag:
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and not any(fold_account(account) in fold_account(p.account) for p in entry.postings):
            continue
        if terms and not all(
            term in (entry.payee or "").casefold() or term in (entry.narration or "").casefold() for term in terms
        ):
            continue
        if wanted_tags and not wanted_tags.issubset(entry.tags or ()):
            continue
        if wanted_links and not wanted_links.issubset(entry.links or ()):
            continue
        results.append(_to_transaction(entry))
        if len(results) >= limit:
            break
    return results


def list_notes(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[NoteDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Note):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        results.append(
            NoteDirective(
                date=entry.date,
                account=entry.account,
                comment=entry.comment,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_prices(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    currency: str | None = None,
    limit: int = 50,
) -> list[PriceDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Price):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if currency and entry.currency.casefold() != currency.casefold():
            continue
        results.append(PriceDirective(date=entry.date, currency=entry.currency, amount=_to_amount(entry.amount)))
        if len(results) >= limit:
            break
    return results


def list_balances(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[BalanceDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Balance):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        results.append(
            BalanceDirective(
                date=entry.date, account=entry.account, amount=_to_amount(entry.amount), tolerance=entry.tolerance
            )
        )
        if len(results) >= limit:
            break
    return results


def list_opens(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[OpenDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Open):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        currencies = list(entry.currencies) if entry.currencies else []
        booking = None if entry.booking is None else getattr(entry.booking, "value", str(entry.booking))
        results.append(
            OpenDirective(
                date=entry.date,
                account=entry.account,
                currencies=currencies,
                booking=booking,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_closes(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[CloseDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Close):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        results.append(CloseDirective(date=entry.date, account=entry.account))
        if len(results) >= limit:
            break
    return results


def list_commodities(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    currency: str | None = None,
    limit: int = 50,
) -> list[CommodityDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Commodity):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if currency and entry.currency.casefold() != currency.casefold():
            continue
        results.append(
            CommodityDirective(
                date=entry.date,
                currency=entry.currency,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_events(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    limit: int = 50,
) -> list[EventDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Event):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        results.append(
            EventDirective(
                date=entry.date,
                type=entry.type,
                description=entry.description,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_documents(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[DocumentDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Document):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        tags = sorted(entry.tags) if entry.tags else []
        links = sorted(entry.links) if entry.links else []
        results.append(
            DocumentDirective(
                date=entry.date,
                account=entry.account,
                filename=_document_filename_for_json(entry),
                tags=tags,
                links=links,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def _document_filename_for_json(entry: Any) -> str:
    """Prefer the ledger-relative path token when Beancount resolved it absolutely.

    `add document` writes and returns the relative `--path`; the loader expands
    it. Relativize against the directive's source file so list matches add.
    """
    from pathlib import Path

    filename = str(entry.filename)
    source = entry.meta.get("filename") if getattr(entry, "meta", None) else None
    if not source:
        return filename
    try:
        path = Path(filename)
        root = Path(str(source)).resolve().parent
        if path.is_absolute():
            return str(path.resolve().relative_to(root))
    except (OSError, ValueError):
        return filename
    return filename


def list_customs(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    limit: int = 50,
) -> list[CustomDirective]:
    from beancount.core.amount import Amount as BcAmount

    results = []
    for entry in entries:
        if not isinstance(entry, Custom):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        values: list[CustomDirectiveValue] = []
        for v in entry.values:
            if isinstance(v.value, str) and v.dtype is str:
                values.append(CustomDirectiveValueText(kind="text", value=v.value))
            elif isinstance(v.value, BcAmount):
                values.append(
                    CustomDirectiveValueAmount(
                        kind="amount",
                        number=Decimal(str(v.value.number)),
                        currency=v.value.currency,
                    )
                )
            elif v.dtype is Decimal or isinstance(v.value, Decimal):
                values.append(CustomDirectiveValueNumber(kind="number", value=Decimal(str(v.value))))
            elif v.dtype is bool:
                values.append(CustomDirectiveValueBoolean(kind="bool", value=v.value))
            elif v.dtype is datetime.date:
                values.append(CustomDirectiveValueDate(kind="date", value=v.value))
            else:
                values.append(CustomDirectiveValueAccount(kind="account", value=str(v.value)))
        results.append(
            CustomDirective(
                date=entry.date,
                type=entry.type,
                values=values,
                meta=metadata_to_json(entry.meta),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_pads(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
) -> list[PadDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Pad):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account:
            needle = fold_account(account)
            if needle not in fold_account(entry.account) and needle not in fold_account(entry.source_account):
                continue
        results.append(PadDirective(date=entry.date, account=entry.account, source_account=entry.source_account))
        if len(results) >= limit:
            break
    return results
