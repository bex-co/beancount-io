"""The two text primitives every ledger write needs before it touches a file."""

from __future__ import annotations

import re

from bea_engine import protocol


def single_line(text: str) -> str:
    """Keep text readable as one ledger field, preserving other whitespace.

    The frontend has its own copy for table cells (`cli.utils.single_line`).
    Neither side can import the other, and this one is here because it is part
    of what gets written to the ledger, not part of how anything is displayed.
    """
    return re.sub(r"[\r\n]+", " ", text)


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
