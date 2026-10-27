"""What `bea-engine list` answers: one directive type out of a ledger, filtered.

The eleven types differ only in which reader they call and which filters that
reader accepts, so they are declared as data here and the command stays one
function. The frontend receives business JSON — dates as `YYYY-MM-DD`, amounts
as strings — and owns every decision about how to show it.
"""

from __future__ import annotations

import datetime
import os
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import reader
from bea_engine.query import format_error

# type name -> (reader, the one optional filter it accepts besides dates)
_LISTERS: dict[str, tuple[str, str | None]] = {
    "transaction": ("list_transactions", "account"),
    "note": ("list_notes", "account"),
    "balance": ("list_balances", "account"),
    "open": ("list_opens", "account"),
    "close": ("list_closes", "account"),
    "document": ("list_documents", "account"),
    "pad": ("list_pads", "account"),
    "price": ("list_prices", "currency"),
    "commodity": ("list_commodities", "currency"),
    "event": ("list_events", "type"),
    "custom": ("list_customs", "type"),
}

TYPES = tuple(_LISTERS)


def _row(item: Any) -> dict[str, Any]:
    """The item's JSON, with `generated` present only when true.

    The flag defaults off and is excluded from dumps, so every other
    consumer of these models — `add`, bulk input — never sees the key.
    Listings opt back in for the rows a plugin synthesized, which keeps a
    plugin-free ledger's answer byte-identical.

    A transaction's units opt in to `inferred` the same way: only a lot whose
    number the ledger line leaves to booking carries it, so bulk input can
    write that line number-less again (w5/1018).
    """
    data: dict[str, Any] = item.model_dump(mode="json")
    if item.generated:
        data["generated"] = True
    for posting, row in zip(getattr(item, "postings", ()), data.get("postings") or (), strict=False):
        if posting.units is not None and posting.units.inferred:
            row["units"]["inferred"] = True
    return data


def answer(
    file: Any,
    directive_type: str,
    *,
    limit: int = 50,
    from_date: datetime.date | None = None,
    to_date: datetime.date | None = None,
    account: str | None = None,
    currency: str | None = None,
    kind: str | None = None,
    flag: str | None = None,
    search: list[str] | None = None,
    tags: list[str] | None = None,
    links: list[str] | None = None,
    newest: bool = False,
    details: bool = False,
    on_disk_only: bool = False,
) -> dict[str, Any]:
    """List one directive type, and say whether the limit cut the answer short.

    Reads one row past `limit` so truncation is known without a second pass —
    a caller that has to ask again cannot tell an exact fit from a cut.

    `errors` carries the ledger's load errors rather than refusing to answer.
    Whether a partial listing is acceptable depends on who is reading it (a
    person at a terminal, a pipe, `--allow-errors`), and that is the frontend's
    decision to make; see `cli.output.render_ledger_errors`.
    """
    if directive_type not in _LISTERS:
        raise protocol.UsageError(f"Unknown directive type {directive_type!r}. Use one of: {', '.join(TYPES)}.")
    if limit < 1:
        raise protocol.UsageError("--limit must be a positive number of results.")
    if details and directive_type != "transaction":
        raise protocol.UsageError("--details renders transactions; the other directive types have no postings.")
    lister_name, supported_filter = _LISTERS[directive_type]

    filters: dict[str, Any] = {"from_date": from_date, "to_date": to_date}
    if supported_filter == "account":
        filters["account"] = account
    elif supported_filter == "currency":
        filters["currency"] = currency
    elif supported_filter == "type":
        filters["type_filter"] = kind
    if directive_type == "transaction":
        filters |= {"flag": flag, "search": search, "tags": tags, "links": links}
    if directive_type == "document":
        # The tree a document may live in, so its path lists as the ledger spells it.
        # Named lexically: a symlinked root's attachments sit beside the link,
        # not beside its target.
        filters["root"] = Path(os.path.abspath(str(file))).parent

    entries, errors = reader.load_file(file)
    shared = reader.shared_locations(entries)
    if shared:
        filters["shared"] = shared
    if on_disk_only:
        # Before the limit: truncation must count answerable rows, not rows
        # the filter is about to drop.
        entries = [entry for entry in entries if not reader.entry_generated(entry, directive_type, shared)]
    if newest:
        # Every lister walks in order and stops at the limit, so the walk
        # itself is what decides which end of the ledger a cut listing keeps.
        entries = entries[::-1]
    items = getattr(reader, lister_name)(entries, limit=limit + 1, **filters)
    truncated = len(items) > limit
    items = items[:limit]

    data: dict[str, Any] = {
        "items": [_row(item) for item in items],
        "truncated": truncated,
        "errors": [format_error(error, ledger_file=file) for error in errors],
        "root_hint": _root_hint(file) if errors else None,
    }
    if details:
        # Beancount syntax for each row, which only this side can render. Asked
        # for explicitly because it is the expensive part of the answer.
        from bea_engine.ledger.writer import format_transaction

        data["rendered"] = [format_transaction(item, loaded=True) for item in items]
    return data


def _root_hint(file: Path) -> str | None:
    """The root to read instead, when `file` is a leaf that fails on its own (w5/348)."""
    from bea_engine.ledger.write import root_read_hint

    return root_read_hint(file)
