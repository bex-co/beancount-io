"""(De)serialisation of entries.

When adding entries, these are saved via the JSON API - using the functionality
of this module to obtain the appropriate data structures from
`beancount.core.data`. Similarly, for the full entry completion, a JSON
representation of the entry is provided.

This is not intended to work well enough for full roundtrips yet.
"""

from __future__ import annotations

import datetime
import functools
import re
from typing import TYPE_CHECKING

from beancount.core.amount import Amount
from beancount.core.data import Balance, Directive, Note, Posting, Transaction
from beancount.core.number import D
from beancount.core.position import to_string as position_to_string
from beancount.parser.parser import parse_string

from fava.helpers import FavaAPIException
from fava.util.date import parse_date


if TYPE_CHECKING:
    from typing import Any

    PostingDict = dict[str, str]
    JsonEntry = dict[str, Any]

# Type alias for serialised entry dictionary
SerialisedEntry = dict[str, object]
SerialisedPosting = dict[str, str]


def extract_tags_links(
    string: str,
) -> tuple[str, frozenset[str], frozenset[str]]:
    """Extract tags and links from a narration string.

    Args:
        string: A string, possibly containing tags (`#tag`) and links
        (`^link`).

    Returns:
        A triple (new_string, tags, links) where `new_string` is `string`
        stripped of tags and links.
    """
    tags = re.findall(r"(?:^|\s)#([A-Za-z0-9\-_/.]+)", string)
    links = re.findall(r"(?:^|\s)\^([A-Za-z0-9\-_/.]+)", string)
    new_string = re.sub(r"(?:^|\s)[#^]([A-Za-z0-9\-_/.]+)", "", string).strip()

    return new_string, frozenset(tags), frozenset(links)


@functools.singledispatch
def serialise(entry: Directive) -> SerialisedEntry | None:
    """Serialise an entry."""
    if not entry:
        return None  # type: ignore[unreachable]
    ret: SerialisedEntry = dict(entry._asdict())
    ret["type"] = entry.__class__.__name__
    if isinstance(entry, Transaction):
        ret["payee"] = entry.payee or ""
        narration = entry.narration or ""  # Handle potential None value
        if entry.tags:
            narration += " " + " ".join(["#" + t for t in entry.tags])
        if entry.links:
            narration += " " + " ".join(["^" + link for link in entry.links])
        ret["narration"] = narration
        del ret["links"]
        del ret["tags"]
        ret["postings"] = [serialise(pos) for pos in entry.postings]  # type: ignore[arg-type]
    elif ret["type"] == "Balance":
        amt = entry.amount  # type: ignore[union-attr]
        ret["amount"] = {"number": str(amt.number), "currency": amt.currency}
    return ret


@serialise.register(Posting)
def _serialise_posting(posting: Posting) -> SerialisedPosting:  # type: ignore[misc]
    """Serialise a posting."""
    if isinstance(posting.units, Amount):
        position_str = position_to_string(posting)
    else:
        position_str = ""

    if posting.price is not None:
        position_str += f" @ {posting.price.to_string()}"
    return {"account": posting.account, "amount": position_str}


def deserialise_posting(posting: PostingDict) -> Posting:
    """Parse JSON to a Beancount Posting."""
    amount = posting.get("amount", "")
    entries, errors, _ = parse_string(f'2000-01-01 * "" ""\n Assets:Account {amount}')
    if errors:
        raise FavaAPIException(f"Invalid amount: {amount}")
    txn = entries[0]
    assert isinstance(txn, Transaction)
    pos = txn.postings[0]
    return pos._replace(account=posting["account"], meta=None)


def deserialise(json_entry: JsonEntry) -> Directive:
    """Parse JSON to a Beancount entry.

    Args:
        json_entry: The entry.

    Raises:
        KeyError: if one of the required entry fields is missing.
        FavaAPIException: if the type of the given entry is not supported.
    """
    date = parse_date(json_entry.get("date", ""))[0]
    if not isinstance(date, datetime.date):
        raise FavaAPIException("Invalid entry date.")
    if json_entry["type"] == "Transaction":
        narration, tags, links = extract_tags_links(json_entry["narration"])
        postings = [deserialise_posting(pos) for pos in json_entry["postings"]]
        return Transaction(
            json_entry["meta"],
            date,
            json_entry.get("flag", ""),
            json_entry.get("payee", ""),
            narration,
            tags,
            links,
            postings,
        )
    if json_entry["type"] == "Balance":
        raw_amount = json_entry["amount"]
        amount = Amount(D(str(raw_amount["number"])), raw_amount["currency"])

        return Balance(json_entry["meta"], date, json_entry["account"], amount, None, None)
    if json_entry["type"] == "Note":
        comment = json_entry["comment"].replace('"', "")
        return Note(json_entry["meta"], date, json_entry["account"], comment, None, None)
    raise FavaAPIException("Unsupported entry type.")
