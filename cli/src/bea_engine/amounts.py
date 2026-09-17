"""Amount-string validation shared by structured input and CSV extraction."""

from __future__ import annotations

import re
from typing import Any


def require_decimal_notation(value: Any) -> Any:
    """Reject exponent notation before conversion; internal Decimals remain valid."""
    if isinstance(value, str) and re.fullmatch(
        r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+", value.strip().replace("_", "")
    ):
        raise ValueError(
            f"Scientific notation {value!r} is not supported in Beancount amounts. "
            "Use decimal notation, such as '1000' instead of '1e3'."
        )
    return value
