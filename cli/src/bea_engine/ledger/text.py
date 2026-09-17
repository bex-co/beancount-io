"""The text primitives every ledger read or write needs before it touches a file."""

from __future__ import annotations

import re
import unicodedata

from bea_engine import protocol


def single_line(text: str) -> str:
    """Keep text readable as one ledger field, preserving other whitespace.

    The frontend has its own copy for table cells (`cli.utils.single_line`).
    Neither side can import the other, and this one is here because it is part
    of what gets written to the ledger, not part of how anything is displayed.
    """
    return re.sub(r"[\r\n]+", " ", text)


def fold_account(name: str) -> str:
    """The key two account names must share to match in a filter.

    Account names reach bea in whichever Unicode normalization their source
    produced — macOS filesystem paths hand out NFD, most editors write NFC —
    and the two are canonically equivalent: the same text in different code
    points, rendered identically. Compared raw, a filter silently misses the
    account the user is looking straight at.

    NFC rather than NFD because these keys are matched as substrings, and NFC
    keeps an accented letter a single code point, so a substring boundary falls
    where a reader sees one. Folding runs between the two normalizations
    because folding can itself denormalize.

    The frontend keeps its own copy (`cli.utils.fold_account`): neither side
    may import the other, and both have to compare the same names.
    """
    return unicodedata.normalize("NFC", unicodedata.normalize("NFC", name).casefold())


def parse_account(name: str) -> str:
    """Validate an account name the way the loader will, or explain the rules.

    Engine-side because only Beancount knows what a valid account is: the root
    names are ledger options and the segment rules are its own.
    """
    from beancount.core.account import is_valid

    if not is_valid(name):
        raise protocol.UsageError(
            f"Invalid account {name!r}. Account names use colon-separated segments, such as Assets:Checking. "
            "The root starts with an uppercase letter; each subaccount starts with an uppercase letter or digit. "
            "Use letters, digits and hyphens within segments. Standard roots are "
            "Assets, Liabilities, Equity, Income and Expenses; configured root names are also supported."
        )
    return name
