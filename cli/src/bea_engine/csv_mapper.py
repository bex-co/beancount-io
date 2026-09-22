"""No-code CSV import: a column mapping plus optional pattern rules as an importer.

Lives in the engine because extraction builds Beancount entries. The frontend
keeps a stdlib-only twin for header inference and remembered mappings; this
copy is what bea-engine import runs. Beangulp stays optional (ADR012).
"""

from __future__ import annotations

import csv
import hashlib
import re
import unicodedata
from collections import Counter
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine.amounts import require_decimal_notation
from bea_engine.protocol import UsageError

_MAPPING_FIELDS = frozenset(
    {"date", "amount", "payee", "narration", "id", "currency", "debit", "credit", "category", "sign"}
)

_THOUSAND_SEPARATOR_FILLER = re.compile(r"[\s'\u2019]")
_NON_FINITE_AMOUNT = re.compile(r"[+-]?(?:nan|inf(?:inity)?)\Z", re.IGNORECASE)
_EU_GROUPING = re.compile(r"\d{1,3}(?:\.\d{3})+")
_COMMA_DECIMAL_TAIL = re.compile(r",\d{2}$")
_ACCEPTED_AMOUNTS = (
    "Accepted: plain decimals (1000.50), $/€ symbols, thousands separators, "
    "(parentheses) or trailing-minus negatives; comma decimals like 1.000,00 "
    "only when the whole column uses them."
)


def _is_currency_symbol(text: str) -> bool:
    return len(text) == 1 and unicodedata.category(text) == "Sc"


def _split_amount_sign(value: str) -> tuple[str, str, bool]:
    """Split the sign, currency symbols, and parentheses off an amount cell.

    Returns the leading +/- sign (kept for Decimal), the bare core, and whether
    parentheses/trailing-minus negation applies.
    """
    text = value.strip()
    negate = False
    if len(text) >= 2 and text.startswith("(") and text.endswith(")"):
        negate = True
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
            negate = not negate
            text = text[:-1]
        else:
            break
    return sign, text.strip(), negate


def _separator_vote(core: str) -> str | None:
    """Vote on a cell's decimal convention: 'us', 'eu', 'eu-weak', or None."""
    if "." in core and "," in core:
        return "eu" if core.rfind(",") > core.rfind(".") else "us"
    if "," in core and _COMMA_DECIMAL_TAIL.search(core):
        return "eu-weak"
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
        _sign, core, _negate = _split_amount_sign(value)
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
    sign, core, negate = _split_amount_sign(value)
    if _NON_FINITE_AMOUNT.fullmatch(core):
        raise UsageError(f"{where}: amount {value!r} in column {column!r} is not a finite number.")
    text = _THOUSAND_SEPARATOR_FILLER.sub("", core)
    if decimal_comma:
        text = _comma_decimal_to_point(where, column, value, text)
    else:
        if "." not in text and _COMMA_DECIMAL_TAIL.search(text):
            raise _unparseable_amount(where, column, value)
        text = text.replace(",", "")
    try:
        number = Decimal(require_decimal_notation(sign + text))
    except ValueError as exc:
        raise UsageError(f"{where}, column {column!r}: {exc}") from None
    except InvalidOperation:
        raise _unparseable_amount(where, column, value) from None
    return -number if negate else number


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
        if not match.strip():
            raise UsageError(f"Rule {index + 1} has an empty match; write a regex, or .* for a catch-all.")
        try:
            expression = re.compile(match, re.IGNORECASE)
        except re.error as exc:
            raise UsageError(f"Rule {index + 1} has an invalid regex {match!r}: {exc}.") from exc
        # A rule naming an unopenable account used to surface as every matching
        # row being "not open" — a name no `open` directive can ever create.
        # Refuse it here, where the rule number says which line to fix.
        from bea_engine.ledger.text import parse_account

        try:
            account = parse_account(account)
        except UsageError as exc:
            raise UsageError(f"Rule {index + 1}: {exc}") from None
        return CsvRule(pattern=match, account=account, expression=expression)


def parse_mapping(spec: str) -> CsvMapping:
    """Parse `--csv field=Column,...` into a validated mapping (exit 2 on misuse).

    Unlike the frontend copy, this rejects `delimiter=` and `encoding=`: the
    frontend strips both before forwarding, and that rejection is the safety
    net proving the strip happened.
    """
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
    separator with a consistent multi-field column count across the sampled
    body rows, so a header tied on field count resolves by the body; the
    header itself stays out of the uniformity check (a merged header cell is
    not a vote), and when no candidate is consistent the most fields on the
    header line wins as before.
    """
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
    best = ","
    best_count = 0
    body = sample[1:]
    for delim in _CANDIDATE_DELIMITERS:
        counts = {_field_count(line, delim) for line in body}
        if len(counts) == 1:
            (count,) = counts
            if count is not None and count > 1 and count > best_count:
                best, best_count = delim, count
    if best_count > 1:
        return best
    for delim in _CANDIDATE_DELIMITERS:
        count = _field_count(sample[0], delim)
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
    delim = detect_delimiter(source, encoding=encoding) if delimiter is None else delimiter
    with open(source, encoding=_read_codec(encoding), newline="") as stream:
        reader = csv.reader(stream, delimiter=delim, strict=True)
        try:
            first = next(reader, None)
        except csv.Error as exc:
            raise _malformed(source, reader.line_num, exc) from None
        except UnicodeDecodeError as exc:
            raise _decode_usage_error(source, exc, encoding) from None
        headers = [cell.strip() for cell in first or []]

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
                raise _malformed(source, reader.line_num, exc) from None
            except UnicodeDecodeError as exc:
                raise _decode_usage_error(source, exc, encoding) from None

        yield headers, rows()


def infer_date_format(
    source: Path, column: str, limit: int = 200, *, delimiter: str | None = None, encoding: str = "utf-8"
) -> tuple[str | None, bool]:
    """The one date format that parses this column, and whether others also did.

    Day-first and month-first columns are indistinguishable until a row carries
    a day past the twelfth, so the caller is told when the choice was a guess
    instead of silently booking half a year into the wrong month.
    """
    values: list[str] = []
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding) as (headers, rows):
            if column not in headers:
                return None, False
            for _line, row in rows:
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
        delimiter: str | None = None,
        encoding: str = "utf-8",
    ) -> None:
        self._account = account
        self._mapping = mapping
        self._delimiter = delimiter
        self._encoding = encoding
        self._date_format = date_format
        self._rules = rules or []
        self._default_account = default_account
        self._currency = currency
        self._decimal_comma = False
        self.skipped_blank_rows = 0
        # Category values that were not account names, for the caller to report once.
        self.rejected_categories: Counter[str] = Counter()

    def identify(self, filepath: str) -> bool:
        return True

    def account(self, filepath: str) -> str:
        return self._account

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
        if category_header is not None:
            wanted.setdefault("category", category_header)
        for role, column in wanted.items():
            if counts[column] == 0:
                raise UsageError(f"The mapping names column {column!r} for {role}, which {source.name} lacks.")
            if counts[column] > 1:
                raise UsageError(
                    f"Column {column!r} appears {counts[column]} times in the header of {source.name}, so {role} "
                    "is ambiguous. Rename the duplicates so each mapped column is unique. Nothing was written."
                )

    def _parse_decimal(self, where: str, column: str, value: str) -> Decimal:
        return _parse_amount_cell(where, column, value, decimal_comma=self._decimal_comma)

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
        with open_records(source, delimiter=self._delimiter, encoding=self._encoding) as (headers, records):
            if category_header is None:
                category_header = next((h for h in headers if h.casefold() == "category"), None)
            self._check_columns(source, headers, category_header)
            materialized = list(records)
            amount_columns = [columns[field] for field in ("amount", "debit", "credit") if field in columns]
            blank_headers = set(columns.values())
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
            for line, row in materialized:
                if self._is_blank_row(row, blank_headers):
                    self.skipped_blank_rows += 1
                    continue
                numbered.append((len(numbered) + 1, line, row))
            # Blank cells never voted on the decimal convention anyway, so
            # skipping blank rows here changes only which number it names.
            self._decimal_comma = _resolve_decimal_comma(
                [(number, row.get(header, "")) for number, _line, row in numbered for header in amount_columns]
            )
            for row_number, line, row in numbered:
                where = _at(row_number, line)
                date_column = columns["date"]
                try:
                    day = datetime.strptime(self._cell(row, where, "date"), self._date_format).date()
                except ValueError:
                    raise UsageError(
                        f"{where}: cannot parse date {self._cell(row, where, 'date')!r} "
                        f"in column {date_column!r} with format {self._date_format!r}."
                    ) from None
                if "amount" in columns:
                    amount_column = columns["amount"]
                    number = self._parse_decimal(where, amount_column, self._cell(row, where, "amount"))
                else:
                    debit = self._cell(row, where, "debit")
                    credit = self._cell(row, where, "credit")
                    if bool(debit) == bool(credit):
                        raise UsageError(f"{where}: fill exactly one of {columns['debit']!r} or {columns['credit']!r}.")
                    side = "credit" if credit else "debit"
                    number = self._parse_decimal(where, columns[side], credit or debit)
                    number = number if credit else -number
                if self._mapping.sign == "ledger":
                    number = -number
                currency = self._cell(row, where, "currency") or self._currency
                if not currency:
                    raise UsageError(f"{where}: no currency column and the ledger has no single operating currency.")
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
                    Posting(counter, Amount(-number, currency), None, None, None, None),
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
        from beancount.core.account import is_valid

        category_text = row.get(category_header, "").strip() if category_header is not None else ""
        for rule in self._rules:
            if (
                rule.expression.search(payee or "")
                or rule.expression.search(narration)
                or rule.expression.search(category_text)
            ):
                return rule.account, "*", rule.pattern
        if category_header is not None:
            if category_header not in row:
                raise UsageError(f"{where}: the CSV lacks category column {category_header!r}.")
            category = row[category_header].strip()
            if category and is_valid(category):
                return category, "*", category
            if category:
                # A card export's own label ("Groceries", "Food & Drink") is
                # not an account, and written verbatim it is a syntax error on
                # every row. The row queues for review instead.
                self.rejected_categories[category] += 1
        return self._default_account, "!", "unmatched"
