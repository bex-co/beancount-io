"""A household's own Beancount plugin, kept beside the ledger (synthetic).

It tags every transaction that posts to Expenses:Travel with #travel, so a
query can find trips without remembering to type the tag. It only reads and
returns entries; it never writes a file.
"""

from beancount.core import data

__plugins__ = ["tag_travel"]


def tag_travel(entries, options_map):
    tagged = []
    for entry in entries:
        if isinstance(entry, data.Transaction) and any(
            posting.account.startswith("Expenses:Travel") for posting in entry.postings
        ):
            entry = entry._replace(tags=(entry.tags or frozenset()) | {"travel"})
        tagged.append(entry)
    return tagged, []
