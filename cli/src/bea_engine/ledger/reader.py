"""Read and parse beancount directives from .bean files."""

from __future__ import annotations

import datetime
import os
import re
import unicodedata
from collections.abc import Sequence
from decimal import Decimal
from functools import cache
from pathlib import Path
from typing import Any

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
    TransactionHeader,
    Units,
)
from bea_engine.ledger.text import fold_account


def load_file(file_path: Path) -> tuple[list[Any], list[Any]]:
    """Load a ledger and hand back its errors instead of dropping them.

    The caller decides what an unloadable ledger means; a reader that silently
    discarded errors would let a partial journal look like the whole ledger.
    """
    from bea_engine import managed_load

    entries, errors, _options = managed_load.load_file(str(file_path))
    return list(entries), list(errors)


#: A directive line starts with its date, then the word naming the directive.
#: Beancount's lexer takes `-` or `/` as the separator — in any mix — and does
#: not require the month or day to be padded, so `2026/1/2` declares a
#: directive exactly as `2026-01-02` does. Matching only the ISO spelling made
#: every entry in a slash-dated ledger look synthesized: real transactions
#: were reported `generated` and disappeared from `--on-disk` entirely.
#:
#: The separator and digit counts are deliberately loose rather than a guess
#: at the lexer's exact grammar (it is compiled, so there is no pattern to
#: reuse). Being permissive is the safe direction here: what actually
#: distinguishes a synthesized entry is the directive word after the date, and
#: that check is unchanged.
#:
#: The lexer needs no whitespace between tokens either: `2024-01-07*"P"`,
#: `2024-01-06 txn"T"` and `2024-01-01open` all declare directives, so the
#: whitespace after the date is optional and the directive word is matched at
#: the start of what follows rather than as a whole whitespace-delimited token.
#:
#: The date is captured too: a plugin that clones a written entry to other
#: dates (the bundled forecast and amortize plugins, via `_replace`) keeps the
#: template's location, so only the copy whose date the line declares is the
#: one on disk (w1/113).
_DATE_TOKEN = re.compile(r"^\s*(\d{4})[-/](\d+)[-/](\d+)\s*(\S+)")

# A transaction line carries a flag where the other directives carry their
# own word: `txn`, `*`, the lexer's FLAG characters — all of which may run
# straight into the payee string — or one capital letter, which the lexer
# reads as a flag only when it stands alone (`P"x"` is a lexing error).
_TXN_TOKEN = re.compile(r"txn|[*!&#?%]|[A-Z]\Z")


@cache
def _source_lines(filename: str) -> tuple[str, ...] | None:
    """The ledger file's lines, or None when they cannot be read.

    The engine answers one invocation per process, so a cached read cannot
    outlive the file it came from. The cache is unbounded for the same reason:
    entries arrive in date order, so a ledger split into more include files
    than a bounded cache holds would evict and re-read a file per entry (w5/206).
    """
    try:
        # Decoded from bytes: `read_text` translates newlines, turning a lone
        # `\r` (pasted text, `\r\r\n` endings) into a line the lexer never counted.
        text = (
            Path(filename).read_bytes().decode("utf-8", errors="replace").removeprefix("\ufeff")
        )  # a BOM glued to the first line
        # The lexer numbers lines by `\n` alone; `splitlines` would also break
        # on U+2028, U+0085, form feed and friends inside strings or comments.
        return tuple(text.split("\n"))
    except OSError:
        return None


@cache
def _in_managed_cache(filename: str) -> bool:
    """Whether a source path is a managed price feed's cached revision."""
    from bea_engine.managed_price_cache import cache_root

    try:
        return Path(filename).resolve().is_relative_to(cache_root().resolve())
    except OSError:
        return False


def forget_source_lines() -> None:
    """Drop cached file reads, for a caller judging a load made after a write in this process.

    An in-process caller that imports twice (the engine's own tests, an
    embedding tool) otherwise judged the entries its first write appended as
    generated, since the cached lines ended before them.
    """
    _source_lines.cache_clear()
    _spelled_entries.cache_clear()


def shared_locations(entries: Sequence[Any]) -> frozenset[tuple[str, int]]:
    """The locations two or more directives of one type claim on one date.

    A plugin may stamp a new entry with its source's `filename` and `lineno`
    on the source's own date; that entry passed every on-disk test, so
    `--on-disk` kept a row `grep` cannot find (w5/401). Copies on other dates
    (forecast, amortize) are already told apart by their date, and the copy
    such a plugin keeps may carry a rewritten narration, so only a same-date
    claim is settled by the line's text.
    """
    seen: set[tuple[str, int, Any, str]] = set()
    shared: set[tuple[str, int]] = set()
    for entry in entries:
        meta = entry.meta or {}
        lineno = meta.get("lineno")
        if not isinstance(lineno, int):
            continue
        # Every directive type: a plugin's inverse `price` stamped with the
        # price line's location passed as on disk too (w5/507).
        key = (str(meta.get("filename")), lineno, entry.date, type(entry).__name__)
        if key in seen:
            shared.add(key[:2])
        seen.add(key)
    return frozenset(shared)


@cache
def _spelled_entries(filename: str) -> dict[int, Any]:
    """The directives a file spells, indexed by line and parsed without plugins.

    Read with the parser, not a pattern over one line: a quoted word in a
    trailing `;` comment was taken for the narration, and a narration
    spanning lines never matched, so the real transaction at a shared
    location counted as generated (w5/507). Import checks every transaction's
    header, so parse each file once rather than a window for every row.
    """
    from beancount.parser import parser

    lines = _source_lines(filename)
    if lines is None:
        return {}
    # Match the loader's NFC reading and source filename: a relative document
    # path resolves beside its declaring file, whatever the process's cwd.
    entries, _, _ = parser.parse_string(unicodedata.normalize("NFC", "\n".join(lines) + "\n"), report_filename=filename)
    return {entry.meta["lineno"]: entry for entry in entries}


def _declares(entry: Any, *, strict: bool = False) -> bool | None:
    """Whether this entry is spelled at its location; None if no declaration can be read.

    `strict` is for a location two entries claim: a plugin's copy of a
    transaction keeps the source's header, so the flag and the amounts the
    line states must agree too, or both copies passed as written (w5/937).
    """
    meta = entry.meta or {}
    lineno = meta.get("lineno")
    if not isinstance(lineno, int):
        return None
    spelled = _spelled_entries(str(meta.get("filename"))).get(lineno)
    if spelled is None:
        return None
    if type(spelled) is not type(entry):
        return False
    if isinstance(entry, Transaction):

        def header(item: Any) -> tuple[str | None, str]:
            return (
                unicodedata.normalize("NFC", item.payee) if item.payee else None,
                unicodedata.normalize("NFC", item.narration or ""),
            )

        if header(entry) != header(spelled):
            return False
        return not strict or (entry.flag == spelled.flag and _amounts_declared(entry, spelled))
    ignored = {"meta", "postings", "diff_amount", "tolerance", "booking"}
    return all(getattr(entry, name) == getattr(spelled, name) for name in entry._fields if name not in ignored)


def _amounts_declared(entry: Any, spelled: Any) -> bool:
    """Whether the amounts the source line states are the entry's own.

    Booking and interpolation fill in what the line leaves out and may split a
    reduction, so only a statement the line makes can disagree: postings are
    compared one for one when the counts match, and a number the line omits
    agrees with anything. When the counts differ (booking split a reduction by
    lot, or a plugin re-divided a posting) the totals each account states in
    each currency are compared instead; an account with a posting that omits
    its amount has nothing to compare (w5/991).
    """
    from beancount.core.number import MISSING

    if len(entry.postings) != len(spelled.postings):
        return _totals_declared(entry, spelled)
    for booked, stated in zip(entry.postings, spelled.postings, strict=True):
        if booked.account != stated.account:
            return False
        units = stated.units
        if units is None or units is MISSING:
            continue
        if units.number is not MISSING and units.number != booked.units.number:
            return False
        if units.currency is not MISSING and units.currency and units.currency != booked.units.currency:
            return False
    return True


def _totals_declared(entry: Any, spelled: Any) -> bool:
    """Whether every account's stated total per currency is what the entry holds."""
    from beancount.core.number import MISSING

    stated: dict[tuple[str, str], Any] = {}
    open_accounts: set[str] = set()
    for posting in spelled.postings:
        units = posting.units
        if (
            units is None
            or units is MISSING
            or units.number is MISSING
            or not units.currency
            or units.currency is MISSING
        ):
            open_accounts.add(posting.account)
            continue
        key = (posting.account, units.currency)
        stated[key] = stated.get(key, 0) + units.number
    held: dict[tuple[str, str], Any] = {}
    for posting in entry.postings:
        if posting.units is not None and posting.units.number is not None:
            key = (posting.account, posting.units.currency)
            held[key] = held.get(key, 0) + posting.units.number
    return all(held.get(key) == total for key, total in stated.items() if key[0] not in open_accounts)


def authored_prices(snapshot: Any) -> list[Any]:
    """The price directives the ledger's files declare, parsed without plugins (w5/992).

    A plugin may filter prices out of the loaded view or rewrite one (an
    inverted pair), so the duplicate and conflict decisions for a quote read
    what the files spell. Each keeps its filename and line.
    """
    from beancount.parser import parser

    from bea_engine.managed_price_cache import managed_source_for_path

    prices: list[Any] = []
    for path, content in sorted(snapshot.contents.items()):
        if managed_source_for_path(Path(path)) is not None:
            continue
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError:
            continue
        parsed, _, _ = parser.parse_string(unicodedata.normalize("NFC", text), report_filename=str(path))
        prices.extend(entry for entry in parsed if isinstance(entry, Price))
    return prices


def entry_generated(
    entry: Any,
    directive_type: str,
    shared: frozenset[tuple[str, int]] = frozenset(),
    *,
    require_declaration: bool = False,
) -> bool:
    """Whether a plugin synthesized this entry rather than the ledger declaring it.

    A synthesized entry either points nowhere real (`<auto_accounts>`) or
    borrows a real line that declares something else (an implicit price
    stamped with its transaction's location), or copies a real entry to
    another date while keeping its location (a forecast or amortization
    plugin). So the entry is on disk only when its file exists and the line
    there starts this directive on this entry's date — exactly what `grep`
    would find.

    A managed price feed's entry is not on disk either: its line is real, but
    it sits in the price cache, not in any file of the ledger. An exported
    snapshot is an ordinary local file and its rows are written.

    Import requires the transaction's declaration even at a unique location:
    a forecast may replace its template with a same-date, rewritten copy.
    Listings retain their date/location policy unless a location is shared.
    """
    meta = getattr(entry, "meta", None) or {}
    filename = meta.get("filename")
    lineno = meta.get("lineno")
    if not filename or not isinstance(lineno, int) or isinstance(lineno, bool) or lineno < 1:
        return True
    if _in_managed_cache(str(filename)):
        return True
    lines = _source_lines(str(filename))
    if lines is None or lineno > len(lines):
        return True
    match = _DATE_TOKEN.match(lines[lineno - 1])
    if match is None:
        return True
    year, month, day, token = match.groups()
    entry_date = getattr(entry, "date", None)
    if isinstance(entry_date, datetime.date):
        try:
            if entry_date != datetime.date(int(year), int(month), int(day)):
                return True
        except ValueError:
            return True
    if directive_type == "transaction":
        if _TXN_TOKEN.match(token) is None:
            return True
    elif not token.startswith(directive_type):
        return True
    # Two entries at one location: only the one the line spells is written.
    contested = (str(filename), lineno) in shared
    if require_declaration:
        return _declares(entry, strict=contested) is not True
    return contested and _declares(entry, strict=True) is False


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


def _to_units(bc_amount: Any) -> Units:
    return Units(number=Decimal(str(bc_amount.number)), currency=bc_amount.currency)


def metadata_to_json(meta: dict[str, Any] | None) -> dict[str, Any]:
    from beancount.core.amount import Amount as BcAmount

    result = {}
    for key, value in (meta or {}).items():
        if key in {"filename", "lineno"} or key.startswith("__"):
            continue
        if isinstance(value, Decimal):
            value = {"kind": "number", "value": format(value, "f")}
        elif isinstance(value, datetime.date):
            value = {"kind": "date", "value": value.isoformat()}
        elif isinstance(value, BcAmount):
            value = {"kind": "amount", "number": format(value.number, "f"), "currency": value.currency}
        result[key] = value
    return result


def _to_transaction(entry: Any, shared: frozenset[tuple[str, int]] = frozenset()) -> TransactionHeader:
    # A loaded transaction may legitimately have no postings (Beancount accepts
    # one), so reads use the header model; only input requires a posting.
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
                units=_to_units(p.units) if p.units is not None else None,
                cost=cost,
                price=price,
                flag=p.flag,
                meta=metadata_to_json(p.meta),
            )
        )
    return TransactionHeader(
        date=entry.date,
        flag=entry.flag,
        payee=entry.payee,
        narration=entry.narration,
        postings=postings,
        tags=sorted(entry.tags),
        links=sorted(entry.links),
        meta=metadata_to_json(entry.meta),
        source=SourceLocation(filename=entry.meta["filename"], lineno=entry.meta["lineno"]),
        generated=entry_generated(entry, "transaction", shared),
    )


def _nfc(text: str) -> str:
    """One spelling for canonically equivalent text, so filters cannot miss it.

    Ledger bytes already arrive NFC-normalized, but a filter typed in another
    normalization — or a plugin-synthesized row — would otherwise compare
    unequal to the identical string.
    """

    return unicodedata.normalize("NFC", text)


def list_transactions(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
    flag: str | None = None,
    search: list[str] | None = None,
    tags: list[str] | None = None,
    links: list[str] | None = None,
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[TransactionHeader]:
    # The same fold account filters use, so Turkish `İ`/`ı` match `i` (w1/132).
    terms = [_search_key(term or "") for term in search or []]
    wanted_tags = {_nfc(tag.lstrip("#")) for tag in tags or []}
    wanted_links = {_nfc(link.lstrip("^")) for link in links or []}
    results = []
    for entry in entries:
        if not isinstance(entry, Transaction):
            continue
        if flag is not None and entry.flag != flag:
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and not any(fold_account(account) in fold_account(p.account) for p in entry.postings):
            continue
        if terms and not all(
            term in _search_key(entry.payee or "") or term in _search_key(entry.narration or "") for term in terms
        ):
            continue
        if wanted_tags and not wanted_tags.issubset({_nfc(tag) for tag in entry.tags or ()}):
            continue
        if wanted_links and not wanted_links.issubset({_nfc(link) for link in entry.links or ()}):
            continue
        results.append(_to_transaction(entry, shared))
        if len(results) >= limit:
            break
    return results


def _search_key(text: str) -> str:
    """Text as `--search` compares it: folded, with each line break one space.

    The table shows a narration's line breaks as spaces, and import's
    duplicate matching reads them so, but the search compared the raw text:
    `Rent for January`, as the table prints it, matched nothing (w5/631).
    Every run of blanks is one space, in the term as in the text: the table
    keeps the blanks around a break (`Rent   for February`), and that search
    found nothing while `rent for february` matched (w5/852).
    """
    return fold_account(_BLANKS.sub(" ", text))


_BLANKS = re.compile(r"[ \t\r\n]+")


def list_notes(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
    shared: frozenset[tuple[str, int]] = frozenset(),
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
                tags=sorted(entry.tags) if entry.tags else [],
                links=sorted(entry.links) if entry.links else [],
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "note", shared),
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
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[PriceDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Price):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if currency and _nfc(entry.currency).casefold() != _nfc(currency).casefold():
            continue
        results.append(
            PriceDirective(
                date=entry.date,
                currency=entry.currency,
                amount=_to_amount(entry.amount),
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "price", shared),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_balances(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    limit: int = 50,
    shared: frozenset[tuple[str, int]] = frozenset(),
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
                date=entry.date,
                account=entry.account,
                amount=_to_amount(entry.amount),
                tolerance=entry.tolerance,
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "balance", shared),
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
    shared: frozenset[tuple[str, int]] = frozenset(),
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
                generated=entry_generated(entry, "open", shared),
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
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[CloseDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Close):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if account and fold_account(account) not in fold_account(entry.account):
            continue
        results.append(
            CloseDirective(
                date=entry.date,
                account=entry.account,
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "close", shared),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_commodities(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    currency: str | None = None,
    limit: int = 50,
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[CommodityDirective]:
    results = []
    for entry in entries:
        if not isinstance(entry, Commodity):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if currency and _nfc(entry.currency).casefold() != _nfc(currency).casefold():
            continue
        results.append(
            CommodityDirective(
                date=entry.date,
                currency=entry.currency,
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "commodity", shared),
            )
        )
        if len(results) >= limit:
            break
    return results


def list_events(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    type_filter: str | None = None,
    limit: int = 50,
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[EventDirective]:
    # Folded as `--search` and `--account` fold, Turkish İ/ı included (w5/533).
    wanted = fold_account(type_filter or "")
    results = []
    for entry in entries:
        if not isinstance(entry, Event):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if wanted and wanted != fold_account(entry.type or ""):
            continue
        results.append(
            EventDirective(
                date=entry.date,
                type=entry.type,
                description=entry.description,
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "event", shared),
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
    root: Path | None = None,
    shared: frozenset[tuple[str, int]] = frozenset(),
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
                filename=_document_filename_for_json(entry, root),
                tags=tags,
                links=links,
                meta=metadata_to_json(entry.meta),
                # Two includes' `receipt.pdf` listed alike, the path being
                # relative to a file the row never named (w5/833).
                source=_source_of(entry),
                generated=entry_generated(entry, "document", shared),
            )
        )
        if len(results) >= limit:
            break
    return results


def _source_of(entry: Any) -> SourceLocation | None:
    meta = entry.meta or {}
    filename, lineno = meta.get("filename"), meta.get("lineno")
    if isinstance(filename, str) and isinstance(lineno, int) and not isinstance(lineno, bool):
        return SourceLocation(filename=filename, lineno=lineno)
    return None


def _document_filename_for_json(entry: Any, root: Path | None = None) -> str:
    """Prefer the ledger-relative path token when Beancount resolved it absolutely.

    `add document` writes and returns the relative `--path`; the loader expands
    it. Relativize against the directive's source file so list matches add —
    for any attachment inside the root ledger's tree, not only one beneath the
    source file: `../receipts/r.txt` named from `year/entries.bean` is a valid
    path that `relative_to` cannot express, and it used to list absolutely,
    which `add document` then refuses as input. The path is computed from the
    names as written, so a symlinked attachment keeps its own name. Outside
    the tree the absolute path stays, as it does without a root to judge by.
    """
    filename = str(entry.filename)
    source = entry.meta.get("filename") if getattr(entry, "meta", None) else None
    if not source or not os.path.isabs(filename):
        return filename
    try:
        base = Path(str(source)).resolve().parent
        resolved = Path(filename).resolve()
        if root is None:
            return str(resolved.relative_to(base))
        if not resolved.is_relative_to(root.resolve()):
            return filename
        return os.path.relpath(filename, os.path.dirname(os.path.abspath(str(source))))
    except (OSError, ValueError):
        return filename


def list_customs(
    entries: list[Any],
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    type_filter: str | None = None,
    limit: int = 50,
    shared: frozenset[tuple[str, int]] = frozenset(),
) -> list[CustomDirective]:
    from beancount.core.amount import Amount as BcAmount

    # Folded as `--search` and `--account` fold, Turkish İ/ı included (w5/533).
    wanted = fold_account(type_filter or "")
    results = []
    for entry in entries:
        if not isinstance(entry, Custom):
            continue
        if not _in_date_range(entry.date, from_date, to_date):
            continue
        if wanted and wanted != fold_account(entry.type or ""):
            continue
        values: list[CustomDirectiveValue] = []
        for v in entry.values or []:
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
                generated=entry_generated(entry, "custom", shared),
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
    shared: frozenset[tuple[str, int]] = frozenset(),
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
        results.append(
            PadDirective(
                date=entry.date,
                account=entry.account,
                source_account=entry.source_account,
                meta=metadata_to_json(entry.meta),
                generated=entry_generated(entry, "pad", shared),
            )
        )
        if len(results) >= limit:
            break
    return results
