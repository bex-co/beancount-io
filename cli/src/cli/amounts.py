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
        if _comma_is_the_obstacle(text):
            raise UsageError(_GROUPING_MESSAGE.format(value))
        raise UsageError(f"Invalid amount {value!r}. Use finite decimal notation with ASCII digits, such as '1538.25'.")
    return Decimal(text)


def _comma_is_the_obstacle(text: str) -> bool:
    """Whether a refused number fails on its commas rather than on something else.

    Only digits, commas and points, with commas that are not grouping in
    threes before the fraction (`4,50`, `1.234,56`, `1,5000`). `$1,500.00`,
    `~1,500` and `1,500.5.5` group correctly, so the comma advice would send
    the user to a second refusal (w1/370).
    """
    return (
        re.fullmatch(r"[+-]?[0-9.,]*,[0-9.,]*", text) is not None
        and re.fullmatch(r"[+-]?[0-9]{1,3}(?:,[0-9]{3})+\.[0-9.]*", text) is None
    )


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

    Evaluated iteratively with an explicit frame stack — matching the grammar
    and `Decimal` under the active context — so deeply nested divisors
    (`10/((((...))))` or `10/---...0`) never hit Python's recursion limit or
    overflow the C stack on any platform. Every division checks its divisor
    before dividing.
    """

    def __init__(self, text: str, start: int) -> None:
        self.text = text
        self.at = start

    def _peek(self) -> str:
        while self.at < len(self.text) and self.text[self.at] in " \t":
            self.at += 1
        return self.text[self.at] if self.at < len(self.text) else ""

    def unary(self) -> Decimal:
        # Each frame represents an open `(` waiting for its inner expression
        # and closing `)`: [paren_sign, expr_acc, expr_op, term_acc, term_op],
        # where paren_sign is 0 (no minus), -1 (odd minuses), or 1 (even >0
        # minuses, which still rounds under the active Decimal context).
        frames: list[list[Decimal | str | int | None]] = []

        while True:
            # Unary signs bind tightest in the grammar, so `/-0-5` divides by `-0`.
            sign = 0
            while (char := self._peek()) in ("+", "-"):
                self.at += 1
                if char == "-":
                    sign = -1 if sign >= 0 else 1

            if char == "(":
                self.at += 1
                frames.append([sign, None, None, None, None])
                continue

            number = _NUMBER.match(self.text, self.at)
            if number is None:
                raise _NotArithmetic
            self.at = number.end()
            value = Decimal(number[0].replace(",", ""))
            if sign < 0:
                value = -value
            elif sign > 0:
                value = +value

            while True:
                if not frames:
                    return value

                frame = frames[-1]
                term_acc = frame[3]
                term_op = frame[4]
                if term_op is None:
                    term_val = value
                elif term_op == "*":
                    assert isinstance(term_acc, Decimal)
                    term_val = term_acc * value
                else:
                    if value == 0:
                        raise _ZeroDivisor
                    assert isinstance(term_acc, Decimal)
                    term_val = term_acc / value

                op = self._peek()
                if op in ("*", "/") and not _SLASH_CURRENCY.match(self.text, self.at):
                    self.at += 1
                    frame[3] = term_val
                    frame[4] = op
                    break

                expr_acc = frame[1]
                expr_op = frame[2]
                if expr_op is None:
                    expr_val = term_val
                elif expr_op == "+":
                    assert isinstance(expr_acc, Decimal)
                    expr_val = expr_acc + term_val
                else:
                    assert isinstance(expr_acc, Decimal)
                    expr_val = expr_acc - term_val

                if op in ("+", "-"):
                    self.at += 1
                    frame[1] = expr_val
                    frame[2] = op
                    frame[3] = None
                    frame[4] = None
                    break

                if op != ")":
                    raise _NotArithmetic
                self.at += 1
                paren_sign = frame[0]
                frames.pop()
                if paren_sign == -1:
                    value = -expr_val
                elif paren_sign == 1:
                    value = +expr_val
                else:
                    value = expr_val


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
                except (_NotArithmetic, ArithmeticError):
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


def evaluated_zero_divisor_line(text: str) -> int | None:
    """The first line whose amount arithmetic divides by zero, computed or literal.

    The literal scan above cannot see a divisor the grammar evaluates, such
    as `100/(2-2)`, and Beancount's parser crashes on it all the same. The
    engine twin guards the formatter's render with this scan; here it guards
    the batch syntax scan and names the line of a ledger whose load crashed.
    """
    code = _NOT_ARITHMETIC.sub(lambda found: re.sub(r"[^\n]", " ", found.group()), text)
    for number, line in enumerate(code.split("\n"), start=1):
        if _divides_by_zero(line):
            return number
    return None


def crashing_divisor_line(text: str) -> int | None:
    """The line the engine's render refuses for a zero divisor: a literal one first, then a computed one.

    In that order, so every mode of `bea format` and a crashed load name
    the same line of a file.
    """
    line = zero_divisor_line(text)
    return line if line is not None else evaluated_zero_divisor_line(text)


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
