"""No-code CSV import helpers that need no Beancount.

Header inference, date-format discovery, and remembered-mapping signatures stay
in the frontend. Entry extraction (`CsvImporter`) lives in
`bea_engine.csv_mapper` and runs only inside `bea-engine import`.
"""

from __future__ import annotations

import csv
import hashlib
import re
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from cli.errors import UsageError

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
        "category",
        "sign",
        "delimiter",
        "encoding",
    }
)


@dataclass(frozen=True)
class CsvMapping:
    """A parsed `--csv` mapping: CSV column names per ledger field."""

    columns: dict[str, str]
    sign: str = "bank"
    delimiter: str | None = None
    encoding: str | None = None

    def column(self, name: str) -> str | None:
        return self.columns.get(name)


# The spellings of "match every row" a rules file may use on purpose.
_EXPLICIT_CATCH_ALL = frozenset({".*", "^.*", ".*$", "^.*$"})


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
        if not match.strip():
            raise UsageError(f"Rule {index + 1} has an empty match; write a regex, or .* for a catch-all.")
        try:
            # NFC like the engine's copy, which matches NFC-normalized cells.
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
        return CsvRule(pattern=match, account=account, expression=expression)


def parse_mapping(spec: str) -> CsvMapping:
    """Parse `--csv field=Column,...` into a validated mapping (exit 2 on misuse).

    `delimiter=` is a parsing directive, not a column: the frontend strips it
    before forwarding the spec, and the engine's copy of this parser rejects
    it — that rejection is the safety net proving the strip happened.
    """
    columns: dict[str, str] = {}
    sign = "bank"
    delimiter: str | None = None
    encoding: str | None = None
    for part in spec.split(","):
        name, separator, column = part.partition("=")
        name, column = name.strip(), column.strip()
        if not separator or not name or not column:
            if name == "delimiter" and separator:
                raise UsageError(
                    "Bad --csv delimiter '': a bare comma separates fields, so write delimiter=comma "
                    "(or semicolon, tab, pipe — or ';', '|', a literal tab)."
                )
            raise UsageError(
                f"Bad --csv mapping {part!r}: use field=Column pairs like date=Date,amount=Amount,payee=Payee."
            )
        if name not in _MAPPING_FIELDS:
            raise UsageError(f"Unknown --csv field {name!r}; expected one of {sorted(_MAPPING_FIELDS)}.")
        if name == "sign":
            if column not in ("bank", "ledger"):
                raise UsageError(f"Bad --csv sign {column!r}: use sign=bank or sign=ledger.")
            sign = column
        elif name == "delimiter":
            if delimiter is not None:
                raise UsageError("Duplicate --csv field 'delimiter'.")
            delimiter = _parse_delimiter_value(column)
        elif name == "encoding":
            if encoding is not None:
                raise UsageError("Duplicate --csv field 'encoding'.")
            encoding = _parse_encoding_value(column)
        elif name in columns:
            raise UsageError(f"Duplicate --csv field {name!r}.")
        else:
            columns[name] = column
    if columns:
        # Keys without columns (`encoding=`/`delimiter=`/`sign=` alone) parse:
        # the caller infers the mapping instead of failing it.
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
    return CsvMapping(columns=columns, sign=sign, delimiter=delimiter, encoding=encoding)


def _parse_encoding_value(column: str) -> str:
    """Normalize a `--csv encoding=` value to a codec name."""
    value = column.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
        value = value[1:-1]
    if value:
        try:
            return parse_encoding(value)
        except UsageError:
            pass
    raise UsageError(f"Bad --csv encoding {column!r}: write utf-8, cp1252, or latin-1.")


def _parse_delimiter_value(column: str) -> str:
    """Normalize a `--csv delimiter=` value to one character.

    A bare comma cannot appear: it is the spec's own separator, so
    `delimiter=,` arrives here as an empty value and is pointed at the
    `comma` word.
    """
    value = column.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
        value = value[1:-1]
    if value:
        try:
            return parse_delimiter(value)
        except UsageError:
            pass
    raise UsageError(
        f"Bad --csv delimiter {column!r}: write comma, semicolon, tab, or pipe (or ';', '|', a literal tab)."
    )


def load_rules(path: Path) -> list[CsvRule]:
    """Load `--rules` TOML into ordered, compiled rules (exit 2 on misuse)."""
    import tomllib

    try:
        raw = tomllib.loads(path.read_text(encoding="utf-8-sig"))
    except OSError as exc:
        raise UsageError(f"Cannot read rules file {path}: {exc}.") from exc
    except ValueError as exc:
        raise UsageError(f"Cannot parse rules file {path} as TOML: {exc}.") from exc
    entries = raw.get("rule")
    if not isinstance(entries, list) or not entries:
        raise UsageError(f"Rules file {path} must hold a [[rule]] list with match and account each.")
    try:
        return [CsvRule.compile(index, entry) for index, entry in enumerate(entries)]
    except UsageError as exc:
        raise UsageError(f"Rules file {path}: {exc}") from exc


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


def _decode_usage_error(source: Path, exc: UnicodeDecodeError, encoding: str) -> UsageError:
    """Name a decode failure instead of pretending the CSV had no columns.

    Under the default UTF-8 the whole fallback chain is probed so the
    refusal can name the decoding that works; a latin-1-only file is still
    refused with the tried list, and an explicitly chosen codec reports
    itself.
    """
    if encoding != "utf-8":
        return UsageError(f"{source.name} is not valid {encoding} ({exc.reason} at byte {exc.start}).")
    try:
        winner = probe_decoding(source)
    except OSError:
        winner = "latin-1"
    if winner == "cp1252":
        return UsageError(
            f"{source.name} is not valid UTF-8 ({exc.reason} at byte {exc.start}); "
            "it decodes as cp1252 — pass --csv encoding=cp1252."
        )
    return UsageError(
        f"Cannot decode {source.name}: tried utf-8, cp1252, latin-1 ({exc.reason} at byte {exc.start}). "
        "Force one with --csv encoding=latin-1."
    )


_CANDIDATE_DELIMITERS = (",", ";", "\t", "|")

_SAMPLE_LINES = 5


def _field_count(line: str, delim: str) -> int | None:
    """The field count one candidate yields, or None when it cannot parse."""
    try:
        return len(next(csv.reader([line], delimiter=delim, strict=True), []))
    except csv.Error:
        return None


def detect_delimiter(source: Path, encoding: str = "utf-8") -> str:
    """Pick comma, semicolon, tab, or pipe from the first non-empty lines.

    Bank exports often use ``;`` (EU), tabs, or ``|`` (brokers). Prefer the
    separator on which the header and every sampled body row agree on one
    multi-field count, so a header tied on field count resolves by the body
    and a body tie resolves by the header: a comma file whose quoted cells
    hold semicolons, or a tab file whose dates hold commas, splits its header
    on the real separator only. A separator the body agrees on but the header
    does not (a merged header cell) comes next, provided the header splits on
    it at all; when nothing is consistent the most fields on the header line
    wins.
    """
    _refuse_utf16(source)
    try:
        with open(source, encoding=_read_codec(encoding), newline="") as stream:
            sample = []
            for line in stream:
                if line.strip():
                    sample.append(line.rstrip("\r\n"))
                    if len(sample) >= _SAMPLE_LINES:
                        break
    except UnicodeDecodeError as exc:
        raise _decode_usage_error(source, exc, encoding) from None
    if not sample:
        return ","
    header, body = sample[0], sample[1:]
    agreed: tuple[int, str] | None = None
    body_only: tuple[int, str] | None = None
    for delim in _CANDIDATE_DELIMITERS:
        counts = {_field_count(line, delim) for line in body}
        if len(counts) != 1:
            continue
        (count,) = counts
        header_count = _field_count(header, delim)
        if count is None or count < 2 or header_count is None or header_count < 2:
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
        count = _field_count(header, delim)
        if count is not None and count > best_count:
            best, best_count = delim, count
    return best


def parse_delimiter(value: str) -> str:
    """Normalize ``--delimiter`` to a single character (``,``, ``;``, tab, ``|``)."""
    raw = value.strip()
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


@contextmanager
def open_records(
    source: Path, *, delimiter: str | None = None, encoding: str = "utf-8"
) -> Iterator[tuple[list[str], Iterator[tuple[int, dict[str, str]]]]]:
    """The stripped header row, and each data row with the line it starts on.

    This is the one reader every CSV path shares, so discovery, date inference,
    and extraction agree on what a column is called: names are stripped (and
    the BOM dropped) exactly as `IMPORTING.md` promises. Quoting is strict —
    a quote left open at end of file fails with its line instead of silently
    folding every later row into one field. When ``delimiter`` is omitted the
    sampled rows choose among comma, semicolon, tab, and pipe.
    """
    _refuse_utf16(source)
    delim = detect_delimiter(source, encoding=encoding) if delimiter is None else delimiter
    with open(source, encoding=_read_codec(encoding), newline="") as stream:
        reader = csv.reader(stream, delimiter=delim, strict=True)
        # A malformed record is reported where it starts: `line_num` has by
        # then run to the end of the file when an unclosed quote swallowed it.
        header_start = 1
        try:
            first = next(reader, None)
            # Blank lines before the header (some bank exports start with
            # one) are not the header; `detect_delimiter` skips them too, and
            # `line_num` keeps counting them, so file lines stay right.
            while first is not None and not any(cell.strip() for cell in first):
                header_start = reader.line_num + 1
                first = next(reader, None)
        except csv.Error as exc:
            raise _malformed(source, header_start, exc) from None
        except UnicodeDecodeError as exc:
            raise _decode_usage_error(source, exc, encoding) from None
        headers = [cell.strip() for cell in first or []]

        def rows() -> Iterator[tuple[int, dict[str, str]]]:
            # As in the engine's reader: a record starts one line past wherever
            # the reader was before it, which stays right across multiline cells.
            start = reader.line_num + 1
            try:
                for record in reader:
                    yield start, {name: record[i] if i < len(record) else "" for i, name in enumerate(headers)}
                    start = reader.line_num + 1
            except csv.Error as exc:
                raise _malformed(source, start, exc) from None
            except UnicodeDecodeError as exc:
                raise _decode_usage_error(source, exc, encoding) from None

        yield headers, rows()


@dataclass(frozen=True)
class DateRejection:
    """The date cell that ruled out the last candidate format."""

    row: int
    line: int
    value: str
    first: bool


def infer_date_format(
    source: Path, column: str, *, delimiter: str | None = None, encoding: str = "utf-8"
) -> tuple[str | None, bool]:
    """The one date format that parses this column, and whether others also did."""
    date_format, ambiguous, _rejection = inspect_date_column(source, column, delimiter=delimiter, encoding=encoding)
    return date_format, ambiguous


def inspect_date_column(
    source: Path,
    column: str,
    *,
    delimiter: str | None = None,
    encoding: str = "utf-8",
    mapped_columns: dict[str, str] | None = None,
) -> tuple[str | None, bool, DateRejection | None]:
    """The one date format that parses this column, whether others also did,
    and — when none fits — the cell that ruled out the last candidate.

    Day-first and month-first columns are indistinguishable until a row carries
    a day past the twelfth, so the caller is told when the choice was a guess
    instead of silently booking half a year into the wrong month.

    The whole column is read: the deciding day can arrive at any row, and a
    sample that stopped at 200 chose month-first for an export whose 201st date
    was `13/04/2024`, then refused that valid date. Candidates are narrowed as
    the rows stream, so no value is kept.

    The rejection names its row the way the import preview does — data rows
    counted from 1, skipping rows whose mapped cells are all blank — so the
    error points at the record to fix. ``mapped_columns`` is the `--csv`
    mapping that decides which cells count; without it only the date cell does.
    """
    working = list(_DATE_FORMATS)
    seen = False
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding) as (headers, rows):
            if column not in headers:
                return None, False, None
            counted = set((mapped_columns or {"date": column}).values())
            if mapped_columns is not None and "category" not in mapped_columns:
                counted.update(header for header in headers if header.casefold() == "category")
            row_number = 0
            for line, row in rows:
                if any((row.get(header) or "").strip() for header in counted):
                    row_number += 1
                value = row[column].strip()
                if not value:
                    continue
                first = not seen
                seen = True
                working = [candidate for candidate in working if _parses(value, candidate)]
                if not working:
                    return None, False, DateRejection(row=row_number, line=line, value=value, first=first)
    except (OSError, UnicodeDecodeError, UsageError):
        return None, False, None
    if not seen:
        return None, False, None
    return working[0], len(working) > 1, None


def _parses(value: str, date_format: str) -> bool:
    try:
        datetime.strptime(value, date_format)
    except ValueError:
        return False
    return True


def header_signature(headers: list[str] | None) -> str | None:
    """Identify a CSV source by its header row without storing file contents."""
    if not headers:
        return None
    return hashlib.sha256("\0".join(headers).encode("utf-8")).hexdigest()


def read_header(source: Path, *, delimiter: str | None = None, encoding: str = "utf-8") -> list[str] | None:
    """Read a CSV header row, or None when the file is not a readable CSV.

    Decode failures raise ``UsageError`` so import does not claim the header
    had zero columns and suggest a ``--csv`` mapping that cannot help.
    """
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding) as (headers, _rows):
            return headers or None
    except UnicodeDecodeError as exc:
        raise _decode_usage_error(source, exc, encoding) from None
    except OSError:
        return None
