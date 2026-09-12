"""No-code CSV import helpers that need no Beancount.

Header inference, date-format discovery, and remembered-mapping signatures stay
in the frontend. Entry extraction (`CsvImporter`) lives in
`bea_engine.csv_mapper` and runs only inside `bea-engine import`.
"""

from __future__ import annotations

import csv
import hashlib
import re
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from cli.errors import UsageError

_MAPPING_FIELDS = frozenset(
    {"date", "amount", "payee", "narration", "id", "currency", "debit", "credit", "category", "sign"}
)


@dataclass(frozen=True)
class CsvMapping:
    """A parsed `--csv` mapping: CSV column names per ledger field."""

    columns: dict[str, str]
    sign: str = "bank"

    def column(self, name: str) -> str | None:
        return self.columns.get(name)


@dataclass(frozen=True)
class CsvRule:
    """One categorization rule: the first matching pattern wins."""

    pattern: str
    account: str
    expression: re.Pattern[str] = field(compare=False)

    @staticmethod
    def compile(index: int, raw: Any) -> CsvRule:
        match = raw.get("match") if isinstance(raw, dict) else None
        account = raw.get("account") if isinstance(raw, dict) else None
        if not isinstance(match, str) or not isinstance(account, str):
            raise UsageError(f'Rule {index + 1} must be {{ match = "<regex>", account = "..." }}; got {raw!r}.')
        try:
            expression = re.compile(match, re.IGNORECASE)
        except re.error as exc:
            raise UsageError(f"Rule {index + 1} has an invalid regex {match!r}: {exc}.") from exc
        return CsvRule(pattern=match, account=account, expression=expression)


def parse_mapping(spec: str) -> CsvMapping:
    """Parse `--csv field=Column,...` into a validated mapping (exit 2 on misuse)."""
    columns: dict[str, str] = {}
    sign = "bank"
    for part in spec.split(","):
        name, separator, column = part.partition("=")
        name, column = name.strip(), column.strip()
        if not separator or not name or not column:
            raise UsageError(
                f"Bad --csv mapping {part!r}: use field=Column pairs like date=Date,amount=Amount,payee=Payee."
            )
        if name not in _MAPPING_FIELDS:
            raise UsageError(f"Unknown --csv field {name!r}; expected one of {sorted(_MAPPING_FIELDS)}.")
        if name == "sign":
            if column not in ("bank", "ledger"):
                raise UsageError(f"Bad --csv sign {column!r}: use sign=bank or sign=ledger.")
            sign = column
        elif name in columns:
            raise UsageError(f"Duplicate --csv field {name!r}.")
        else:
            columns[name] = column
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
    return CsvMapping(columns=columns, sign=sign)


def load_rules(path: Path) -> list[CsvRule]:
    """Load `--rules` TOML into ordered, compiled rules (exit 2 on misuse)."""
    import tomllib

    try:
        raw = tomllib.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise UsageError(f"Cannot read rules file {path}: {exc}.") from exc
    except ValueError as exc:
        raise UsageError(f"Cannot parse rules file {path} as TOML: {exc}.") from exc
    entries = raw.get("rule")
    if not isinstance(entries, list) or not entries:
        raise UsageError(f"Rules file {path} must hold a [[rule]] list with match and account each.")
    return [CsvRule.compile(index, entry) for index, entry in enumerate(entries)]


# Header names, lowercased, that identify a field beyond doubt. A role is only
# inferred when exactly one column claims it, so a bank that ships both
# "Description" and "Original Description" is reported as ambiguous rather than
# guessed at. "Description"-style columns map to narration, never to payee.
_HEADER_SYNONYMS: dict[str, tuple[str, ...]] = {
    "date": ("date", "transaction date", "posting date", "post date", "posted date", "date posted", "booking date"),
    "amount": ("amount", "transaction amount"),
    "debit": ("debit", "withdrawal", "withdrawals", "money out", "paid out"),
    "credit": ("credit", "deposit", "deposits", "money in", "paid in"),
    "payee": ("payee", "merchant", "merchant name", "name", "counterparty"),
    "narration": ("description", "memo", "details", "narration", "particulars", "transaction description"),
    "currency": ("currency", "currency code", "ccy"),
    "id": ("transaction id", "transaction_id", "reference number", "fitid"),
    "category": ("category",),
}

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

    spec: str
    ambiguities: list[str]


def infer_mapping(headers: list[str] | None) -> InferredMapping | None:
    """A `--csv` spec for a header row bea can read confidently, else None.

    Confidence means one column per role: a role two columns claim is dropped
    rather than guessed, and a file with no usable date or amount infers
    nothing at all so the caller falls back to asking.
    """
    if not headers:
        return None
    columns: dict[str, str] = {}
    ambiguities: list[str] = []
    for role, synonyms in _HEADER_SYNONYMS.items():
        matches = [header for header in headers if header.strip().casefold() in synonyms]
        if len(matches) == 1:
            columns[role] = matches[0]
        elif matches:
            ambiguities.append(f"{role} ({', '.join(sorted(matches))})")
    if "amount" in columns:
        columns.pop("debit", None)
        columns.pop("credit", None)
    elif "debit" not in columns or "credit" not in columns:
        return None
    if "date" not in columns or ("payee" not in columns and "narration" not in columns):
        return None
    order = [role for role in _HEADER_SYNONYMS if role in columns]
    return InferredMapping(
        spec=",".join(f"{role}={columns[role]}" for role in order),
        ambiguities=ambiguities,
    )


def _malformed(source: Path, line: int, exc: csv.Error) -> UsageError:
    return UsageError(
        f"Line {line}: {source.name} is not well-formed CSV ({exc}). "
        "An unclosed quote swallows every row after it; close the quote and retry. Nothing was written."
    )


@contextmanager
def open_records(source: Path) -> Iterator[tuple[list[str], Iterator[dict[str, str]]]]:
    """The stripped header row and one dict per data row, keyed by those names.

    This is the one reader every CSV path shares, so discovery, date inference,
    and extraction agree on what a column is called: names are stripped (and
    the BOM dropped) exactly as `IMPORTING.md` promises. Quoting is strict —
    a quote left open at end of file fails with its line instead of silently
    folding every later row into one field.
    """
    with open(source, encoding="utf-8-sig", newline="") as stream:
        reader = csv.reader(stream, strict=True)
        try:
            first = next(reader, None)
        except csv.Error as exc:
            raise _malformed(source, reader.line_num, exc) from None
        headers = [cell.strip() for cell in first or []]

        def rows() -> Iterator[dict[str, str]]:
            try:
                for record in reader:
                    yield {name: record[i] if i < len(record) else "" for i, name in enumerate(headers)}
            except csv.Error as exc:
                raise _malformed(source, reader.line_num, exc) from None

        yield headers, rows()


def infer_date_format(source: Path, column: str, limit: int = 200) -> tuple[str | None, bool]:
    """The one date format that parses this column, and whether others also did.

    Day-first and month-first columns are indistinguishable until a row carries
    a day past the twelfth, so the caller is told when the choice was a guess
    instead of silently booking half a year into the wrong month.
    """
    values: list[str] = []
    try:
        with open_records(source) as (headers, rows):
            if column not in headers:
                return None, False
            for row in rows:
                value = row[column].strip()
                if value:
                    values.append(value)
                if len(values) >= limit:
                    break
    except (OSError, UnicodeDecodeError, UsageError):
        return None, False
    if not values:
        return None, False
    working = []
    for candidate in _DATE_FORMATS:
        try:
            for value in values:
                datetime.strptime(value, candidate)
        except ValueError:
            continue
        working.append(candidate)
    if not working:
        return None, False
    return working[0], len(working) > 1


def header_signature(headers: list[str] | None) -> str | None:
    """Identify a CSV source by its header row without storing file contents."""
    if not headers:
        return None
    return hashlib.sha256("\0".join(headers).encode("utf-8")).hexdigest()


def read_header(source: Path) -> list[str] | None:
    """Read a CSV header row, or None when the file is not a readable CSV."""
    try:
        with open_records(source) as (headers, _rows):
            return headers or None
    except (OSError, UnicodeDecodeError, UsageError):
        return None
