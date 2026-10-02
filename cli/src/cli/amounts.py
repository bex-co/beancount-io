"""Numeric notation checks for frontend write commands, without loading the engine."""

from __future__ import annotations

import re
from decimal import Decimal

from cli.errors import UsageError

_SCIENTIFIC_NOTATION_MESSAGE = (
    "Scientific notation {!r} is not supported in Beancount amounts. "
    "Use decimal notation, such as '1000' instead of '1e3'."
)


def parse_decimal_number(value: str) -> Decimal:
    """Parse a finite ASCII decimal without Python's extra numeric spellings.

    The engine twin in `bea_engine.amounts` has the same grammar and diagnostic;
    the two execution environments cannot import each other's modules.
    """
    text = value.strip()
    # Match the engine's scalar check, including Python's underscore forms.
    # The native-expression check below instead looks for individual tokens.
    if re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+", text.replace("_", "")):
        raise UsageError(_SCIENTIFIC_NOTATION_MESSAGE.format(text))
    if not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", text):
        raise UsageError(f"Invalid amount {value!r}. Use finite decimal notation with ASCII digits, such as '1538.25'.")
    return Decimal(text)


def check_decimal_notation(text: str) -> None:
    """Reject the amount spellings that never reach a useful engine answer.

    Both checks run here, at the input boundary, because both cost more to
    diagnose once the expression is inside the engine: an exponent is rejected
    by a parser that cannot say which posting it came from, and a zero divisor
    crashes it outright.
    """
    # A cost label or comment may contain an exponent-looking string. Only
    # reject numeric tokens, leaving native arithmetic and quoted text alone.
    unquoted = re.sub(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*', "", text)
    match = re.search(r"(?<![\w.:#^'\-])[-+]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+(?![\w.])", unquoted)
    if match:
        raise UsageError(_SCIENTIFIC_NOTATION_MESSAGE.format(match[0]))
    # Upstream's parser segfaults on a zero divisor rather than reporting it,
    # which takes the whole engine process down and leaves nothing to attribute
    # to a posting. A literal zero is the case worth catching here; anything
    # computed (`100/(2-2)`) still reaches the engine.
    divisor = re.search(r"/\s*[-+]?(?:0+(?:\.0*)?|\.0+)(?![\d.])", unquoted)
    if divisor:
        raise UsageError(
            f"Division by zero in {text.strip()!r}. Beancount evaluates amount arithmetic while parsing, "
            "and a zero divisor crashes it outright, so bea refuses the expression instead of sending it."
        )
