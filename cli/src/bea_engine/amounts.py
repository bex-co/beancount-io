"""Amount-string validation shared by structured input and CSV extraction."""

from __future__ import annotations

import math
import re
from decimal import Decimal, Inexact, Rounded, localcontext
from typing import Any

_PLAIN_DECIMAL = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)")
"""A decimal without exponent notation, the only spelling that reaches here."""

_QUOTED_OR_COMMENT = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\r\n]*')
"""Quoted strings and comments, inside which an `@@` is text, not a price."""

_ZERO_DIVISOR = re.compile(r"/\s*[-+]?(?:0+(?:\.0*)?|\.0+)(?![\d.]|[A-Z0-9'._-]*[A-Z])")
_NOT_ARITHMETIC = re.compile(r'"(?:[^"\\]|\\.)*"|;[^\n]*|^[*:#!&?%][^\n]*', re.MULTILINE)


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


def zero_divisor_line(text: str) -> int | None:
    """The first literal zero divisor in ledger text, before the parser can crash.

    The frontend twin in `cli.amounts` protects batch syntax scans. This copy
    protects text already read by the engine, including piped formatter input.
    Strings, comments and skipped org-mode lines contain no amount arithmetic.
    """
    code = _NOT_ARITHMETIC.sub(lambda found: re.sub(r"[^\n]", " ", found.group()), text)
    for number, line in enumerate(code.split("\n"), start=1):
        if _ZERO_DIVISOR.search(line):
            return number
    return None


DECIMAL_COMMA_HELP = (
    "A comma is read only as a thousands separator between groups of three digits, such as '1,538.25'; "
    "write the fraction after a decimal point, or remove the separators."
)


class JsonFloat:
    """A JSON float's source text, kept so the refusal quotes what was typed.

    Parsing into a `float` first loses the literal: `1.10` becomes `1.1`,
    long decimals lose digits, and `1E400` becomes `inf` — and the hint then
    names a different amount, precision or tolerance than the user sent
    (w5/735). JSON entry points parse floats into this instead, and refuse it
    quoting the literal. Deliberately not a `str` or `float`, so nothing
    coerces or serializes it by accident.
    """

    __slots__ = ("literal",)

    def __init__(self, literal: str) -> None:
        self.literal = literal

    def __repr__(self) -> str:
        return f"JsonFloat({self.literal!r})"

    def __eq__(self, other: Any) -> bool:
        return isinstance(other, JsonFloat) and other.literal == self.literal


#: The transport marker for a `JsonFloat` between the frontend and the engine.
#: The frontend cannot import this module (and the engine cannot import the
#: frontend's twin), so a marked float crosses the request pipe as
#: `{"__json_float__": <literal>}`, and the engine's request parser restores
#: it with `restore_json_float`. A user object of exactly that shape in a
#: numeric position is refused as the float it claims to be.
JSON_FLOAT_MARKER = "__json_float__"


def restore_json_float(mapping: Any) -> Any:
    """The `object_hook` half of the `JsonFloat` transport: the marker dict back to a marked float."""
    if isinstance(mapping, dict) and set(mapping) == {JSON_FLOAT_MARKER}:
        literal = mapping[JSON_FLOAT_MARKER]
        if isinstance(literal, str):
            return JsonFloat(literal)
    return mapping


def parse_decimal_number(value: str, *, grouping: bool = True) -> Decimal:
    """The frontend's finite ASCII decimal rule, repeated across the engine boundary.

    Comma grouping in threes (`1,538.25`) is the flag spelling Beancount's own
    grammar reads; a structured field passes `grouping=False`, because its
    text is converted as written rather than through this result.
    """
    text = value.strip()
    require_decimal_notation(text)
    if grouping and re.fullmatch(r"[+-]?[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]*)?", text):
        return Decimal(text.replace(",", ""))
    if not re.fullmatch(r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)", text):
        if grouping and "," in text:
            raise ValueError(f"Invalid amount {value!r}. {DECIMAL_COMMA_HELP}")
        raise ValueError(f"Invalid amount {value!r}. Use finite decimal notation with ASCII digits, such as '1538.25'.")
    return Decimal(text)


def require_plain_decimal(value: Any) -> Any:
    """`require_decimal_notation`, plus `parse_decimal_number`'s ASCII rule for text.

    `Decimal()` also reads `1_000`, Arabic-Indic and full-width digits, which
    Beancount's own grammar — and so `add transaction --posting` — refuses.
    Already-converted Decimals and integers pass unchanged.
    """
    require_decimal_notation(value)
    if isinstance(value, str):
        parse_decimal_number(value, grouping=False)
    return value


def parse_exact(text: str) -> tuple[list[Any], list[Any], dict[str, Any]]:
    """Beancount's `parser.parse_string`, with every typed number kept digit for digit.

    The grammar evaluates a leading minus as arithmetic under the active
    decimal context, so `-12345678901.123456789012345678` came back rounded to
    28 significant digits while its positive twin was read exactly, and the
    rounded figure was what `bea` then wrote (w5/263). A parse that rounded is
    repeated under a context wide enough for any number the text can spell.
    Only a quotient that does not terminate (`1/3`) fills that precision, and
    it keeps Beancount's own 28-digit reading.
    """
    from beancount.parser import parser as beancount_parser

    with localcontext() as narrow:
        narrow.clear_flags()
        parsed: tuple[list[Any], list[Any], dict[str, Any]] = beancount_parser.parse_string(text)
        if not narrow.flags[Rounded]:
            return parsed
    with localcontext() as wide:
        # No literal, sum or product in the text has more digits than the text has characters.
        wide.prec = max(wide.prec, len(text)) + 2
        wide.clear_flags()
        exact: tuple[list[Any], list[Any], dict[str, Any]] = beancount_parser.parse_string(text)
        if not wide.flags[Inexact]:
            return exact
        return _typed_digits(parsed[0], exact[0], wide.prec), parsed[1], parsed[2]


def _typed_digits(rounded: Any, exact: Any, precision: int) -> Any:
    """`rounded`, with each number the wider parse read exactly taken from `exact`."""
    if isinstance(exact, Decimal):
        return rounded if len(exact.as_tuple().digits) >= precision else exact
    if isinstance(exact, list) and isinstance(rounded, list) and len(exact) == len(rounded):
        return [_typed_digits(*pair, precision) for pair in zip(rounded, exact, strict=True)]
    if isinstance(exact, tuple) and hasattr(exact, "_fields") and type(exact) is type(rounded):
        return type(exact)(*(_typed_digits(*pair, precision) for pair in zip(rounded, exact, strict=True)))
    return rounded


def split_total_price(text: str) -> tuple[str, str] | None:
    """The `@@` total from a posting line as `(number, currency)` strings, or None.

    The caller has already validated the line through Beancount's parser, so
    a total that cannot be read here means the split misread the text — never
    a user error — and the caller falls back to the parsed unit price. Past
    the plain fast path the whole tail is read by that same parser rather
    than split on whitespace: the currency may be glued to the number
    (`@@ 100USD`), and a total written as native arithmetic
    (`@@ (40+60) USD`, `@@ 200/2 USD`) is evaluated by it too — the fallback
    would otherwise record either as a divided, repeating `@` price (w5/802).
    """
    unquoted = _QUOTED_OR_COMMENT.sub("", text)
    if "@@" not in unquoted:
        return None
    tail = unquoted.rsplit("@@", 1)[1].split()
    if len(tail) == 2 and _PLAIN_DECIMAL.fullmatch(tail[0]):
        return tail[0], tail[1]
    if not tail:
        return None
    return _probed_amount(" ".join(tail))


def _probed_amount(tail: str) -> tuple[str, str] | None:
    """The tail after `@@` as `(number, currency)`, read by Beancount's own grammar, or None.

    The probe reports what the grammar makes of the exact tail text — a glued
    currency (`100USD`), grouping (`1,000USD`), or arithmetic (`(40+60)USD`)
    included — so this accepts exactly what the validated line meant. None
    means the probe did not read back as one plain amount, and the caller
    falls back to the parsed unit price.
    """
    from beancount.core.number import MISSING

    # Exact like every other parse here: the default 28-digit context rounded
    # a wide arithmetic total before it was written (w5/898).
    entries, errors, _ = parse_exact(f'2026-01-02 * "probe"\n  Assets:Probe {tail}\n  Equity:Probe\n')
    entry: Any = entries[0] if len(entries) == 1 and not errors else None
    if entry is None or len(entry.postings) != 2:
        return None
    posting: Any = entry.postings[0]
    units: Any = posting.units
    if posting.cost is not None or posting.price is not None or units is None or units is MISSING:
        return None
    if units.number is MISSING or not isinstance(units.currency, str):
        return None
    return format(units.number, "f"), units.currency


def refuse_zero_divisor(text: str) -> None:
    """Refuse a zero divisor, which crashes Beancount's parser instead of erroring.

    The frontend's `check_decimal_notation` makes the same check for flag
    input; a bulk row's amount fragment reaches the engine without passing
    it. Quoted labels and comments are text. A computed divisor
    (`100/(2-2)`) is evaluated and refused like a literal one (w1/274).
    Slash currencies such as /0-J need a letter in their token; /0-5
    instead divides by zero.
    """
    if _divides_by_zero(_QUOTED_OR_COMMENT.sub(" ", text)):
        raise ValueError(
            f"Division by zero in {text.strip()!r}. Beancount evaluates amount arithmetic while parsing, "
            "and a zero divisor crashes it outright, so bea refuses the expression instead of sending it."
        )


_EXPONENT_TOKEN = re.compile(r"(?<![\w.:#^'\-])[-+]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+(?![\w.])")


def refuse_scientific_notation(text: str) -> None:
    """Refuse an exponent-looking numeric token with the shared message.

    The frontend's `check_decimal_notation` makes the same check for flag
    input; a bulk row's amount fragment reaches the engine without passing
    it, and the grammar only reports the token's tail (`Invalid token:
    'e2'`) (w5/722). Quoted labels and comments are text, and the token rule
    leaves native arithmetic alone, exactly as the frontend's does.
    """
    match = _EXPONENT_TOKEN.search(_QUOTED_OR_COMMENT.sub("", text))
    if match is not None:
        require_decimal_notation(match[0])


def decimal_string_hint(value: float | JsonFloat, noun: str) -> str:
    """What to send instead of a JSON float: a string this same input accepts.

    `str()` of a float is scientific for large or tiny values (`1e+20`,
    `1e-08`) and `nan`/`inf` for the rest, each refused on the next run; an
    agent following the hint looped between two errors (w5/335). A marked
    float quotes its literal instead, so following it never changes the
    amount, its precision or the tolerance (w5/735).
    """
    if isinstance(value, JsonFloat):
        return f"Send the {noun} as a decimal string, such as '{value.literal}'."
    if not math.isfinite(value):
        return f"{value!r} is not a finite number, so it has no decimal form."
    return f"Send the {noun} as a decimal string, such as '{format(Decimal(repr(value)), 'f')}'."


def require_decimal_notation(value: Any) -> Any:
    """Reject exponent notation and JSON floats before conversion; internal Decimals remain valid.

    A float is refused even when it prints cleanly: the double is already the
    wrong value (0.1 + 0.2 arrives as 0.30000000000000004), so accepting it
    would record binary error as accounting fact. Integers are exact and stay.
    """
    if isinstance(value, JsonFloat):
        raise ValueError(
            f"JSON number {value.literal} is not supported in Beancount amounts; "
            f"floats cannot represent decimals exactly. {decimal_string_hint(value, 'amount')}"
        )
    if isinstance(value, float):
        raise ValueError(
            f"JSON number {value!r} is not supported in Beancount amounts; "
            f"floats cannot represent decimals exactly. {decimal_string_hint(value, 'amount')}"
        )
    if isinstance(value, str) and re.fullmatch(
        r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+", value.strip().replace("_", "")
    ):
        raise ValueError(
            f"Scientific notation {value!r} is not supported in Beancount amounts. "
            "Use decimal notation, such as '1000' instead of '1e3'."
        )
    return value
