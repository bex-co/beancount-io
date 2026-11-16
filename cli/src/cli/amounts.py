"""Numeric notation checks for frontend write commands, without loading the engine."""

from __future__ import annotations

import re
from decimal import Decimal, localcontext
from typing import Any

from cli.errors import UsageError


class JsonFloat:
    """A JSON float's source text, kept so the engine's refusal quotes what was typed.

    The engine twin in `bea_engine.amounts` refuses it; the two execution
    environments cannot import each other's modules, so a marked float
    crosses the request pipe as `{JSON_FLOAT_MARKER: <literal>}` (see
    `json_float_default`) and the engine restores it there. Deliberately not
    a `str` or `float`, so `json.dumps` has no native spelling for it and
    must come through the default.
    """

    __slots__ = ("literal",)

    def __init__(self, literal: str) -> None:
        self.literal = literal

    def __repr__(self) -> str:
        return f"JsonFloat({self.literal!r})"

    def __eq__(self, other: Any) -> bool:
        return isinstance(other, JsonFloat) and other.literal == self.literal


#: Transport marker for a `JsonFloat`; must match `bea_engine.amounts.JSON_FLOAT_MARKER`.
JSON_FLOAT_MARKER = "__json_float__"


def json_float_default(value: Any) -> Any:
    """The `json.dumps` default that carries a marked float's literal to the engine (w5/735)."""
    if isinstance(value, JsonFloat):
        return {JSON_FLOAT_MARKER: value.literal}
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


_SCIENTIFIC_NOTATION_MESSAGE = (
    "Scientific notation {!r} is not supported in Beancount amounts. "
    "Use decimal notation, such as '1000' instead of '1e3'."
)
_GROUPING_MESSAGE = (
    "Invalid amount {!r}. A comma is read only as a thousands separator between groups of three digits, "
    "such as '1,538.25'; write the fraction after a decimal point, or remove the separators."
)


def parse_decimal_number(value: str) -> Decimal:
    """Parse a finite ASCII decimal without Python's extra numeric spellings.

    Comma grouping is read as Beancount's own grammar reads it for
    `add balance` and `--posting`: groups of exactly three digits, dropped
    from the result. The engine twin in `bea_engine.amounts` has the same
    grammar and diagnostic; the two execution environments cannot import each
    other's modules.
    """
    text = value.strip()
    # Match the engine's scalar check, including Python's underscore forms.
    # The native-expression check below instead looks for individual tokens.
    if re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+", text.replace("_", "")):
        raise UsageError(_SCIENTIFIC_NOTATION_MESSAGE.format(text))
    if re.fullmatch(r"[+-]?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]*)?", text):
        return Decimal(text.replace(",", ""))
    if not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", text):
        if "," in text:
            raise UsageError(_GROUPING_MESSAGE.format(value))
        raise UsageError(f"Invalid amount {value!r}. Use finite decimal notation with ASCII digits, such as '1538.25'.")
    return Decimal(text)


# A slash currency needs a letter somewhere in its token: /0-J is a currency,
# while /0-5 holds a zero divisor followed by subtraction.
_ZERO_DIVISOR = re.compile(r"/\s*[-+]?(?:0+(?:\.0*)?|\.0+)(?![\d.]|[A-Z0-9'._-]*[A-Z])")
"""A literal zero divisor in amount arithmetic, which segfaults Beancount's parser."""

# A slash currency is one token to Beancount's lexer, the longest match at
# its slash: /0J and /0-J are currencies, while /0-5 divides by zero and then
# subtracts. Its token needs a letter.
_SLASH_CURRENCY = re.compile(r"/[A-Z0-9'._-]*[A-Z]")
_NUMBER = re.compile(r"(?:\d+(?:,\d{3})*(?:\.\d*)?|\.\d+)")


class _NotArithmetic(Exception):
    """The text after a slash is not an expression this check can read; the parser reports it."""


class _ZeroDivisor(Exception):
    """A division whose divisor is exactly zero."""


class _Expression:
    """Beancount's `number_expr`: numbers, unary `+`/`-`, `+ - * /` and parentheses.

    Evaluated exactly as the grammar evaluates it, with `Decimal` under the
    active context, so a computed divisor (`100/(2-2)`) is found as surely
    as a literal one. Every division checks its divisor before dividing.
    """

    def __init__(self, text: str, start: int) -> None:
        self.text = text
        self.at = start

    def _peek(self) -> str:
        while self.at < len(self.text) and self.text[self.at] in " \t":
            self.at += 1
        return self.text[self.at] if self.at < len(self.text) else ""

    def expression(self) -> Decimal:
        value = self.term()
        while self._peek() in ("+", "-"):
            sign = self.text[self.at]
            self.at += 1
            right = self.term()
            value = value + right if sign == "+" else value - right
        return value

    def term(self) -> Decimal:
        value = self.unary()
        while self._peek() in ("*", "/") and not _SLASH_CURRENCY.match(self.text, self.at):
            operator = self.text[self.at]
            self.at += 1
            right = self.unary()
            if operator == "*":
                value *= right
            elif right == 0:
                raise _ZeroDivisor
            else:
                value /= right
        return value

    def unary(self) -> Decimal:
        # Unary minus binds tightest in the grammar, so `/-0-5` divides by `-0`.
        char = self._peek()
        if char in ("+", "-"):
            self.at += 1
            value = self.unary()
            return -value if char == "-" else value
        if char == "(":
            self.at += 1
            value = self.expression()
            if self._peek() != ")":
                raise _NotArithmetic
            self.at += 1
            return value
        number = _NUMBER.match(self.text, self.at)
        if number is None:
            raise _NotArithmetic
        self.at = number.end()
        return Decimal(number[0].replace(",", ""))


def _divides_by_zero(text: str) -> bool:
    """Whether any division in one line of amount text has a divisor that evaluates to zero.

    The divisor of a slash is the unary operand right after it, because `*`
    and `/` bind tighter than `+` and `-`; every slash is tried, so a zero
    divisor nested inside another divisor or a dividend is found too.
    """
    for slash in re.finditer("/", text):
        if _SLASH_CURRENCY.match(text, slash.start()):
            continue
        # The parser reads under the active context, and again under a wide
        # one when that rounded, so a divisor zero under either crashes it.
        for wide in (False, True):
            with localcontext() as context:
                if wide:
                    context.prec = max(context.prec, len(text)) + 2
                try:
                    if _Expression(text, slash.end()).unary() == 0:
                        return True
                except _ZeroDivisor:
                    return True
                except (_NotArithmetic, RecursionError, ArithmeticError):
                    break
    return False


#: Ledger text no amount arithmetic is in: strings, `;` comments, `#tag`
#: and `^link` tokens (a hierarchical `#proj/0` holds a `/0` that is not a
#: divisor), and the org-mode and other lines Beancount skips at a line start.
_NOT_ARITHMETIC = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\n]*|#[^\s;"\']*|\^[^\s;"\']*|^[*:#!&?%][^\n]*', re.MULTILINE)


def zero_divisor_line(text: str) -> int | None:
    """The first line of ledger text holding a literal zero divisor outside strings, comments, and tags."""
    code = _NOT_ARITHMETIC.sub(lambda found: re.sub(r"[^\n]", " ", found.group()), text)
    for number, line in enumerate(code.split("\n"), start=1):
        if _ZERO_DIVISOR.search(line):
            return number
    return None


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
    # to a posting. One amount's arithmetic is small enough to evaluate here,
    # so a computed divisor (`100/(2-2)`) is refused like a literal one (w1/274).
    if _divides_by_zero(re.sub(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*', " ", text)):
        raise UsageError(
            f"Division by zero in {text.strip()!r}. Beancount evaluates amount arithmetic while parsing, "
            "and a zero divisor crashes it outright, so bea refuses the expression instead of sending it."
        )
