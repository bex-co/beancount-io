"""No-code CSV import helpers that need no Beancount.

Header inference, date-format discovery, and remembered-mapping signatures stay
in the frontend. Entry extraction (`CsvImporter`) lives in
`bea_engine.csv_mapper` and runs only inside `bea-engine import`.
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
import unicodedata
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from cli.errors import UsageError
from cli.utils import regex_reads_otherwise

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
        "status",
        "sign",
        "delimiter",
        "encoding",
        "decimal",
        "direction",
        "skip",
    }
)


@dataclass(frozen=True)
class CsvMapping:
    """A parsed `--csv` mapping: CSV column names per ledger field."""

    columns: dict[str, str]
    sign: str = "bank"
    delimiter: str | None = None
    encoding: str | None = None
    decimal: str | None = None
    skip: int | None = None

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
    def compile(index: int, raw: Any) -> CsvRule:
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

    `delimiter=`, `encoding=`, `decimal=`, and `skip=` are parsing directives,
    not columns: the frontend strips them before forwarding the spec, and the
    engine's copy of this parser rejects them — that rejection is the safety
    net proving the strip happened.
    """
    columns: dict[str, str] = {}
    sign = "bank"
    signed = False
    delimiter: str | None = None
    encoding: str | None = None
    decimal: str | None = None
    skip: int | None = None
    for part in split_spec(spec):
        name, separator, column = part.partition("=")
        name = name.strip()
        # A tab is a delimiter's value, never padding to strip (w5/621).
        column = column.strip(" ") if name == "delimiter" else spec_value(column)
        if not separator or not name or not column:
            if name == "delimiter" and separator:
                raise UsageError(
                    "Bad --csv delimiter '': a bare comma separates fields, so write delimiter=comma "
                    "(or semicolon, tab, pipe — or ';', '|', a literal tab)."
                )
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
        elif name == "delimiter":
            if delimiter is not None:
                raise UsageError("Duplicate --csv field 'delimiter'.")
            delimiter = _parse_delimiter_value(column)
        elif name == "encoding":
            if encoding is not None:
                raise UsageError("Duplicate --csv field 'encoding'.")
            encoding = _parse_encoding_value(column)
        elif name == "decimal":
            if decimal is not None:
                raise UsageError("Duplicate --csv field 'decimal'.")
            decimal = _parse_decimal_value(column)
        elif name == "skip":
            if skip is not None:
                raise UsageError("Duplicate --csv field 'skip'.")
            skip = _parse_skip_value(column)
        elif name in columns:
            raise UsageError(f"Duplicate --csv field {name!r}.")
        else:
            # Normalized, like the header names `open_records` returns: a
            # mapping that names a zero-width header exactly as written must
            # match the stored spelling (w5/716).
            columns[name] = _normalize_header(column)
    if columns:
        # Keys without columns (`encoding=`/`delimiter=`/`decimal=`/`skip=`/`sign=` alone) parse:
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
        if "direction" in columns and has_pair:
            raise UsageError(
                "--csv direction=Column combines with amount=Column, not with debit=A,credit=B, "
                "which already decides each row's direction."
            )
        if "direction" in columns and sign == "ledger":
            raise UsageError("--csv direction=Column already decides each row's direction; drop sign=ledger.")
    return CsvMapping(columns=columns, sign=sign, delimiter=delimiter, encoding=encoding, decimal=decimal, skip=skip)


def validate_reading_keys(spec: str) -> None:
    """Refuse a bad `encoding=`, `delimiter=`, `decimal=`, or `skip=` in a `--csv` spec, whatever else it holds.

    They decide how the file is read, so a spec that is otherwise
    incomplete must still not let a typo through: on a non-UTF-8 export the
    dropped `encoding=sjis` became a generic decode refusal that told the user
    to force an encoding — what they had just tried (w5/332).
    """
    for part in split_spec(spec):
        name, separator, column = part.partition("=")
        if not separator or not column.strip(" "):
            continue
        if name.strip() == "encoding":
            _parse_encoding_value(column.strip())
        elif name.strip() == "delimiter":
            _parse_delimiter_value(column.strip(" "))
        elif name.strip() == "decimal":
            _parse_decimal_value(column.strip())
        elif name.strip() == "skip":
            _parse_skip_value(column.strip())


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
    value = column.strip(" ")
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


def _parse_decimal_value(column: str) -> str:
    """Normalize a `--csv decimal=` value to `comma` or `point`."""
    value = column.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
        value = value[1:-1]
    if value.strip().casefold() in {"comma", "point"}:
        return value.strip().casefold()
    raise UsageError(f"Bad --csv decimal {column!r}: use decimal=comma or decimal=point.")


def _parse_skip_value(column: str) -> int:
    """Normalize a `--csv skip=` value to a whole number of leading rows.

    Zero is a no-op the header hints can name back (a skip that overshoots
    is corrected with the header's own line), so only negatives refuse.
    """
    try:
        skip = int(spec_value(column))
    except ValueError:
        raise UsageError(f"Bad --csv skip {column!r}: use a whole number of leading rows.") from None
    if skip < 0:
        raise UsageError(f"Bad --csv skip {column!r}: use a whole number of leading rows.")
    return skip


def load_rules(path: Path) -> list[CsvRule]:
    """Load `--rules` TOML into ordered, compiled rules (exit 2 on misuse)."""
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
        return [CsvRule.compile(index, entry) for index, entry in enumerate(entries)]
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


def _spec_column(column: str) -> str:
    """A header as a `--csv` value: double-quoted when it holds a comma (w5/428) or a quote (doubled, w5/967)."""
    return '"' + column.replace('"', '""') + '"' if "," in column or '"' in column else column


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
    example = ",".join(
        f"{role}={_spec_column(example_columns[role])}" for role in _HEADER_SYNONYMS if role in example_columns
    )
    if "amount" in columns:
        columns.pop("debit", None)
        columns.pop("credit", None)
    elif "debit" not in columns or "credit" not in columns:
        return InferredMapping(spec=None, ambiguities=ambiguities, example=example)
    if "date" not in columns or ("payee" not in columns and "narration" not in columns):
        return InferredMapping(spec=None, ambiguities=ambiguities, example=example)
    order = [role for role in _HEADER_SYNONYMS if role in columns]
    return InferredMapping(
        spec=",".join(f"{role}={_spec_column(columns[role])}" for role in order),
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


def shown_header(cell: str) -> str:
    """A header cell for diagnostics: readable text kept, unprintables escaped (w5/716)."""
    return "".join(char if char.isprintable() else ascii(char)[1:-1] for char in cell)


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
    source: Path,
    column: str,
    *,
    delimiter: str | None = None,
    encoding: str = "utf-8",
    skip: int = 0,
    also: Sequence[str] = (),
) -> tuple[str | None, bool]:
    """The one date format that parses this column, and whether others also did.

    `also` adds formats the built-in list does not hold, such as a custom one
    remembered from an earlier import: it competes like any other, so a column
    it still reads is not called a mismatch for another format's fitting too
    (w5/911).
    """
    date_format, ambiguous, _rejection = inspect_date_column(
        source, column, delimiter=delimiter, encoding=encoding, skip=skip, also=also
    )
    return date_format, ambiguous


#: The engine's status words for a row that is not posted (`bea_engine.csv_mapper`),
#: here so date inference skips those rows as the import does (w5/831). A test
#: pins that the two sets agree.
UNPOSTED_STATUSES = frozenset(
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
        "declined",
        "reverted",
        "failed",
        "cancelled",
        "canceled",
        "void",
        "voided",
        "rejected",
    }
)


def is_unposted(value: str | None) -> bool:
    """Whether a status cell marks a row the import leaves out: pending, held, authorized or never posted."""
    text = (value or "").strip().casefold()
    return text.startswith("pending") or text in UNPOSTED_STATUSES


def inspect_date_column(
    source: Path,
    column: str,
    *,
    delimiter: str | None = None,
    encoding: str = "utf-8",
    mapped_columns: dict[str, str] | None = None,
    skip: int = 0,
    also: Sequence[str] = (),
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
    working = [*_DATE_FORMATS, *(item for item in dict.fromkeys(also) if item not in _DATE_FORMATS)]
    seen = False
    try:
        with open_records(source, delimiter=delimiter, encoding=encoding, skip=skip) as (headers, rows):
            if column not in headers:
                return None, False, None
            counted = set((mapped_columns or {"date": column}).values())
            if mapped_columns is not None and "category" not in mapped_columns:
                counted.update(header for header in headers if header.casefold() == "category")
            row_number = 0
            status = (mapped_columns or {}).get("status")
            for line, row in rows:
                if _is_header_repeat(row, headers):
                    continue
                if status is not None and is_unposted(row.get(status)):
                    # Left out by the import, numbered by none of its rows: a
                    # pending charge's `Pending` date cell refused the export (w5/831).
                    continue
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


def _shape_of(date_format: str) -> re.Pattern[str]:
    """A ``strptime`` format with its fields widened to any digits or word.

    `31/02/2026` parses under no format but is plainly a mistyped date, not
    a footer; the shape is what tells the two apart.
    """
    shape = re.escape(date_format)
    # A two-digit year is still a date to a human (`15.03.26`), even where
    # the format wants four digits.
    shape = shape.replace("%Y", r"\d{2,4}").replace("%y", r"\d{2}")
    shape = shape.replace("%m", r"\d{1,2}").replace("%d", r"\d{1,2}")
    shape = shape.replace("%b", r"[^\W\d_]+")
    return re.compile(f"(?:{shape})\\Z")


#: Every known date format widened to its shape, for the refusal's advice.
_DATE_SHAPES = tuple(_shape_of(candidate) for candidate in _DATE_FORMATS)


def matches_known_date(value: str) -> bool:
    """Whether any known date format parses this cell, or it has one's shape.

    A cell with no date shape at all is not a wrongly-formatted date but a
    non-data row — a footer — and `--date-format` advice would send the user
    in circles (w5/758).
    """
    cell = value.strip()
    return any(_parses(cell, candidate) for candidate in _DATE_FORMATS) or any(
        shape.match(cell) for shape in _DATE_SHAPES
    )


def find_header_record(source: Path, *, delimiter: str | None, encoding: str) -> tuple[int, int] | None:
    """First head record that reads as a full header, as (line, record index).

    Only the unread-header refusals call this: when a preamble pushed the
    header down, the index is the `--csv skip=` value that starts the header
    there. A record counts only when it infers a complete mapping, so a data
    row that happens to hold one synonym never qualifies. Anything unreadable
    misses, and the refusal stands without its hint.
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
                cells = [_normalize_header(cell) for cell in record]
                if any(cells):
                    inferred = infer_mapping(cells)
                    if inferred is not None and inferred.spec is not None:
                        return start, index
                start = reader.line_num + 1
    except (OSError, UnicodeDecodeError, csv.Error, UsageError):
        return None
    return None


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
