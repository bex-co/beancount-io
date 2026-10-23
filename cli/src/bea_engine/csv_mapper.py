"""No-code CSV import: a column mapping plus optional pattern rules as an importer.

Lives in the engine because extraction builds Beancount entries. The frontend
keeps a stdlib-only twin for header inference and remembered mappings; this
copy is what bea-engine import runs. Beangulp stays optional (ADR012).
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
import unicodedata
from collections import Counter
from collections.abc import Collection, Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine.amounts import require_decimal_notation
from bea_engine.ledger.text import (
    bea_command,
    is_commodity,
    parse_account,
    regex_reads_otherwise,
    require_commodity,
)
from bea_engine.protocol import UsageError

_MAPPING_FIELDS = frozenset(
    {
        "date",
        "amount",
        "payee",
        "narration",
        "id",
        "currency",
        "debit",
        "credit",
        "direction",
        "category",
        "status",
        "sign",
    }
)

_THOUSAND_SEPARATOR_FILLER = re.compile(r"[\s'\u2019]")
# Invisible in every viewer, and no part of a number: zero-width space, word
# joiner, and the zero-width no-break space (a stray byte-order mark).
_ZERO_WIDTH = re.compile("[\u200b\u2060\ufeff]")
_NON_FINITE_AMOUNT = re.compile(r"[+-]?(?:nan|inf(?:inity)?)\Z", re.IGNORECASE)
_EU_GROUPING = re.compile(r"\d{1,3}(?:\.\d{3})+")
# Two or more strictly valid dot groups: no decimal convention writes two
# decimal points, so the cell can only be dot-grouped thousands (w5/753). The
# first group is never zero-led, as with comma grouping; `0.000.000` stays
# refused, and `--csv decimal=comma` reads it as zero.
_DOT_GROUPING_TWO = re.compile(r"[1-9]\d{0,2}(?:\.\d{3}){2,}")
# One dot and a three-digit tail: dot-grouped thousands or three decimals,
# genuinely ambiguous until the column or a currency decides (w5/753).
_DOT_THREE_TAIL = re.compile(r"\d+\.\d{3}")
# One comma followed by any digit count but three: never a thousands group
# (`-0,5`, `-0,50`, `-0,1234`), so it can only be a decimal comma.
_COMMA_DECIMAL_TAIL = re.compile(r"\A[^,]*,(?:\d{1,2}|\d{4,})\Z")
# The comma groupings point-decimal exports use: 1,234,567 and Indian 12,34,567.
# A first group is never zero-led: `0,125` is not grouping in any convention.
_COMMA_GROUPING = re.compile(r"[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d?(?:,\d{2})*,\d{3}")
# One comma and exactly three digits after it: a thousands group only when the
# whole part is a valid first group, so `0,125` and `1613,030` are decimals.
_SINGLE_COMMA_THREE = re.compile(r"\d+,\d{3}")
# Direction words a `direction=` column may hold, case-insensitive (w5/755):
# English full words and abbreviations, plus ING's Dutch Af/Bij.
_DEBIT_WORDS = frozenset({"debit", "d", "dr", "af"})
_CREDIT_WORDS = frozenset({"credit", "c", "cr", "bij"})
_DIRECTION_WORDS = _DEBIT_WORDS | _CREDIT_WORDS
# Full words unambiguous enough to indict a column whatever its header.
_FULL_DIRECTION_WORDS = frozenset({"debit", "credit"})
# Headers (alphanumerics only, casefolded) that name a direction column.
_DIRECTION_HEADERS = frozenset({"type", "transactiontype", "direction", "debitcredit", "drcr", "dc", "afbij"})
# ISO 4217 commodities with no minor unit: a three-decimal reading in one of
# these is almost certainly dot-grouped thousands instead (w5/753).
_ZERO_DECIMAL_CURRENCIES = frozenset(
    {
        "BIF",
        "CLP",
        "DJF",
        "GNF",
        "ISK",
        "JPY",
        "KMF",
        "KRW",
        "PYG",
        "RWF",
        "UGX",
        "UYI",
        "VND",
        "VUV",
        "XAF",
        "XOF",
        "XPF",
    }
)
_ACCEPTED_AMOUNTS = (
    "Accepted: plain decimals (1000.50), $/€ symbols, thousands separators, "
    "(parentheses) or trailing-minus negatives; comma decimals like 1.000,00 "
    "only when the whole column uses them."
)


def _is_currency_symbol(text: str) -> bool:
    return len(text) == 1 and unicodedata.category(text) == "Sc"


# Symbols that name the commodity a row must post, most exactly one. `£` is
# also GIP, FKP, SHP and EGP, and `₩` is also KPW, so those accept any
# commodity they name (w5/757). `$` (dollars of a dozen countries)
# and `¥` (JPY and CNY) are deliberately absent: they say nothing a row can be
# refused over, and every existing `$` column must keep importing unchanged.
_SYMBOL_CURRENCIES: dict[str, tuple[str, ...]] = {
    "€": ("EUR",),
    "£": ("GBP", "GIP", "FKP", "SHP", "EGP"),
    "₹": ("INR",),
    "₽": ("RUB",),
    "₩": ("KRW", "KPW"),
    "₪": ("ILS",),
    "₺": ("TRY",),
    "₫": ("VND",),
    "₴": ("UAH",),
    "฿": ("THB",),
    "₱": ("PHP",),
    "₦": ("NGN",),
    "₾": ("GEL",),
    "₸": ("KZT",),
    "₮": ("MNT",),
    "₼": ("AZN",),
    "₲": ("PYG",),
}


def _cell_symbol_currencies(value: str) -> list[tuple[str, tuple[str, ...]]]:
    """Every distinct recognized symbol in an amount cell, in order, with the commodities it names.

    A cell is written by the bank, and `4,50 €` says euros no matter what the
    mapping or the ledger says. The symbol is still stripped before parsing —
    the number is the number — but it is no longer thrown away unread: a symbol
    that contradicts the currency the row would be posted in is a refusal, not a
    relabelling of the money. All of them are read, since `-£4.50€` agrees with
    GBP only if the second symbol is ignored (w5/927).
    """
    found: dict[str, tuple[str, ...]] = {}
    for character in value:
        currencies = _SYMBOL_CURRENCIES.get(character)
        if currencies is not None:
            found.setdefault(character, currencies)
    return list(found.items())


def _negated(number: Decimal) -> Decimal:
    """The same amount with the opposite sign, and not one digit different.

    Unary minus is arithmetic: it applies the active decimal context and
    rounds to its precision, 28 significant digits by default. A bank amount
    is parsed exactly from its source text, so negating it — for parentheses,
    a trailing minus, a debit column, `sign=ledger`, or the generated
    counterposting — silently rewrote a wider value before it was written to
    the ledger, where `check` then confirmed the rounded figure as valid.

    `copy_negate` flips the sign and copies the coefficient untouched.
    """
    return number.copy_negate()


def _split_amount_sign(value: str) -> tuple[str, str, int]:
    """Split the sign, currency symbols, and parentheses off an amount cell.

    Returns the leading +/- sign (kept for Decimal), the bare core, and how
    many parentheses/trailing-minus negations the cell carries. The sign and
    the parentheses are read on either side of a leading symbol, so the
    grouping checks always see an unsigned core.

    The typographic minus (U+2212) some bank and spreadsheet exports write is
    read as `-` wherever it stands: on screen the two are the same sign.
    """
    text = _ZERO_WIDTH.sub("", value).replace("\u2212", "-").strip()
    negations = 0
    if len(text) >= 2 and text.startswith("(") and text.endswith(")"):
        negations += 1
        text = text[1:-1]
    text = text.strip()
    sign = ""
    if text[:1] in ("+", "-"):
        sign, text = text[0], text[1:]
    trailing_minus_seen = False
    # At most two currency symbols plus a trailing minus, then a quiet pass.
    for _ in range(4):
        text = text.strip()
        if not text:
            break
        if _is_currency_symbol(text[:1]):
            text = text[1:]
        elif _is_currency_symbol(text[-1:]):
            text = text[:-1]
        elif text.endswith("-") and not trailing_minus_seen:
            trailing_minus_seen = True
            negations += 1
            text = text[:-1]
        else:
            break
    text = text.strip()
    # A symbol written first hides what follows it from the checks above:
    # `$(1,234.56)` and `$-1,234.56` carry their negative marker after it.
    if len(text) >= 2 and text.startswith("(") and text.endswith(")"):
        negations += 1
        text = text[1:-1].strip()
    if not sign and text[:1] in ("+", "-"):
        # A second sign (`-$-5`) stays on the core, where it is refused.
        sign, text = text[0], text[1:]
    return sign, text.strip(), negations


def _separator_vote(core: str) -> str | None:
    """Vote on a cell's decimal convention: 'us', 'eu', 'eu-weak', or None.

    The grouping fillers the parser removes (spaces, apostrophes) are removed
    first, so `1 234,567` votes as `1234,567` does: otherwise the vote saw one
    shape and the parse another, and the column fell back to point decimals
    and was refused (w5/906).
    """
    core = _THOUSAND_SEPARATOR_FILLER.sub("", core)
    if "." in core and "," in core:
        return "eu" if core.rfind(",") > core.rfind(".") else "us"
    if _COMMA_DECIMAL_TAIL.match(core):
        return "eu-weak"
    if _SINGLE_COMMA_THREE.fullmatch(core) and not _COMMA_GROUPING.fullmatch(core):
        # `0,125` or `1613,030`: three decimals that no grouping can explain,
        # so the cell proves comma decimals as firmly as `1.613,030` does.
        return "eu"
    if _DOT_GROUPING_TWO.fullmatch(core):
        # `1.650.000`: two decimal points no convention writes, so the cell
        # proves dot grouping as firmly as `1.650.000,00` does.
        return "eu"
    return None


def _resolve_decimal_comma(cells: list[tuple[int, str]]) -> bool:
    """Decide from every amount cell whether the column uses comma decimals.

    Refuses columns that mix point and comma decimals — no row may resolve
    the ambiguity alone. Cells arrive keyed by the preview's row number, so
    the refusal names rows the same way the rest of the command does.
    """
    first_us: tuple[int, str] | None = None
    first_eu: tuple[int, str] | None = None
    only_weak_eu = False
    for row_number, value in cells:
        if not value.strip():
            continue
        _sign, core, _negations = _split_amount_sign(value)
        vote = _separator_vote(core)
        if vote == "us" and first_us is None:
            first_us = (row_number, value.strip())
        elif vote == "eu" and first_eu is None:
            first_eu = (row_number, value.strip())
        elif vote == "eu-weak":
            only_weak_eu = True
        if first_us is not None and first_eu is not None:
            earlier, later = (first_us, "point decimals"), (first_eu, "comma decimals")
            if earlier[0][0] > later[0][0]:
                earlier, later = later, earlier
            (early_row, early_cell), early_kind = earlier
            (late_row, late_cell), late_kind = later
            raise UsageError(
                f"The amount columns mix decimal conventions: row {early_row} uses {early_kind} "
                f"({early_cell!r}) but row {late_row} uses {late_kind} ({late_cell!r}). "
                "Use one convention per column."
            )
    if first_eu is not None:
        return True
    return first_us is None and only_weak_eu


def _dot_ambiguous_example(values: list[str]) -> str | None:
    """First cell that reads as dot-grouped thousands or decimals, if the column decides nothing.

    A comma anywhere, or a cell proving either convention, settles the
    column; otherwise a `\\d+\\.\\d{3}` cell is genuinely ambiguous. The vote
    stays strict (only provable grouping changes a reading) while the note
    stays loose (anything suspicious raises an eyebrow).
    """
    example: str | None = None
    for value in values:
        if not value.strip():
            continue
        _sign, core, _negations = _split_amount_sign(value)
        if "," in core or _separator_vote(core) is not None:
            return None
        if example is None and _DOT_THREE_TAIL.fullmatch(core):
            example = value.strip()
    return example


def _dot_ambiguity_note(examples: list[tuple[str, str]], currency: str) -> str:
    """Why a dot-only column's decimal reading is suspect in a zero-decimal currency."""
    if len(examples) == 1:
        header, example = examples[0]
        sign, core, negations = _split_amount_sign(example)
        point = Decimal(f"{sign}{core}")
        if negations:
            point = _negated(point)
        grouped = int(core.replace(".", ""))
        if point.is_signed():
            grouped = -grouped
        return (
            f"Column {header!r} reads {example!r} as {point} {currency}, but {currency} has no minor "
            f"unit and the dots likely group thousands ({grouped}). Pass --csv decimal=comma if these "
            "are whole amounts."
        )
    cells = ", ".join(f"{header} ({example})" for header, example in examples)
    return (
        f"Columns {cells} read as decimals, but {currency} has no minor unit and the dots likely "
        "group thousands. Pass --csv decimal=comma if these are whole amounts."
    )


def _at(row_number: int, line: int) -> str:
    """How every CSV diagnostic names one record.

    One row vocabulary for the whole command. `Row` is the preview's `ROW`
    column — data rows, 1-based, blank rows not counted — so "fix row N" sends
    the reader to the record the preview table shows. The physical file line
    rides along in parentheses, labelled, because it is what helps when hand-
    editing the CSV.

    These used to be the same word for two different numbers: the errors
    reconstructed the file line and called it `Row`, so `Row 5` in an error and
    `Row 5` in the table were different records, and the gap grew with every
    blank row above the failure.
    """
    return f"Row {row_number} (line {line})"


def _unparseable_amount(where: str, column: str, value: str) -> UsageError:
    return UsageError(f"{where}: cannot parse amount {value!r} in column {column!r}. {_ACCEPTED_AMOUNTS}")


def _comma_decimal_to_point(where: str, column: str, value: str, text: str) -> str:
    whole, comma, fraction = text.partition(",")
    if "," in fraction:
        raise _unparseable_amount(where, column, value)
    if "." in whole:
        if not _EU_GROUPING.fullmatch(whole):
            raise _unparseable_amount(where, column, value)
        whole = whole.replace(".", "")
    elif whole and not whole.isdigit():
        raise _unparseable_amount(where, column, value)
    if comma and (not fraction or not fraction.isdigit()):
        raise _unparseable_amount(where, column, value)
    return f"{whole or '0'}.{fraction}" if comma else whole


def _parse_amount_cell(where: str, column: str, value: str, *, decimal_comma: bool) -> Decimal:
    """Parse one bank amount cell under the column's resolved convention."""
    sign, core, negations = _split_amount_sign(value)
    if negations > 1 or (negations and (sign == "-" or core.startswith("-"))):
        # `(-5.00)`, `-5.00-` or `(5.00-)` marks one amount negative twice.
        # Cancelling the two would book a payment as money in: refuse it.
        raise UsageError(
            f"{where}: amount {value!r} in column {column!r} is marked negative twice (more than one of a "
            "minus sign, parentheses, and a trailing minus); keep one negative marker."
        )
    if _NON_FINITE_AMOUNT.fullmatch(core):
        raise UsageError(f"{where}: amount {value!r} in column {column!r} is not a finite number.")
    text = _THOUSAND_SEPARATOR_FILLER.sub("", core)
    if decimal_comma:
        text = _comma_decimal_to_point(where, column, value, text)
    else:
        # Commas are only stripped once they are proven to be grouping: a
        # comma that is not a well-formed group (`0,5` in a point column) is
        # a decimal mark, and deleting it would multiply the amount.
        whole = text.partition(".")[0]
        if "," in whole and not _COMMA_GROUPING.fullmatch(whole):
            raise _unparseable_amount(where, column, value)
        if "," in text.partition(".")[2]:
            raise _unparseable_amount(where, column, value)
        text = text.replace(",", "")
    try:
        number = Decimal(require_decimal_notation(sign + text))
    except ValueError as exc:
        raise UsageError(f"{where}, column {column!r}: {exc}") from None
    except InvalidOperation:
        raise _unparseable_amount(where, column, value) from None
    return _negated(number) if negations else number


def _directed_number(number: Decimal, cell: str, where: str, column: str) -> Decimal:
    """The signed amount of a row whose direction a word column decides.

    As with the debit/credit pair, the column decides the direction and the
    cell supplies only the magnitude: `4.50` under DEBIT posts `-4.50`
    however the bank signed the cell.
    """
    word = cell.strip().casefold()
    if word in _DEBIT_WORDS:
        return _negated(number.copy_abs())
    if word in _CREDIT_WORDS:
        return number.copy_abs()
    if not word:
        raise UsageError(
            f"{where}: empty direction in column {column!r}; every row needs one of DEBIT/CREDIT, D/C, Dr/Cr, Af/Bij."
        )
    raise UsageError(
        f"{where}: unknown direction {cell.strip()!r} in column {column!r}; "
        "use one of DEBIT/CREDIT, D/C, Dr/Cr, Af/Bij."
    )


def _refuse_unmapped_direction(
    headers: list[str], rows: list[dict[str, str]], columns: dict[str, str], *, ledger_sign: bool = False
) -> None:
    """Refuse an unmapped direction-shaped column when the amounts carry no sign.

    Unsigned magnitudes beside a DEBIT/CREDIT column would otherwise book
    every debit as money in, exit 0. Full DEBIT/CREDIT words indict a column
    whatever its header; abbreviations need a direction-shaped header too, so
    a Grade column of C/D stays silent. Signed amounts carry their own
    direction, making the column redundant. With `sign=ledger` already in the
    mapping the repair is a replacement, since `direction=` refuses the pair
    (w5/918).
    """
    for row in rows:
        sign, _core, negations = _split_amount_sign(row.get(columns["amount"], ""))
        if sign == "-" or negations:
            return
    mapped = set(columns.values())
    for header in headers:
        if header in mapped:
            continue
        words = [cell.strip() for cell in (row.get(header, "") for row in rows) if cell.strip()]
        if not words or any(word.casefold() not in _DIRECTION_WORDS for word in words):
            continue
        named = "".join(char for char in header.casefold() if char.isalnum()) in _DIRECTION_HEADERS
        if named or any(word.casefold() in _FULL_DIRECTION_WORDS for word in words):
            if ledger_sign:
                raise UsageError(
                    f"Column {header!r} looks like a direction column ({words[0]!r}, ...): its values are only "
                    "DEBIT/CREDIT words, and the amounts carry no sign, so a column of words should decide each "
                    f"row's direction. Replace sign=ledger with direction={header} in the --csv mapping "
                    "(DEBIT/CREDIT, D/C, Dr/Cr, Af/Bij); the two cannot be combined."
                )
            raise UsageError(
                f"Column {header!r} looks like a direction column ({words[0]!r}, ...): its values are only "
                "DEBIT/CREDIT words, and the amounts carry no sign, so every debit would book as money in. "
                f"Add direction={header} to the --csv mapping (DEBIT/CREDIT, D/C, Dr/Cr, Af/Bij)."
            )


@dataclass(frozen=True)
class CsvMapping:
    """A parsed `--csv` mapping: CSV column names per ledger field."""

    columns: dict[str, str]
    sign: str = "bank"

    def column(self, name: str) -> str | None:
        return self.columns.get(name)


# In a double-quoted TOML string a backslash starts a TOML escape, so the regex
# `\b` arrives as a backspace. Both rule errors that this causes name the way out.
_LITERAL_STRING_HINT = (
    "TOML reads a backslash in a double-quoted string as its own escape; write the regex in single quotes "
    "(match = '\\bshell\\b') or double each backslash (\"\\\\bshell\\\\b\")."
)

# The spellings of "match every row" a rules file may use on purpose.
_EXPLICIT_CATCH_ALL = frozenset({".*", "^.*", ".*$", "^.*$"})


@dataclass(frozen=True)
class CsvRule:
    """One categorization rule: the first matching pattern wins."""

    pattern: str
    account: str
    expression: re.Pattern[str] = field(compare=False)

    @staticmethod
    def compile(index: int, raw: Any, roots: Collection[str] | None = None) -> CsvRule:
        match = raw.get("match") if isinstance(raw, dict) else None
        account = raw.get("account") if isinstance(raw, dict) else None
        if not isinstance(match, str) or not isinstance(account, str):
            raise UsageError(f'Rule {index + 1} must be {{ match = "<regex>", account = "..." }}; got {raw!r}.')
        # `"\bshell\b"` parses to backspaces and `"\t"` to a tab: a pattern no
        # bank text can match, so every row would fall through to the default
        # account with nothing said.
        control = next((character for character in match if character < " " or character == "\x7f"), None)
        if control is not None:
            raise UsageError(
                f"Rule {index + 1} match {match!r} contains the control character {control!r}, "
                f"so it can never match. {_LITERAL_STRING_HINT}"
            )
        if not match.strip():
            raise UsageError(f"Rule {index + 1} has an empty match; write a regex, or .* for a catch-all.")
        # Before the compile, which would only warn and then match something
        # else: Python reads `[[:alpha:]]` as a set of characters (w5/427).
        otherwise = regex_reads_otherwise(unicodedata.normalize("NFC", match), re.IGNORECASE)
        if otherwise is not None:
            raise UsageError(f"Rule {index + 1} match {match!r}: {otherwise}.")
        try:
            # Compiled NFC, like the cell text it searches: `café` typed
            # composed must match a bank's decomposed `café`, and vice versa.
            expression = re.compile(unicodedata.normalize("NFC", match), re.IGNORECASE)
        except re.error as exc:
            raise UsageError(f"Rule {index + 1} has an invalid regex {match!r}: {exc}.") from exc
        # A pattern that matches empty text (`a|b|`, `(x)?`, `y*`) matches every
        # row, so a typo would silently categorize all of them. Only the
        # documented spelling of a catch-all may do that.
        if expression.search("") is not None and match.strip() not in _EXPLICIT_CATCH_ALL:
            raise UsageError(
                f"Rule {index + 1} pattern {match!r} matches empty text, so it would categorize every row; "
                "drop the empty alternative (such as a trailing |), or write .* for an explicit catch-all."
            )
        # A rule naming an unopenable account used to surface as every matching
        # row being "not open" — a name no `open` directive can ever create.
        # Refuse it here, where the rule number says which line to fix.
        from bea_engine.ledger.text import parse_account

        try:
            account = parse_account(account, roots)
        except UsageError as exc:
            raise UsageError(f"Rule {index + 1}: {exc}") from None
        return CsvRule(pattern=match, account=account, expression=expression)


def split_spec(spec: str) -> list[str]:
    """`--csv`'s comma-separated parts, a double-quoted stretch kept whole.

    A bank header such as `Amount (USD, net)` holds a comma, and splitting on
    every one left no way to name it: `amount="Amount (USD, net)"` failed as
    `Bad --csv mapping ' net)"'` (w5/428). The quotes stay in the part, for
    `spec_value` to take off. Inside a quoted stretch two quotes in a row are one literal quote,
    as in CSV: a header `Memo "` is written with the whole value quoted and the
    quote doubled (w5/967).
    """
    parts: list[str] = []
    current: list[str] = []
    quoted = False
    characters = iter(enumerate(spec))
    for position, character in characters:
        if character == '"':
            if quoted and spec[position + 1 : position + 2] == '"':
                # A doubled quote inside a quoted stretch is a literal quote,
                # CSV's own convention, for a header such as `Memo "` (w5/967).
                current.append(character)
                current.append(next(characters)[1])
                continue
            quoted = not quoted
        elif character == "," and not quoted:
            parts.append("".join(current))
            current = []
            continue
        current.append(character)
    if quoted:
        raise UsageError(f"--csv {spec!r} has an unclosed double quote; close it after the column name.")
    parts.append("".join(current))
    return parts


def spec_value(column: str) -> str:
    """A `--csv` value without the double quotes that let it hold a comma."""
    column = column.strip()
    if len(column) >= 2 and column[0] == column[-1] == '"':
        return column[1:-1].replace('""', '"').strip()
    return column


def _missing_pair(part: str) -> str:
    """Why a `--csv` part is not a `field=Column` pair, and the likeliest cause."""
    return (
        f"Bad --csv mapping {part!r}: use field=Column pairs like date=Date,amount=Amount,payee=Payee. "
        'A column name with a comma in it must be double-quoted, as in amount="Amount (USD, net)".'
    )


def parse_mapping(spec: str) -> CsvMapping:
    """Parse `--csv field=Column,...` into a validated mapping (exit 2 on misuse).

    Unlike the frontend copy, this rejects `delimiter=`, `encoding=`,
    `decimal=`, and `skip=`: the frontend strips all four before forwarding,
    and that rejection is the safety net proving the strip happened.
    """
    columns: dict[str, str] = {}
    sign = "bank"
    signed = False
    for part in split_spec(spec):
        name, separator, column = part.partition("=")
        name, column = name.strip(), spec_value(column)
        if not separator or not name or not column:
            raise UsageError(_missing_pair(part))
        if name not in _MAPPING_FIELDS:
            raise UsageError(f"Unknown --csv field {name!r}; expected one of {sorted(_MAPPING_FIELDS)}.")
        if name == "sign":
            if column not in ("bank", "ledger"):
                raise UsageError(f"Bad --csv sign {column!r}: use sign=bank or sign=ledger.")
            if signed:
                # The last one silently won, so `sign=ledger,sign=bank` and the
                # reverse booked every row with opposite signs (w5/426).
                raise UsageError("Duplicate --csv field 'sign'.")
            sign, signed = column, True
        elif name in columns:
            raise UsageError(f"Duplicate --csv field {name!r}.")
        else:
            # Normalized, like the header names `open_records` returns: a
            # mapping that names a zero-width header exactly as written must
            # match the stored spelling (w5/716).
            columns[name] = _normalize_header(column)
    if "date" not in columns:
        raise UsageError(f"--csv needs date=Column; got {spec!r}.")
    # Beancount's payee is optional, and most exports carry one free-text
    # column. Forcing it into payee would put a raw bank memo in the field
    # payee-based reporting groups by, so either description field will do.
    if "payee" not in columns and "narration" not in columns:
        raise UsageError(
            f"--csv needs payee=Column or narration=Column for the description; got {spec!r}. "
            "A single bank description column belongs in narration=."
        )
    has_amount = "amount" in columns
    has_pair = "debit" in columns or "credit" in columns
    if has_amount == has_pair:
        raise UsageError("--csv needs amount=Column or debit=A,credit=B (exactly one of the two).")
    if has_pair and ("debit" not in columns or "credit" not in columns):
        raise UsageError("--csv needs both debit=A and credit=B together.")
    if "direction" in columns and has_pair:
        raise UsageError(
            "--csv direction=Column combines with amount=Column, not with debit=A,credit=B, "
            "which already decides each row's direction."
        )
    if "direction" in columns and sign == "ledger":
        raise UsageError("--csv direction=Column already decides each row's direction; drop sign=ledger.")
    return CsvMapping(columns=columns, sign=sign)


def load_rules(path: Path, roots: Collection[str] | None = None) -> list[CsvRule]:
    """Load `--rules` TOML into ordered, compiled rules (exit 2 on misuse).

    With the ledger's ``roots``, a rule account under any other root is refused.
    """
    import tomllib

    try:
        raw = tomllib.loads(path.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        raise UsageError(f"Cannot read rules file {path}: {exc}.") from exc
    except ValueError as exc:
        hint = f" {_LITERAL_STRING_HINT}" if "Unescaped '\\'" in str(exc) else ""
        raise UsageError(f"Cannot parse rules file {path} as TOML: {exc}.{hint}") from exc
    if isinstance(raw, dict):
        _refuse_unknown_rule_keys(path, raw)
    entries = raw.get("rule")
    if not isinstance(entries, list) or not entries:
        raise UsageError(f"Rules file {path} must hold a [[rule]] list with match and account each.")
    try:
        return [CsvRule.compile(index, entry, roots) for index, entry in enumerate(entries)]
    except UsageError as exc:
        raise UsageError(f"Rules file {path}: {exc}") from exc


def _refuse_unknown_rule_keys(path: Path, raw: dict[str, Any]) -> None:
    """Refuse a table or key a rules file does not define, rather than ignore it.

    A misspelled `[[rules]]` block dropped every rule under it and booked those
    rows to the default account with exit 0, and a rule's `field`, `flag` or
    `narration` read like restrictions but did nothing (w5/338).
    """
    for name, value in raw.items():
        if name == "rule":
            continue
        shown = f"[[{name}]]" if isinstance(value, list) else f"[{name}]" if isinstance(value, dict) else name
        kind = "key" if shown == name else "table"
        near = " — did you mean [[rule]]?" if name.casefold().rstrip("s") == "rule" else "."
        raise UsageError(f"Rules file {path}: unknown {kind} {shown}; a rules file holds only [[rule]] entries{near}")
    for index, entry in enumerate(raw.get("rule") or []):
        if not isinstance(entry, dict):
            continue
        extra = sorted(set(entry) - {"match", "account"})
        if extra:
            raise UsageError(
                f"Rules file {path}: rule {index + 1} has unknown key {extra[0]!r}; each rule holds only "
                "match and account."
            )


# Header names, lowercased, that identify a field beyond doubt. A role is only
# inferred when exactly one column claims it, so a bank that ships both
# "Description" and "Memo" is reported as ambiguous rather than
# guessed at. "Description"-style columns map to narration, never to payee.
_HEADER_SYNONYMS: dict[str, tuple[str, ...]] = {
    "date": ("date", "transaction date", "posting date", "post date", "posted date", "date posted", "booking date"),
    "amount": ("amount", "transaction amount"),
    "debit": ("debit", "withdrawal", "withdrawals", "money out", "paid out"),
    "credit": ("credit", "deposit", "deposits", "money in", "paid in"),
    "payee": ("payee", "merchant", "merchant name", "name", "counterparty"),
    "narration": (
        "description",
        "memo",
        "details",
        "narration",
        "particulars",
        "transaction description",
        "original description",
        "orig description",
    ),
    "currency": ("currency", "currency code", "ccy"),
    "id": ("id", "transaction id", "transaction_id", "reference number", "fitid", "txn id", "txnid", "bank id"),
    "category": ("category",),
    "status": ("status", "transaction status"),
}


#: Status words for a row not posted yet: it posts later, often at another
#: amount (w5/614). Card exports spell holds and authorizations many ways, and
#: `Temporary Hold` or `Pre-authorized` rows were imported as posted (w5/831).
#: `cli.csv_mapper` keeps the same words; a test pins that they agree.
PENDING_STATUSES = frozenset(
    {
        "authorized",
        "authorised",
        "authorization",
        "authorisation",
        "pre-authorized",
        "pre-authorised",
        "preauthorized",
        "preauthorised",
        "pre-authorization",
        "pre-authorisation",
        "hold",
        "held",
        "on hold",
        "on-hold",
        "temporary hold",
        "processing",
        "not posted",
        "unposted",
    }
)
#: Status words for a row that never posted and never will: no amount to book.
NEVER_POSTED_STATUSES = frozenset(
    {"declined", "reverted", "failed", "cancelled", "canceled", "void", "voided", "rejected"}
)


def is_pending(value: str | None) -> bool:
    """Whether a status cell marks a row that is not posted: pending, held, authorized — or never posted."""
    text = (value or "").strip().casefold()
    return text.startswith("pending") or text in PENDING_STATUSES or text in NEVER_POSTED_STATUSES


def never_posts(value: str | None) -> bool:
    """Whether a status cell marks a row that will never post: declined, reverted, failed, cancelled."""
    return (value or "").strip().casefold() in NEVER_POSTED_STATUSES


def _row_summary(row: dict[str, str], columns: dict[str, str]) -> str:
    cells = (
        row.get(columns[field], "").strip()
        for field in ("date", "payee", "narration", "amount", "debit", "credit")
        if field in columns
    )
    return " ".join(cell for cell in cells if cell)


def _pending_column(headers: list[str], rows: list[dict[str, str]], columns: dict[str, str]) -> tuple[str, int] | None:
    """An unmapped column that marks rows pending, and how many, for a note."""
    mapped = set(columns.values())
    for header in headers:
        if header in mapped:
            continue
        count = sum(is_pending(row.get(header)) for row in rows)
        if count:
            return header, count
    return None


# Ordered so the unambiguous ISO form wins before the day/month forms it could
# never be confused with.
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%m/%d/%Y",
    "%d/%m/%Y",
    "%m/%d/%y",
    "%d/%m/%y",
    "%m-%d-%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%d %b %Y",
    "%b %d, %Y",
    "%Y%m%d",
)


@dataclass(frozen=True)
class InferredMapping:
    """A `--csv` spec read off the header row, with what stayed uncertain."""

    spec: str | None
    ambiguities: list[str]
    example: str


def infer_mapping(headers: list[str] | None) -> InferredMapping | None:
    """Recognized columns and ambiguities, or None for an unrecognized header.

    A role two columns claim is dropped rather than guessed. An incomplete
    mapping keeps its ambiguities but has no usable spec. `example` always
    shows a paste-ready line: tied roles filled with their first claimant in
    header order, so the ambiguity note can show the `--csv` line that
    resolves it.
    """
    if not headers:
        return None
    columns: dict[str, str] = {}
    ambiguities: list[str] = []
    first_claimant: dict[str, str] = {}
    for role, synonyms in _HEADER_SYNONYMS.items():
        matches = [header for header in headers if header.strip().casefold() in synonyms]
        if len(matches) == 1:
            columns[role] = matches[0]
        elif matches:
            ambiguities.append(f"{role} ({', '.join(sorted(matches))})")
            first_claimant[role] = matches[0]
    if not columns and not ambiguities:
        return None
    example_columns = {**columns, **first_claimant}
    if "amount" in example_columns:
        example_columns.pop("debit", None)
        example_columns.pop("credit", None)
    example = ",".join(f"{role}={example_columns[role]}" for role in _HEADER_SYNONYMS if role in example_columns)
    if "amount" in columns:
        columns.pop("debit", None)
        columns.pop("credit", None)
    elif "debit" not in columns or "credit" not in columns:
        return InferredMapping(spec=None, ambiguities=ambiguities, example=example)
    if "date" not in columns or ("payee" not in columns and "narration" not in columns):
        return InferredMapping(spec=None, ambiguities=ambiguities, example=example)
    order = [role for role in _HEADER_SYNONYMS if role in columns]
    return InferredMapping(
        spec=",".join(f"{role}={columns[role]}" for role in order),
        ambiguities=ambiguities,
        example=example,
    )


def _malformed(source: Path, line: int, exc: csv.Error) -> UsageError:
    return UsageError(
        f"Line {line}: {source.name} is not well-formed CSV ({exc}). "
        "An unclosed quote swallows every row after it; close the quote and retry. Nothing was written."
    )


def _read_codec(encoding: str) -> str:
    """The `open()` codec: UTF-8 tolerates a BOM, the rest read as named."""
    return "utf-8-sig" if encoding == "utf-8" else encoding


_UTF16_BOMS = (b"\xff\xfe", b"\xfe\xff")


def _refuse_utf16(source: Path) -> None:
    """Refuse UTF-16 text (Excel's "Unicode Text") and binaries before any codec reads them.

    cp1252 and latin-1 decode nearly any bytes, so a UTF-16 export used to be
    diagnosed as cp1252 and then read as a header of `ÿþD a t e`. No supported
    encoding reads a file with a UTF-16 byte-order mark or NUL bytes; say what
    can. NULs all on one byte parity are BOM-less UTF-16; scattered ones are a
    binary file such as a spreadsheet.
    """
    with open(source, "rb") as stream:
        head = stream.read(4096)
    if b"\x00" not in head and not head.startswith(_UTF16_BOMS):
        return
    even, odd = head[0::2].count(0), head[1::2].count(0)
    if head.startswith(_UTF16_BOMS) or (min(even, odd) == 0 and 4 * max(even, odd) >= len(head) // 2):
        raise UsageError(
            f"{source.name} is UTF-16 text, which import cannot read; re-save it as UTF-8 (Excel: CSV UTF-8) and retry."
        )
    raise UsageError(
        f"{source.name} contains NUL bytes, so it is not a CSV text file (a spreadsheet or other binary?); "
        "export it as CSV UTF-8 and retry."
    )


def probe_decoding(source: Path) -> str:
    """First of utf-8, cp1252, latin-1 that decodes this file.

    latin-1 maps every byte, so it always matches — callers treat a
    latin-1-only win as a refusal, not a decoding, rather than mojibake
    binary garbage silently.
    """
    data = source.read_bytes()
    for codec in ("utf-8", "cp1252"):
        try:
            data.decode(codec)
        except UnicodeDecodeError:
            continue
        return codec
    return "latin-1"


def parse_encoding(value: str) -> str:
    """Normalize an `--encoding` value to utf-8, cp1252, or latin-1."""
    folded = value.strip().casefold()
    if folded in {"utf-8", "utf8"}:
        return "utf-8"
    if folded in {"cp1252", "windows-1252"}:
        return "cp1252"
    if folded in {"latin-1", "latin1", "iso-8859-1"}:
        return "latin-1"
    raise UsageError(f"Bad --encoding {value!r}: use utf-8, cp1252, or latin-1.")


def _mixed_lines(source: Path) -> tuple[int, int] | None:
    """The first line that is multi-byte UTF-8 and the first that is not UTF-8, when a file holds both."""
    try:
        data = source.read_bytes()
    except OSError:
        return None
    utf8: int | None = None
    other: int | None = None
    for number, line in enumerate(data.splitlines(), start=1):
        try:
            line.decode("utf-8")
        except UnicodeDecodeError:
            other = other or number
        else:
            if not line.isascii():
                utf8 = utf8 or number
        if utf8 and other:
            return utf8, other
    return None


def _absolute_offset(source: Path, exc: UnicodeDecodeError, encoding: str) -> int:
    """The file offset of a decode failure, not the offset in its 8 KiB chunk.

    Text-mode iteration decodes chunk by chunk, so past the first chunk the
    exception's `start` is chunk-relative. One decode over the raw bytes
    fails at the same first bad byte with the absolute offset; when the file
    is gone or changed under us, the chunk offset still stands (w5/717).
    """
    try:
        source.read_bytes().decode(_read_codec(encoding))
    except UnicodeDecodeError as full:
        return full.start
    except OSError:
        pass
    return exc.start


def _decode_usage_error(source: Path, exc: UnicodeDecodeError, encoding: str) -> UsageError:
    """Name a decode failure instead of pretending the CSV had no columns.

    Under default UTF-8 the fallback chain identifies which codecs can read
    the bytes, not the export's actual encoding. Legacy-codec advice stays
    conditional; an explicitly chosen codec reports its own failure.
    """
    offset = _absolute_offset(source, exc, encoding)
    if encoding != "utf-8":
        return UsageError(f"{source.name} is not valid {encoding} ({exc.reason} at byte {offset}).")
    try:
        winner = probe_decoding(source)
    except OSError:
        winner = "latin-1"
    mixed = _mixed_lines(source)
    if mixed is not None:
        # cp1252 reads every byte, so it was suggested for a file whose other
        # lines are UTF-8, and following it turned `é` into `Ã©` (w5/406).
        utf8, other = mixed
        return UsageError(
            f"{source.name} mixes encodings: line {utf8} is UTF-8 with accented characters, while line {other} "
            f"is not UTF-8 ({exc.reason} at byte {offset}). No single --csv encoding reads both correctly; "
            "re-save the export in one encoding (UTF-8) and import it again."
        )
    if winner == "cp1252":
        # Many unrelated code pages decode as cp1252. Their text cannot be
        # reliably distinguished from Western text by its letter patterns.
        return UsageError(
            f"{source.name} is not valid UTF-8 ({exc.reason} at byte {offset}). "
            "Re-save the export as UTF-8 and import it again, or pass --csv encoding=cp1252 only if the export "
            "really uses Western European Windows-1252 (cp1252)."
        )
    # latin-1 reads every byte, so it cannot have failed: saying it was tried
    # sent a Shift_JIS export to the one decoding that garbles it (w5/332).
    return UsageError(
        f"Cannot decode {source.name} as UTF-8 or cp1252 ({exc.reason} at byte {offset}); only latin-1, "
        "which reads any byte, accepts it. Pass --csv encoding=latin-1 if that is the export's encoding."
    )


_CANDIDATE_DELIMITERS = (",", ";", "\t", "|")

_SAMPLE_LINES = 5
#: How much of a file is read to choose a separator (a quoted cell may span many lines).
_SAMPLE_CHARS = 262144


def _field_count(line: str, delim: str) -> int | None:
    """The field count one candidate yields, or None when it cannot parse."""
    try:
        return len(next(csv.reader([line], delimiter=delim, strict=True), []))
    except csv.Error:
        return None


def _sample_records(text: str, delim: str, skip: int, *, truncated: bool) -> tuple[list[list[str]], bool]:
    """The first non-empty records after `skip`, read as complete CSV records under `delim`.

    Quoted cells may span lines, so a preamble title or a header cell with a
    newline is one record here, as extraction reads it; sampling physical lines
    saw its inside and chose a separator from there (w5/922). The second value
    is False when this separator cannot parse the sample at all.
    """
    records: list[list[str]] = []
    try:
        reader = csv.reader(io.StringIO(text), delimiter=delim, strict=True)
        for _ in range(skip):
            if next(reader, None) is None:
                break
        for record in reader:
            if record:
                records.append(record)
            if len(records) > _SAMPLE_LINES:
                break
    except csv.Error:
        return records, False
    if truncated and len(records) <= _SAMPLE_LINES and records:
        # The sample ended inside a record: the last one is partial.
        records.pop()
    return records[:_SAMPLE_LINES], True


def detect_delimiter(source: Path, encoding: str = "utf-8", skip: int = 0) -> str:
    """Pick comma, semicolon, tab, or pipe from the first non-empty records after ``skip``.

    Bank exports often use ``;`` (EU), tabs, or ``|`` (brokers). Prefer the
    separator on which the header and every sampled body row agree on one
    multi-field count, so a header tied on field count resolves by the body
    and a body tie resolves by the header: a comma file whose quoted cells
    hold semicolons, or a tab file whose dates hold commas, splits its header
    on the real separator only. A separator the body agrees on but the header
    does not (a merged header cell) comes next, provided the header splits on
    it at all; when nothing is consistent the most fields on the header line
    wins. Records, not lines: see `_sample_records`.
    """
    _refuse_utf16(source)
    try:
        with open(source, encoding=_read_codec(encoding), newline="") as stream:
            text = stream.read(_SAMPLE_CHARS)
            truncated = len(text) >= _SAMPLE_CHARS
    except UnicodeDecodeError as exc:
        raise _decode_usage_error(source, exc, encoding) from None
    if not text.strip():
        return ","
    agreed: tuple[int, str] | None = None
    body_only: tuple[int, str] | None = None
    header_counts: dict[str, int | None] = {}
    for delim in _CANDIDATE_DELIMITERS:
        sample, parsed = _sample_records(text, delim, skip, truncated=truncated)
        header_counts[delim] = len(sample[0]) if sample else None
        if not parsed or not sample:
            continue
        counts = {len(record) for record in sample[1:]}
        if len(counts) != 1:
            continue
        (count,) = counts
        header_count = len(sample[0])
        if count < 2 or header_count < 2:
            continue
        if header_count == count:
            if agreed is None or count > agreed[0]:
                agreed = (count, delim)
        elif body_only is None or count > body_only[0]:
            body_only = (count, delim)
    if agreed is not None:
        return agreed[1]
    if body_only is not None:
        return body_only[1]
    best = ","
    best_count = 0
    for delim in _CANDIDATE_DELIMITERS:
        header_fields = header_counts.get(delim)
        if header_fields is not None and header_fields > best_count:
            best, best_count = delim, header_fields
    return best


_SEPARATOR_NAMES = {",": "comma", ";": "semicolon", "\t": "tab", "|": "pipe"}


def unsplit_header(headers: list[str], used: str | None) -> str | None:
    """The separator that splits a one-column header into the most cells, when the one in force did not.

    The first one present was named, so `Date;Payee, Name;Amount` was called
    comma-separated, and following that advice failed on "lacks" (w5/845).
    """
    if len(headers) != 1:
        return None
    best, cells = None, 1
    for sep in _SEPARATOR_NAMES:
        count = _field_count(headers[0], sep) if sep != used else None
        if count is not None and count > cells:
            best, cells = sep, count
    return best


def _shown_delimiter(delimiter: str | None) -> str:
    return "tab" if delimiter == "\t" else f"'{delimiter or ','}'"


def parse_delimiter(value: str) -> str:
    """Normalize ``--delimiter`` to a single character (``,``, ``;``, tab, ``|``).

    Only spaces are padding: `strip()` took a literal tab for whitespace and
    refused `--delimiter $'\\t'`, the usual shell spelling for TSV (w5/621).
    """
    raw = value.strip(" ")
    folded = raw.casefold()
    if folded in {",", "comma"}:
        return ","
    if folded in {";", "semicolon"}:
        return ";"
    if folded in {"tab", r"\t", "t"} or raw == "\t":
        return "\t"
    if folded in {"|", "pipe"}:
        return "|"
    raise UsageError(f"Bad --delimiter {value!r}: use ',', ';', '|', or 'tab'.")


def parse_decimal(value: str) -> str:
    """Normalize a `--decimal` value to `comma` or `point`."""
    folded = value.strip().casefold()
    if folded in {"comma", "point"}:
        return folded
    raise UsageError(f"Bad --decimal {value!r}: use 'comma' or 'point'.")


def _refuse_surplus_fields(source: Path, line: int, headers: list[str], record: list[str]) -> None:
    """Refuse a row carrying more fields than the header declares.

    Keying the row by enumerating the headers silently dropped everything past
    the last one, and the surviving cells then shifted: an unquoted thousands
    separator turned `2026-01-02,-1,234.56,Coffee` into `-1 USD` with the
    narration `234.56`, which imports, balances, and passes `bea check`. The
    row is structurally ambiguous — it could be a quoting mistake or the wrong
    delimiter — so it is refused rather than guessed at, before anything is
    written.

    Surplus cells that are *empty* are tolerated and dropped: a trailing
    delimiter is common and carries no data to lose. Only content is refused,
    which keeps this to the reported defect rather than a change of
    short-row/optional-field policy.
    """
    if len(record) <= len(headers) or not any(cell.strip() for cell in record[len(headers) :]):
        return
    surplus = ", ".join(repr(cell) for cell in record[len(headers) :][:3])
    raise UsageError(
        f"Line {line} of {source.name} has {len(record)} fields but the header declares {len(headers)}: {surplus}.",
        details=[
            'A value containing the delimiter must be quoted, as in "-1,234.56".',
            "If the file uses a different separator, name it with --delimiter.",
            "Nothing was imported; no row was guessed at.",
        ],
    )


def _normalize_header(cell: str) -> str:
    """One spelling for header cells, mapping names, and remembered signatures.

    Invisible format characters (category Cf: zero-width spaces, direction
    marks, soft hyphens, BOMs) are dropped and Unicode spaces fold to a
    plain space before the NFC comparison both sides share — otherwise the
    column list prints a name no `--csv` mapping can type back (w5/716).
    """
    folded = "".join(
        " " if unicodedata.category(char) == "Zs" else char for char in cell if unicodedata.category(char) != "Cf"
    )
    return unicodedata.normalize("NFC", folded.strip())


def _is_header_repeat(row: dict[str, str], headers: list[str]) -> bool:
    """Whether a record repeats the header (a bank's page break).

    Compared the way the header itself was read: the initial cells are
    normalized into the column names, so a page header spelled with decomposed
    accents or an inner format character must be too, or it was refused as a
    row with a bad date (w5/923).
    """
    return bool(headers) and all(_normalize_header(row.get(header) or "") == header for header in headers)


@contextmanager
def open_records(
    source: Path, *, delimiter: str | None = None, encoding: str = "utf-8", skip: int = 0
) -> Iterator[tuple[list[str], Iterator[tuple[int, dict[str, str]]]]]:
    """The stripped header row, and each data row with the line it starts on.

    This is the one reader every CSV path shares, so discovery, date inference,
    and extraction agree on what a column is called: names are stripped (and
    the BOM dropped) exactly as `IMPORTING.md` promises. Quoting is strict —
    a quote left open at end of file fails with its line instead of silently
    folding every later row into one field. When ``delimiter`` is omitted the
    sampled rows choose among comma, semicolon, tab, and pipe. ``skip`` drops
    that many leading records (`--csv skip=N`) before the header is read.
    """
    _refuse_utf16(source)
    delim = detect_delimiter(source, encoding=encoding, skip=skip) if delimiter is None else delimiter
    with open(source, encoding=_read_codec(encoding), newline="") as stream:
        reader = csv.reader(stream, delimiter=delim, strict=True)
        # A malformed record is reported where it starts: `line_num` has by
        # then run to the end of the file when an unclosed quote swallowed it.
        header_start = 1
        consumed = 0
        try:
            for _ in range(skip):
                if next(reader, None) is None:
                    break
                consumed += 1
                header_start = reader.line_num + 1
            first = next(reader, None)
            # Blank lines before the header (some bank exports start with
            # one) are not the header; `detect_delimiter` skips them too, and
            # `line_num` keeps counting them, so file lines stay right.
            while first is not None and not any(cell.strip() for cell in first):
                consumed += 1
                header_start = reader.line_num + 1
                first = next(reader, None)
            if first is None and skip:
                raise UsageError(
                    f"--csv skip={skip} skips every record of {source.name} ({consumed} read); "
                    "the header is past the end of the file."
                )
        except csv.Error as exc:
            raise _malformed(source, header_start, exc) from None
        except UnicodeDecodeError as exc:
            raise _decode_usage_error(source, exc, encoding) from None
        # Normalized, like the mapping that names them: a header typed
        # composed must find a bank's decomposed spelling of the same name,
        # and vice versa. Invisible format characters are dropped and Unicode
        # spaces folded too: a doubled BOM or a U+200B left `Date`
        # unmatchable while the column list showed it plain (w5/531), and
        # direction marks and soft hyphens did the same (w5/716).
        headers = [_normalize_header(cell) for cell in first or []]

        def rows() -> Iterator[tuple[int, dict[str, str]]]:
            # `line_num` counts lines *consumed*, so after the header it names
            # the header's own line and after each record the record's last
            # line. A record therefore starts one past wherever the reader was
            # before it — which is the only way to get this right once a
            # quoted cell contains newlines and a record stops being a line.
            start = reader.line_num + 1
            try:
                for record in reader:
                    _refuse_surplus_fields(source, start, headers, record)
                    yield start, {name: record[i] if i < len(record) else "" for i, name in enumerate(headers)}
                    start = reader.line_num + 1
            except csv.Error as exc:
                raise _malformed(source, start, exc) from None
            except UnicodeDecodeError as exc:
                raise _decode_usage_error(source, exc, encoding) from None

        yield headers, rows()


def infer_date_format(
    source: Path, column: str, *, delimiter: str | None = None, encoding: str = "utf-8", skip: int = 0
) -> tuple[str | None, bool]:
    """The one date format that parses this column, and whether others also did.

    Day-first and month-first columns are indistinguishable until a row carries
    a day past the twelfth, so the caller is told when the choice was a guess
    instead of silently booking half a year into the wrong month.

    The whole column is read: the deciding day can arrive at any row, and a
    sample that stopped at 200 chose month-first for an export whose 201st date
    was `13/04/2024`, then refused that valid date. Candidates are narrowed as
    the rows stream, so no value is kept.
    """
    working = list(_DATE_FORMATS)
    seen = False
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding, skip=skip) as (headers, rows):
            if column not in headers:
                return None, False
            for _line, row in rows:
                if _is_header_repeat(row, headers):
                    continue
                value = row[column].strip()
                if not value:
                    continue
                seen = True
                working = [candidate for candidate in working if _parses(value, candidate)]
                if not working:
                    return None, False
    except (OSError, UnicodeDecodeError, UsageError):
        return None, False
    if not seen:
        return None, False
    return working[0], len(working) > 1


def _parses(value: str, date_format: str) -> bool:
    try:
        datetime.strptime(value, date_format)
    except ValueError:
        return False
    return True


def _has_year_directive(date_format: str) -> bool:
    """Whether a strptime format spells out a year directive (w5/783).

    A format without one is refused: a genuinely yearless one lands every row in
    1900, and the locale shorthands `%x`/`%c` read a year only as the platform
    defines them, so they must be expanded into explicit fields (w5/930).
    """
    return any(directive in date_format.replace("%%", "") for directive in ("%Y", "%y", "%G"))


def _locale_shorthand(date_format: str) -> str | None:
    """The first unescaped locale-dependent directive, `%x` or `%c`, in a strptime format."""
    unescaped = date_format.replace("%%", "")
    return next((directive for directive in ("%x", "%c") if directive in unescaped), None)


def header_signature(headers: list[str] | None) -> str | None:
    """Identify a CSV source by its header row without storing file contents."""
    if not headers:
        return None
    # Normalized here too: a record stored before headers were read NFC —
    # or with zero-width characters still in them — keeps matching (w5/716).
    joined = "\0".join(_normalize_header(header) for header in headers)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def read_header(
    source: Path, *, delimiter: str | None = None, encoding: str = "utf-8", skip: int = 0
) -> list[str] | None:
    """Read a CSV header row, or None when the file is not a readable CSV.

    Decode failures raise ``UsageError`` so import does not claim the header
    had zero columns and suggest a ``--csv`` mapping that cannot help.
    """
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding, skip=skip) as (headers, _rows):
            return headers or None
    except UnicodeDecodeError as exc:
        raise _decode_usage_error(source, exc, encoding) from None
    except OSError:
        return None


def _lookalike_header(column: str, headers: list[str]) -> str | None:
    """The one header that differs from a mapped column name only by case, Turkish İ/ı included (w5/533)."""
    from bea_engine.ledger.text import fold_account

    folded = fold_account(column)
    matches = [header for header in headers if header != column and fold_account(header) == folded]
    return matches[0] if len(matches) == 1 else None


def _header_line_for(source: Path, column: str, delimiter: str | None, encoding: str) -> tuple[int, int] | None:
    """First of the head records holding `column` as a field, as (line, record index).

    Only the refusal for a mapped column the header lacks calls this: when a
    preamble pushed the header down, the index is the `--csv skip=` value that
    starts the header there. Anything unreadable misses, and the refusal stands
    without its hint.
    """
    try:
        delim = delimiter if delimiter is not None else detect_delimiter(source, encoding=encoding)
        with open(source, encoding=_read_codec(encoding), newline="") as stream:
            reader = csv.reader(stream, delimiter=delim, strict=True)
            start = 1
            for index in range(10):
                record = next(reader, None)
                if record is None:
                    return None
                if any(_normalize_header(cell) == column for cell in record):
                    return start, index
                start = reader.line_num + 1
    except (OSError, UnicodeDecodeError, csv.Error, UsageError):
        return None
    return None


class CsvImporter:
    """A column-mapping importer with the Beangulp shape (`name = "csv"`)."""

    name = "csv"

    def __init__(
        self,
        *,
        account: str,
        mapping: CsvMapping,
        date_format: str = "%Y-%m-%d",
        rules: list[CsvRule] | None = None,
        default_account: str = "Expenses:Uncategorized",
        currency: str | None = None,
        known_currencies: frozenset[str] | None = None,
        source_open: bool = False,
        delimiter: str | None = None,
        encoding: str = "utf-8",
        account_roots: Collection[str] | None = None,
        forced_decimal_comma: bool | None = None,
        skip: int = 0,
        delimiter_source: str = "--delimiter",
        ledger: Path | None = None,
    ) -> None:
        self._delimiter_source = delimiter_source
        # A remedy to paste names the ledger it is about (w5/838, as w5/619).
        self._bea = bea_command(ledger) if ledger is not None else "bea"
        if not _has_year_directive(date_format):
            shorthand = _locale_shorthand(date_format)
            if shorthand is not None:
                example = "'%m/%d/%y'" if shorthand == "%x" else "'%a %b %d %H:%M:%S %Y'"
                raise UsageError(
                    f"--date-format {date_format!r} uses the locale shorthand {shorthand}, whose layout depends on "
                    "the platform's locale, so it is not accepted. Spell the file's date out with an explicit year "
                    f"directive (%Y, %y or %G), for example {example}."
                )
            raise UsageError(
                f"--date-format {date_format!r} has no year directive (%Y, %y or %G), so every row would be read "
                "as 1900. Pass a format that reads the file's year (for example '%d/%m/%Y'), or add the year to "
                "the file's dates first."
            )
        self._account = account
        # The ledger's root names; a category under any other root is a label.
        self._account_roots = account_roots
        self._mapping = mapping
        self._delimiter = delimiter
        self._encoding = encoding
        self._skip = skip
        self._date_format = date_format
        self._rules = rules or []
        self._default_account = default_account
        self._currency = currency
        # Commodities a constant `currency=CODE` may name; None skips the check.
        self._known_currencies = known_currencies
        self._source_open = source_open
        # Set by _check_columns when the currency mapping names a commodity
        # rather than a column the file has.
        self._constant_currency: str | None = None
        self._decimal_comma = False
        # Each amount column's own convention when it is inferred: a debit
        # column's `1,234` is thousands whatever the credit column's `0,50` is (w5/895).
        self._decimal_by_column: dict[str, bool] = {}
        # A `--csv decimal=` choice: skips the column vote, and an explicit
        # choice is never second-guessed with an ambiguity note.
        self._forced_decimal_comma = forced_decimal_comma
        # A dot-only column read as decimals in a zero-decimal currency, for
        # the caller to report once.
        self.ambiguous_dot_amounts: str | None = None
        self.skipped_blank_rows = 0
        # Physical lines that repeat the header exactly (page breaks), for
        # the caller to report once.
        self.skipped_repeated_headers: list[int] = []
        # Rows a mapped status column marks pending, each summarized for the
        # note; and, with none mapped, a column that marks some pending (w5/614).
        self.skipped_pending: list[str] = []
        self.skipped_unposted: list[str] = []
        self._account_names: dict[str, bool] = {}
        self.pending_column: tuple[str, int] | None = None
        # Category values that were not account names, for the caller to report once.
        self.rejected_categories: Counter[str] = Counter()
        # Rows whose category names the source account itself (w5/468).
        self.source_categories = 0

    @property
    def constant_currency(self) -> str | None:
        """The commodity `currency=CODE` fixed for every row, once extraction ran."""
        return self._constant_currency

    def identify(self, filepath: str) -> bool:
        return True

    def account(self, filepath: str) -> str:
        return self._account

    def _dot_ambiguity(
        self, numbered: list[tuple[int, int, dict[str, str]]], amount_columns: list[str], columns: dict[str, str]
    ) -> str | None:
        """A note when dot-grouped-looking amounts read as decimals in a zero-decimal currency.

        Only the unresolved point reading is suspect: comma mode already read
        the dots as groups. A mapped currency column posts each row in its own
        commodity, so no one currency can indict the column.
        """
        if columns.get("currency") and not self._constant_currency:
            return None
        currency = self._constant_currency or self._currency
        if currency not in _ZERO_DECIMAL_CURRENCIES:
            return None
        examples = [
            (header, example)
            for header in amount_columns
            if not self._comma_for(header)
            and (example := _dot_ambiguous_example([row.get(header, "") for _, _, row in numbered])) is not None
        ]
        if not examples:
            return None
        return _dot_ambiguity_note(examples, currency)

    def _cell(self, row: dict[str, str], where: str, field: str) -> str:
        column = self._mapping.column(field)
        if column is None:
            return ""
        if column not in row:
            raise UsageError(f"{where}: the mapping names column {column!r} for {field}, which the CSV lacks.")
        return row[column].strip()

    def _check_columns(self, source: Path, headers: list[str], category_header: str | None) -> None:
        """Every column this run reads must exist exactly once, or a row could silently take the wrong cell."""
        counts = Counter(headers)
        wanted = dict(self._mapping.columns)
        # `currency=EUR` on a file with no `EUR` column is a constant, not a
        # typo: a foreign-currency export that names its commodity nowhere used
        # to be importable only by editing the bank's own file.
        constant = wanted.get("currency")
        if (
            constant is not None
            and counts[constant] == 0
            and is_commodity(constant)
            and _lookalike_header(constant, headers) is None
        ):
            # A constant relabels every row's money, so it must be a
            # commodity the ledger already knows, not any capitalized word.
            if self._known_currencies is not None and constant not in self._known_currencies:
                raise UsageError(
                    f"currency={constant} names no column of {source.name} and no commodity this ledger "
                    f"knows. Map the file's currency column, or declare it first: "
                    f"{self._bea} add commodity --date YYYY-MM-DD --currency {constant}."
                )
            self._constant_currency = constant
            del wanted["currency"]
        if category_header is not None:
            wanted.setdefault("category", category_header)
        for role, column in wanted.items():
            if counts[column] == 0:
                other = unsplit_header(headers, self._delimiter)
                if other is not None:
                    # A forced delimiter that does not split the header read as
                    # a missing `Date` column, plainly present (w5/622).
                    # In the spelling the delimiter was given in: `--delimiter`
                    # beside a `--csv …,delimiter=` refuses as conflicting (w5/845).
                    remedy = (
                        f"Change delimiter= in --csv to {_shown_delimiter(other)}, or remove it so bea detects it."
                        if self._delimiter_source == "--csv"
                        else f"Pass --delimiter {_shown_delimiter(other)}, or omit --delimiter so bea detects it."
                    )
                    raise UsageError(
                        f"{source.name}'s header was read as one column ({headers[0]!r}) with delimiter "
                        f"{_shown_delimiter(self._delimiter)}, but it looks {_SEPARATOR_NAMES[other]}-separated. "
                        + remedy
                    )
                found = _header_line_for(source, column, self._delimiter, self._encoding)
                if found is not None and found[1] != self._skip:
                    line, index = found
                    raise UsageError(
                        f"The mapping names column {column!r} for {role}, which {source.name}'s header lacks — "
                        f"but {source.name} has {column!r} on line {line}. "
                        f"Pass --csv skip={index} to start the header there."
                    )
                lookalike = _lookalike_header(column, headers)
                hint = f" Did you mean {lookalike!r}? Column names are case-sensitive." if lookalike else ""
                raise UsageError(f"The mapping names column {column!r} for {role}, which {source.name} lacks.{hint}")
            if counts[column] > 1:
                raise UsageError(
                    f"Column {column!r} appears {counts[column]} times in the header of {source.name}, so {role} "
                    "is ambiguous. Rename the duplicates so each mapped column is unique. Nothing was written."
                )

    def _comma_for(self, column: str) -> bool:
        return self._decimal_by_column.get(column, self._decimal_comma)

    def _parse_decimal(self, where: str, column: str, value: str) -> Decimal:
        return _parse_amount_cell(where, column, value, decimal_comma=self._comma_for(column))

    def _names_account(self, category: str) -> bool:
        """Whether a category cell names an account the way the loader reads one, under the ledger's roots.

        `is_valid` is stricter than the loader: `Expenses:Kค่า` or a CJK leaf
        opens and loads, and the row went to Uncategorized as "not an account
        name" while a rule naming it worked (w5/830). Cached: the loader is
        asked once per distinct cell.
        """
        known = self._account_names.get(category)
        if known is None:
            try:
                parse_account(category, self._account_roots)
            except UsageError:
                known = False
            else:
                known = True
            self._account_names[category] = known
        return known

    def _pair_number(self, row: dict[str, str], where: str) -> Decimal:
        """The signed amount of a row mapped as a debit/credit pair.

        A debit is money leaving the source account and a credit money arriving,
        whichever sign the bank printed on the cell: many exports print the
        outflow column negative already, and negating that a second time booked
        every outflow as income. So the direction comes from the column and only
        the magnitude from the cell.

        A cell that parses to zero is an empty cell for the "exactly one" rule —
        banks routinely zero-fill the unused side — and a row whose two cells are
        both zero is a zero amount, exactly as the single-amount path treats
        `0.00`.
        """
        columns = self._mapping.columns
        parsed: list[tuple[str, Decimal]] = []
        for side in ("debit", "credit"):
            text = self._cell(row, where, side)
            if text.strip():
                parsed.append((side, self._parse_decimal(where, columns[side], text)))
        nonzero = [(side, number) for side, number in parsed if number]
        if not parsed or len(nonzero) > 1:
            raise UsageError(f"{where}: fill exactly one of {columns['debit']!r} or {columns['credit']!r}.")
        if not nonzero:
            return parsed[0][1].copy_abs()
        side, number = nonzero[0]
        magnitude = number.copy_abs()
        return magnitude if side == "credit" else _negated(magnitude)

    def _check_cell_symbols(self, row: dict[str, str], where: str, currency: str, amount_columns: list[str]) -> None:
        """Refuse a row whose own currency symbol is not the currency it would post.

        The symbols are stripped to parse the number; reading them back is what
        keeps a `4,50 €` cell from being written as `-4.50 USD` under a USD
        ledger, with exit 0 and a green `bea check` over the wrong commodity.
        """
        cells = [(name, found) for name in amount_columns for found in _cell_symbol_currencies(row.get(name, ""))]
        for column, (symbol, currencies) in cells:
            if currency in currencies:
                continue
            if len(currencies) == 1:
                (named,) = currencies
                unknown = self._known_currencies is not None and named not in self._known_currencies
                declare = f" (after {self._bea} add commodity --date YYYY-MM-DD --currency {named})" if unknown else ""
                raise UsageError(
                    f"{where}: column {column!r} carries {symbol!r} ({named}), but the row would post "
                    f"{currency}. Name the commodity with --csv currency={named}{declare}, or open the "
                    f"source account for {named}. Nothing was written."
                )
            if len(currencies) == 2:
                listing = f"{currencies[0]} or {currencies[1]}"
            else:
                listing = f"{', '.join(currencies[:-1])}, or {currencies[-1]}"
            raise UsageError(
                f"{where}: column {column!r} carries {symbol!r} ({listing}), but the row would post "
                f"{currency}. Open the source account for one of {listing}, or map the file's currency "
                "column with --csv currency=Column. Nothing was written."
            )

    def _check_pair_signs(self, numbered: list[tuple[int, int, dict[str, str]]]) -> None:
        """Refuse a debit or credit column whose rows disagree about the sign.

        One sign throughout means the column's own sign carries no information
        and the magnitude rule in `_pair_number` is safe. A column holding both
        `-5` and `7` does not: one of the two spellings means the opposite
        direction, and no row can say which. Naming the column and the two rows
        lets the caller map it as `amount=` — where the sign *is* the direction —
        or split it, instead of having half the export booked backwards.
        """
        columns = self._mapping.columns
        for side in ("debit", "credit"):
            column = columns.get(side)
            if column is None:
                continue
            first: dict[bool, int] = {}
            for row_number, line, row in numbered:
                text = row.get(column, "")
                if not text.strip():
                    continue
                number = self._parse_decimal(_at(row_number, line), column, text)
                if number:
                    first.setdefault(number < 0, row_number)
                if len(first) == 2:
                    negative, positive = first[True], first[False]
                    raise UsageError(
                        f"Column {column!r} mixes signs: row {negative} is negative and row {positive} "
                        f"is positive, so no row says which direction the sign means. A {side} column posts "
                        f"by magnitude and must use one sign; map the column with amount= if its sign "
                        f"carries the direction."
                    )

    def _is_blank_row(self, row: dict[str, str], headers: set[str]) -> bool:
        """Whether every mapped cell in the row is empty or whitespace."""
        return all(not (row.get(header) or "").strip() for header in headers)

    def extract(self, filepath: str, existing: Any) -> list[Any]:
        from beancount.core.amount import Amount
        from beancount.core.data import Posting, Transaction, new_metadata

        columns = self._mapping.columns
        category_header = columns.get("category")
        rows: list[Any] = []
        source = Path(filepath)
        with open_records(source, delimiter=self._delimiter, encoding=self._encoding, skip=self._skip) as (
            headers,
            records,
        ):
            if category_header is None:
                category_header = next((h for h in headers if h.casefold() == "category"), None)
            self._check_columns(source, headers, category_header)
            materialized = list(records)
            amount_columns = [columns[field] for field in ("amount", "debit", "credit") if field in columns]
            blank_headers = {column for column in columns.values() if column != self._constant_currency}
            if category_header is not None:
                blank_headers.add(category_header)
            # Number the data rows once, up front, and hand both numbers down.
            # Diagnostics quote the ordinal — the same one the preview's `ROW`
            # column shows — while `line` is the physical file line, which
            # entry metadata genuinely needs. Deriving the two separately is
            # what let them drift: the errors reconstructed the file line and
            # labelled it `Row`, so the gap grew with every blank row skipped.
            # The line comes from the reader rather than the record's position,
            # because a quoted cell may contain newlines and then a record is
            # no longer a line.
            numbered: list[tuple[int, int, dict[str, str]]] = []
            status_header = columns.get("status")
            for line, row in materialized:
                if self._is_blank_row(row, blank_headers):
                    self.skipped_blank_rows += 1
                    continue
                if _is_header_repeat(row, headers):
                    # A bank's page break: it could never be a data row (its
                    # date cell does not parse), so it is skipped, not refused.
                    self.skipped_repeated_headers.append(line)
                    continue
                if status_header is not None and is_pending(row.get(status_header)):
                    # A pending charge often posts later at another amount (a
                    # tip, a hold), and both were booked (w5/614). It waits
                    # for the export it posts in; a declined one never comes.
                    status = row.get(status_header)
                    unposted = self.skipped_unposted if never_posts(status) else self.skipped_pending
                    unposted.append(_row_summary(row, columns))
                    continue
                numbered.append((len(numbered) + 1, line, row))
            if status_header is None:
                self.pending_column = _pending_column(
                    headers, [row for _, row in materialized if not _is_header_repeat(row, headers)], columns
                )
            # Blank cells never voted on the decimal convention anyway, so
            # skipping blank rows here changes only which number it names.
            if self._forced_decimal_comma is not None:
                self._decimal_comma = self._forced_decimal_comma
            else:
                self._decimal_by_column = {
                    header: _resolve_decimal_comma([(number, row.get(header, "")) for number, _line, row in numbered])
                    for header in dict.fromkeys(amount_columns)
                }
                self.ambiguous_dot_amounts = self._dot_ambiguity(numbered, amount_columns, columns)
            if "amount" not in columns:
                self._check_pair_signs(numbered)
            elif "direction" not in columns:
                _refuse_unmapped_direction(
                    headers, [row for _, _, row in numbered], columns, ledger_sign=self._mapping.sign == "ledger"
                )
            for row_number, line, row in numbered:
                where = _at(row_number, line)
                date_column = columns["date"]
                try:
                    day = datetime.strptime(self._cell(row, where, "date"), self._date_format).date()
                except ValueError:
                    # A pending charge often has no posted date: say so when an
                    # unmapped column marks this row pending (w5/831).
                    marked = self.pending_column[0] if self.pending_column is not None else None
                    hint = (
                        f" Column {marked!r} marks this row {row.get(marked, '').strip()!r}: add status={marked} "
                        "to the --csv mapping to leave rows that are not posted out."
                        if marked is not None and is_pending(row.get(marked))
                        else ""
                    )
                    raise UsageError(
                        f"{where}: cannot parse date {self._cell(row, where, 'date')!r} "
                        f"in column {date_column!r} with format {self._date_format!r}.{hint}"
                    ) from None
                if "amount" in columns:
                    amount_column = columns["amount"]
                    number = self._parse_decimal(where, amount_column, self._cell(row, where, "amount"))
                    if "direction" in columns:
                        direction_column = columns["direction"]
                        number = _directed_number(number, self._cell(row, where, "direction"), where, direction_column)
                else:
                    number = self._pair_number(row, where)
                if self._mapping.sign == "ledger":
                    number = _negated(number)
                currency = self._constant_currency or self._cell(row, where, "currency") or self._currency
                if not currency and self._known_currencies is not None and not self._known_currencies:
                    # `currency=CODE` is refused on a ledger that knows no
                    # commodity, so advising it first sent the next run into
                    # that refusal (w5/841).
                    # An account that is already open takes no second `open`
                    # (`add open` refuses it); declaring a commodity is what
                    # lets `currency=CODE` through (w5/874).
                    remedy = (
                        f"Declare one, then name it with --csv currency=CODE: {self._bea} add commodity "
                        "--date YYYY-MM-DD --currency CODE."
                        if self._source_open
                        else f"Open {self._account} for one currency first: {self._bea} add open "
                        f"--account {self._account} --currency CODE --date YYYY-MM-DD."
                    )
                    raise UsageError(f"{where}: no currency column, and the ledger knows no commodity yet. {remedy}")
                if not currency:
                    raise UsageError(
                        f"{where}: no currency column and the ledger has no single operating currency. "
                        "Name the commodity with --csv currency=CODE, or open the source account for one currency."
                    )
                try:
                    # The cell is printed bare into both postings, so anything
                    # but one commodity token — a line break above all — would
                    # write accounting syntax the bank row never meant.
                    require_commodity(currency)
                except ValueError as exc:
                    # Name where the value came from: the fallback has no
                    # column, and "column None" named nothing (w5/328).
                    origin = (
                        f"column {columns['currency']!r}"
                        if columns.get("currency") and not self._constant_currency
                        else f"--csv currency={currency}"
                        if self._constant_currency
                        else "the ledger's operating_currency"
                    )
                    raise UsageError(f"{where}, {origin}: {exc} Nothing was written.") from None
                self._check_cell_symbols(row, where, currency, amount_columns)
                # An unmapped or blank payee is absent, not empty: a bare `""`
                # payee would be printed into every entry the mapping writes.
                payee = self._cell(row, where, "payee") or None
                narration = self._cell(row, where, "narration")
                counter, flag, rule = self._categorize(row, where, payee, narration, category_header)
                meta = new_metadata(filepath, line)
                meta["_csv_rule"] = rule
                native_id = self._cell(row, where, "id")
                if native_id:
                    meta["bank_id"] = native_id
                postings = [
                    Posting(self._account, Amount(number, currency), None, None, None, None),
                    Posting(counter, Amount(_negated(number), currency), None, None, None, None),
                ]
                rows.append(Transaction(meta, day, flag, payee, narration, frozenset(), frozenset(), postings))
        return rows

    def _categorize(
        self,
        row: dict[str, str],
        where: str,
        payee: str | None,
        narration: str,
        category_header: str | None,
    ) -> tuple[str, str, str]:
        """Counter account, flag, and rule name: rules beat the category column.

        Rules match payee, narration, then the category label, so a label the
        preview suggests categorizing with --rules is actually matchable.
        """

        category_text = row.get(category_header, "").strip() if category_header is not None else ""
        # Bank exports mix Unicode normalization forms; rules compare NFC
        # text, as `list --search` does, so equal-looking text matches.
        # A quoted multi-line cell is previewed and written with its CR/LF runs
        # as one space, so rules see that text too: it is the only text a user
        # can read a pattern off.
        texts = [
            unicodedata.normalize("NFC", re.sub(r"[\r\n]+", " ", text))
            for text in (payee or "", narration, category_text)
        ]
        for rule in self._rules:
            if any(rule.expression.search(text) for text in texts):
                return rule.account, "*", rule.pattern
        if category_header is not None:
            if category_header not in row:
                raise UsageError(f"{where}: the CSV lacks category column {category_header!r}.")
            # NFC, as the ledger reads names: an NFD cell naming an open account
            # was "not an account name" and went to Uncategorized (w5/530).
            category = unicodedata.normalize("NFC", row[category_header].strip())
            if category == self._account:
                # Posted against itself the row cancels out, so it queues for
                # review like a label that is no account (w5/468).
                self.source_categories += 1
                return self._default_account, "!", "unmatched"
            if category and self._names_account(category):
                return category, "*", category
            if category:
                # A card export's own label ("Groceries", "Food & Drink") is
                # not an account, and written verbatim it is a syntax error on
                # every row. The row queues for review instead.
                self.rejected_categories[category] += 1
        return self._default_account, "!", "unmatched"
