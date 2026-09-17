"""Amount-string validation shared by structured input and CSV extraction."""

from __future__ import annotations

import re
from typing import Any

_PLAIN_DECIMAL = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)")
"""A decimal without exponent notation, the only spelling that reaches here."""

_QUOTED_OR_COMMENT = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*')
"""Quoted strings and comments, inside which an `@@` is text, not a price."""


def split_total_price(text: str) -> tuple[str, str] | None:
    """The `@@` total from a posting line as `(number, currency)` strings, or None.

    The caller has already validated the line through Beancount's parser, so
    a total that cannot be read here means the split misread the text — never
    a user error. Plain decimals only: exponent notation never reaches this
    far, and anything else falls back to the parsed unit price.
    """
    unquoted = _QUOTED_OR_COMMENT.sub("", text)
    if "@@" not in unquoted:
        return None
    tail = unquoted.rsplit("@@", 1)[1].split()
    if len(tail) < 2 or not _PLAIN_DECIMAL.fullmatch(tail[0]):
        return None
    return tail[0], tail[1]


def require_decimal_notation(value: Any) -> Any:
    """Reject exponent notation and JSON floats before conversion; internal Decimals remain valid.

    A float is refused even when it prints cleanly: the double is already the
    wrong value (0.1 + 0.2 arrives as 0.30000000000000004), so accepting it
    would record binary error as accounting fact. Integers are exact and stay.
    """
    if isinstance(value, float):
        raise ValueError(
            f"JSON number {value!r} is not supported in Beancount amounts; "
            f"floats cannot represent decimals exactly. Send the amount as a decimal string, such as '{value}'."
        )
    if isinstance(value, str) and re.fullmatch(
        r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+", value.strip().replace("_", "")
    ):
        raise ValueError(
            f"Scientific notation {value!r} is not supported in Beancount amounts. "
            "Use decimal notation, such as '1000' instead of '1e3'."
        )
    return value
