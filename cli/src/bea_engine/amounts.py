"""Amount-string validation shared by structured input and CSV extraction."""

from __future__ import annotations

import re
from typing import Any


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
