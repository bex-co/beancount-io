"""Preview and apply entries extracted by configured Beangulp importers.

Extraction, deduplication, validation, and writes run in `bea-engine import`.
This module owns option parsing, remembered importer/CSV paths, preview display,
and apply/duplicate decisions that the customer types on the command line.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import unicodedata
from collections.abc import Iterator
from contextlib import contextmanager
from enum import StrEnum
from itertools import groupby
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.config import config_dir
from cli.errors import BeaError, UsageError
from cli.paths import expand_path, held_descriptor, is_descriptor_path
from cli.utils import IntoPath, NonEmptyPath, atomic_write, exclusive_lock, inert_text


class Duplicates(StrEnum):
    review = "review"
    skip = "skip"
    include = "include"


def _is_record(record: Path) -> bool:
    """Whether a memory record exists; one that cannot be probed reads as no memory."""
    try:
        return record.is_file()
    except OSError:
        return False


def _stored_spelling(file: Path) -> Path:
    """The resolved path, each name spelled the way its directory stores it.

    `resolve()` keeps the caller's spelling on a case- and
    normalization-insensitive volume (macOS's default), so `Books/main.bean`
    and `books/main.bean` named one ledger with two memories (w5/205). A name
    its directory does not list exactly is replaced by the one listed name that
    folds to it and is the same file; on a case-sensitive volume the typed
    name is listed, so two ledgers there never share a memory. The write
    lock's directory inode is not used: a memory has to outlive a remount.
    """
    resolved = file.resolve()
    spelled = Path(resolved.anchor)
    for part in resolved.parts[1:]:
        try:
            names = os.listdir(spelled)
        except OSError:
            names = [part]
        if part not in names:
            folded = unicodedata.normalize("NFD", part).casefold()
            matches = [name for name in names if unicodedata.normalize("NFD", name).casefold() == folded]
            try:
                if len(matches) == 1 and os.path.samefile(spelled / matches[0], spelled / part):
                    part = matches[0]
            except OSError:
                pass
        spelled /= part
    return spelled


def _record(file: Path, prefix: str, *, reading: bool = False) -> Path:
    """Where this root ledger's memory is kept, however its path is spelled.

    A record saved before w5/205 is keyed by the spelling that was typed; a
    read falls back to it until the next successful import rewrites the
    memory under the stored spelling.
    """
    directory = config_dir() / "importers"
    typed = file.resolve()
    record = directory / f"{prefix}{hashlib.sha256(str(_stored_spelling(typed)).encode()).hexdigest()}.json"
    if reading and not _is_record(record):
        legacy = directory / f"{prefix}{hashlib.sha256(str(typed).encode()).hexdigest()}.json"
        if _is_record(legacy):
            return legacy
    return record


def _config_record(file: Path, *, reading: bool = False) -> Path:
    return _record(file, "", reading=reading)


def _memory_unreadable(file: Path) -> str | None:
    """The note for an import-memory directory this user cannot search (w5/215).

    Memory is a convenience: an import that cannot read it runs on its flags,
    the `importers.py` beside the ledger, or the header row, and remembers
    nothing, instead of stopping on the directory's permissions.
    """
    record = _csv_record(file)
    try:
        record.is_file()
        _config_record(file).is_file()
    except OSError as exc:
        return (
            f"Cannot read remembered import settings in {record.parent} ({exc.strerror or exc}); "
            "continuing without them, and this run is not remembered. "
            "Make that directory readable and writable to restore them."
        )
    return None


def _config_available(file: Path, notes: list[str]) -> tuple[Path, str] | None:
    """The Python importer this ledger already selects, if it selects one.

    A remembered path whose file was moved or deleted selects nothing: it is
    named in `notes` and the `importers.py` and header-row fallbacks apply, as
    they do for a ledger with no saved path (w5/141).
    """
    record = _config_record(file, reading=True)
    if _is_record(record):
        try:
            # Bytes: invalid UTF-8 is a corrupt record, which `read_text`
            # raised as a pathless codec error that blocked the import (w5/820).
            text = record.read_bytes()
        except OSError as exc:
            # Unreadable is not corrupt: it may still name the importer this
            # ledger relies on, so it is not guessed past (w5/215). But it is
            # named, with remedies that work for a CSV too (w5/592).
            raise UsageError(
                f"Cannot read the remembered importer record {record} ({exc.strerror or type(exc).__name__}). "
                "Make it readable, or delete it to forget the importer; or choose for this run with "
                "--config FILE (a Python importer) or --csv auto (the header row)."
            ) from exc
        try:
            remembered: Path | None = Path(json.loads(text.decode("utf-8"))["config"])
        except (ValueError, KeyError, TypeError, RecursionError):
            # Corrupt memory selects nothing, as a moved importer does: stale
            # local state must not block an import (w1/105, w5/592).
            remembered = None
            corrupt = (
                f"The remembered importer record {record} is not valid; ignoring it. "
                "Pass --config FILE to select a Python importer again."
            )
            if corrupt not in notes:
                notes.append(corrupt)
        if remembered is not None and is_descriptor_path(remembered):
            # Records written before descriptors stopped being remembered
            # still hold them; never opened (w5/792).
            stale = (
                f"The remembered importer {remembered} names a file descriptor, not a file; ignoring it. "
                "Pass --config FILE to select a Python importer again."
            )
            if stale not in notes:
                notes.append(stale)
        elif remembered is not None and remembered.is_file():
            return remembered, "remembered"
        elif remembered is not None:
            missing = (
                f"The remembered importer {remembered} is missing; ignoring it. "
                "Pass --config FILE to select a Python importer again."
            )
            if missing not in notes:
                notes.append(missing)
    conventional = file.parent / "importers.py"
    if conventional.is_file():
        return conventional, "default beside root ledger"
    return None


def _config_path(
    file: Path,
    supplied: Path | None,
    notes: list[str],
    *,
    source: Path,
    account: str | None,
    delimiter: str | None = None,
    encoding: str = "utf-8",
    skip: int = 0,
) -> tuple[Path, str]:
    if supplied is not None:
        return expand_path(supplied, "--config").resolve(), "--config"
    available = _config_available(file, notes)
    if available is not None:
        return available
    raise UsageError(
        "Choose a Python importer with --config FILE, or place importers.py beside the root ledger. "
        "The selected path is remembered for this ledger. "
        + _unread_header_hint(source, account, delimiter=delimiter, encoding=encoding, skip=skip),
        details=notes,
    )


def _unread_header_hint(
    source: Path, account: str | None, *, delimiter: str | None, encoding: str, skip: int = 0
) -> str:
    """The `--csv` command for an export bea found no columns in, from what was typed and read.

    A fixed `--account Assets:Checking` and `Date,Amount,Description` sent a
    pasted command's savings rows into checking, on columns no file had
    (w5/470). The typed account is kept, and the header bea read is listed.
    """
    from cli.csv_mapper import detect_delimiter, find_header_record, read_header, shown_header

    try:
        headers = read_header(source, delimiter=delimiter, encoding=encoding, skip=skip)
        used = delimiter if delimiter is not None else detect_delimiter(source, encoding=encoding, skip=skip)
    except UsageError:
        headers, used = None, ","
    # One cell is not a column list: a QIF or OFX file's first line, or a
    # header the delimiter did not split, read as "its columns" (w5/627).
    single = headers[0].lstrip("\ufeff") if headers and len(headers) == 1 else None
    if single is not None and _NOT_CSV.match(single):
        if single.startswith("!"):
            kind = "a QIF"
        elif _looks_like_ofx(source):
            return (
                f"{source.name} looks like an OFX file, not a CSV export, so it has no columns to map: "
                "import it without --csv."
            )
        else:
            # XML, but without OFX markers anywhere in the head: Camt.053
            # and friends are not OFX content, so the OFX remedy would loop.
            kind = "an XML"
        return (
            f"{source.name} looks like {kind} file, not a CSV export, so it has no columns to map: "
            "use a Python importer that reads it."
        )
    unsplit = _unsplit_header(headers, used)
    if unsplit is not None:
        return (
            f"{source.name}'s header was read as one column ({unsplit[0]!r}) with delimiter "
            f"{_display_delimiter(used)}, but it looks {_SEPARATOR_NAMES[unsplit[1]]}-separated: pass --delimiter "
            f"{_display_delimiter(unsplit[1])}, or omit --delimiter so bea detects it."
        )
    found = find_header_record(source, delimiter=used, encoding=encoding)
    if found is not None and found[1] != skip:
        line, index = found
        return f"Line {line} of {source.name} looks like the header row. Pass --csv skip={index} to start there."
    # Headers print escaped: anything normalization left unprintable must
    # still be visible enough to type back or report (w5/716).
    shown = ", ".join(shown_header(header) for header in headers) if headers else ""
    columns = f" Its columns are: {shown}." if headers and len(headers) > 1 else ""
    return (
        f"For a CSV export whose header row bea could not read, map the columns directly.{columns} "
        "Name them with --csv date=COLUMN,amount=COLUMN,narration=COLUMN "
        f"--account {shlex.quote(account) if account else 'ACCOUNT'}."
    )


def _not_csv_kind(first: str) -> str | None:
    """`a QIF` or `an OFX` when an export's first line says it is not CSV at all."""
    first = first.lstrip("\ufeff").strip()
    if not _NOT_CSV.match(first):
        return None
    return "a QIF" if first.startswith("!") else "an OFX"


def _refuse_not_csv(source: Path) -> None:
    """Refuse a QIF or OFX file under `--csv`, as the no-mapping path already does."""
    try:
        with source.open("rb") as stream:
            first = next((line for line in stream if line.strip()), b"")
    except OSError:
        return
    kind = _not_csv_kind(first.decode("utf-8", errors="replace"))
    if kind == "an OFX" and _looks_like_ofx(source):
        raise UsageError(
            f"{source.name} looks like an OFX file, not a CSV export, so it has no columns to map: "
            "import it without --csv."
        )
    if kind is not None:
        if kind == "an OFX":
            # XML, but without OFX markers anywhere in the head: Camt.053
            # and friends are not OFX content, so the OFX remedy would loop.
            kind = "an XML"
        raise UsageError(
            f"{source.name} looks like {kind} file, not a CSV export, so it has no columns to map: "
            "use a Python importer that reads it."
        )


#: The first line of an export that is not CSV at all: QIF's `!Type:`, OFX 1's
#: SGML header, OFX 2's XML declaration.
_NOT_CSV = re.compile(r"!(?:Type|Account|Option)\b|OFXHEADER:|<\?xml|<OFX>", re.IGNORECASE)

#: OFX by extension, and OFX by content: the SGML header block or the root
#: tag. A bare XML declaration is not enough — Camt.053 is XML too.
_OFX_SUFFIXES = (".ofx", ".qfx")
_OFX_MARKERS = re.compile(rb"OFXHEADER:|<OFX[\s>]", re.IGNORECASE)

#: Account ids as the engine's multi-account scan reads them: upstream
#: `find_acctids` over the raw text, case-sensitive, whitespace stripped by
#: the caller. The memory key matches the engine's view on purpose.
_ACCTID = re.compile(rb"<ACCTID>([^<]*)")


def _looks_like_ofx(source: Path) -> bool:
    """Whether the export is OFX by its suffix or by its opening bytes."""
    if source.suffix.lower() in _OFX_SUFFIXES:
        return True
    try:
        with source.open("rb") as stream:
            head = stream.read(4096)
    except OSError:
        return False
    return _OFX_MARKERS.search(head) is not None


def _ofx_acctids(source: Path) -> list[str]:
    """The file's distinct account ids, in order, for the memory key."""
    try:
        raw = source.read_bytes()
    except OSError:
        return []
    return list(
        dict.fromkeys(match.group(1).decode("ascii", errors="replace").strip() for match in _ACCTID.finditer(raw))
    )


_SEPARATOR_NAMES = {",": "comma", ";": "semicolon", "\t": "tab", "|": "pipe"}


def _unsplit_header(headers: list[str] | None, used: str) -> tuple[str, str] | None:
    """A one-cell header and the separator splitting it into the most cells, when the one in force did not (w5/622).

    The first separator present was named, so `Date;Payee, Name;Amount` was
    called comma-separated and the advice failed when followed (w5/845).
    """
    import csv

    single = headers[0] if headers and len(headers) == 1 else None
    if single is None:
        return None
    best, cells = None, 1
    for sep in _SEPARATOR_NAMES:
        if sep == used:
            continue
        try:
            count = len(next(csv.reader([single], delimiter=sep, strict=True), []))
        except csv.Error:
            continue
        if count > cells:
            best, cells = sep, count
    return (single, best) if best is not None else None


def _display_delimiter(delim: str) -> str:
    """The `--csv delimiter=` spelling for an effective delimiter."""
    return {"\t": "tab"}.get(delim, f"'{delim}'")


def _check_delimiter_conflict(flag: str | None, key: str | None) -> None:
    """`--delimiter` and `--csv delimiter=` must agree when both are set."""
    if flag is not None and key is not None and flag != key:
        raise UsageError(
            f"--delimiter {_display_delimiter(flag)} disagrees with "
            f"--csv delimiter={_display_delimiter(key)}; pass only one."
        )


def _strip_spec_keys(spec: str, keys: set[str]) -> str:
    """A `--csv` spec without its `key=` control parts (delimiter/encoding/decimal/skip/sign)."""
    from cli.csv_mapper import split_spec

    return ",".join(part for part in split_spec(spec) if part.partition("=")[0].strip() not in keys)


def _shell_spec(spec: str) -> str:
    """A `--csv` spec as it is typed in a shell, so the echoed line pastes back.

    Bank headers such as "Posting Date" carry spaces. An echoed `delimiter=';'`
    is already quoted by `_display_delimiter` and is joined on as written.
    """
    from cli.csv_mapper import split_spec

    runs = groupby(split_spec(spec), key=lambda part: part.partition("=")[0].strip() == "delimiter")
    return ",".join(",".join(parts) if quoted else shlex.quote(",".join(parts)) for quoted, parts in runs)


def _identical_ambiguity(ambiguity: str) -> str | None:
    """The header name, when every claimant for a role spells it the same.

    Ambiguities print as `role (First, Second)`; identical spellings mean a
    duplicated header, where the usual example would name the duplicate back.
    """
    inside = ambiguity.split("(", 1)[1].rsplit(")", 1)[0].split(", ")
    return inside[0] if len(set(inside)) == 1 else None


def _inferred_mapping(
    source: Path,
    *,
    explicit: bool,
    notes: list[str],
    delimiter: str | None = None,
    encoding: str = "utf-8",
    account: str | None = None,
    skip: int = 0,
) -> str | None:
    """A `--csv` spec read off the export's header row.

    `--csv auto` fails for any unreadable header. The automatic attempt falls
    back to Python importers only when no columns were recognized at all.
    """
    from cli.csv_mapper import detect_delimiter, find_header_record, infer_mapping, read_header, shown_header

    headers = read_header(source, delimiter=delimiter, encoding=encoding, skip=skip)
    inferred = infer_mapping(headers)
    if inferred is not None and inferred.ambiguities:
        identical = {
            name for ambiguity in inferred.ambiguities if (name := _identical_ambiguity(ambiguity)) is not None
        }
        if identical:
            # An example would name the duplicate back: only renaming unblocks it.
            quoted = ", ".join(f"'{name}'" for name in sorted(identical))
            notes.append(
                f"Several columns could be {', '.join(inferred.ambiguities)}; none was chosen. "
                f"Columns {quoted} appear more than once in the header; rename the duplicates so each "
                "mapped column is unique."
            )
        else:
            # No trailing period: the example pastes back verbatim.
            notes.append(
                f"Several columns could be {', '.join(inferred.ambiguities)}; none was chosen. "
                f"For example: --csv {shlex.quote(inferred.example)}"
            )
    if inferred is None or inferred.spec is None:
        if inferred is None and not explicit:
            return None
        # Escaped like the unread-header hint: a control character in a
        # header must print visibly (w5/716).
        columns = ", ".join(shown_header(header) for header in headers) if headers else "(none)"
        used = delimiter if delimiter is not None else detect_delimiter(source, encoding=encoding, skip=skip)
        found = find_header_record(source, delimiter=used, encoding=encoding)
        if found is not None and found[1] != skip:
            line, index = found
            raise UsageError(
                f"Cannot read a column mapping from line {skip + 1} of {source.name}: line {line} looks like "
                f"the header row. Pass --csv skip={index} to start there.",
                details=notes,
            )
        unsplit = _unsplit_header(headers, used)
        if unsplit is not None:
            # Every separator, a comma under a forced `;` too: the mapping
            # suggested instead failed the same way when followed (w5/622).
            single, other = unsplit
            raise UsageError(
                f"Cannot read a column mapping from the header row of {source.name}. "
                f"The file looks {_SEPARATOR_NAMES[other]}-separated but was read as one column ({single!r}) "
                f"with delimiter {_display_delimiter(used)}. "
                f"Pass --delimiter {_display_delimiter(other)} — or omit the override so bea can detect it.",
                details=notes,
            )
        clause = f" (delimiter {_display_delimiter(used)})" if used != "," else ""
        # The columns this file has, never ones it lacks, and the account
        # that was typed: the fixed `Date,Amount,Description` failed when
        # pasted (w5/612), as w5/470 found for the no-importer refusal.
        raise UsageError(
            f"Cannot read a column mapping from the header row of {source.name}. "
            f"Its columns are: {columns}{clause}. "
            "Name them with --csv date=COLUMN,amount=COLUMN,narration=COLUMN "
            f"--account {shlex.quote(account) if account else 'ACCOUNT'}.",
            details=notes,
        )
    return inferred.spec


def _remember_config(file: Path, config: Path, notes: list[str]) -> None:
    """Persist the importer path; a failed save is named in `notes` as well as on stderr."""
    record = _config_record(file)
    try:
        record.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(record, json.dumps({"config": str(config)}))
    except OSError as exc:
        notes.append(f"Could not remember the importer path: {exc}. Pass --config on the next import.")
        output.note(notes[-1])


def _csv_record(file: Path, *, reading: bool = False) -> Path:
    return _record(file, "csv-", reading=reading)


def _record_entries(record: Path, key: str) -> list[Any]:
    """The stored list under `key`, or [] when the record is corrupt.

    A corrupt record — unreadable, not JSON, or the key not holding a list —
    reads as no memory, so stale local state never blocks an import. The
    next successful run rewrites the record from the surviving entries.
    """
    try:
        data = json.loads(record.read_text())
    except (OSError, ValueError, RecursionError):
        return []
    entries = data.get(key) if isinstance(data, dict) else None
    return entries if isinstance(entries, list) else []


def _stored_sources(record: Path) -> list[dict[str, Any]]:
    """The well-formed entries of a remembered-CSV record.

    An entry that is not an object, or whose headers are not a list of
    strings, reads as no memory for that part.
    """
    return [
        entry
        for entry in _record_entries(record, "sources")
        if isinstance(entry, dict)
        and isinstance(entry.get("headers"), list)
        and all(isinstance(header, str) for header in entry["headers"])
    ]


def _ofx_record(file: Path, *, reading: bool = False) -> Path:
    return _record(file, "ofx-", reading=reading)


def _stored_ofx_accounts(record: Path) -> list[dict[str, Any]]:
    """The well-formed entries of a remembered-OFX record.

    An entry that is not an object, or whose account id or account is not
    a string, reads as no memory for that part.
    """
    return [
        entry
        for entry in _record_entries(record, "accounts")
        if isinstance(entry, dict) and isinstance(entry.get("acctid"), str) and isinstance(entry.get("account"), str)
    ]


def _source_sha256(source: Path) -> str | None:
    try:
        return hashlib.sha256(source.read_bytes()).hexdigest()
    except OSError:
        return None


#: How many ledger-signed files one header remembers; the oldest fall off.
_SIGN_LEDGER_FILES = 64


def _sign_ledger_files(record: dict[str, Any] | None) -> dict[str, str]:
    """The files of a header chosen as `sign=ledger`: content hash → file name, oldest first.

    One hash per header was kept, so previewing next month's export with the
    same header evicted the first file's sign, and that file's flag-free
    `--apply` wrote every amount flipped, with no note (w5/594). A record
    from before then holds its one hash under `sign_ledger_sha256`.
    """
    if record is None:
        return {}
    stored = record.get("sign_ledger_files")
    files = (
        {digest: name for digest, name in stored.items() if isinstance(digest, str) and isinstance(name, str)}
        if isinstance(stored, dict)
        else {}
    )
    legacy = record.get("sign_ledger_sha256")
    if isinstance(legacy, str) and legacy not in files:
        source = record.get("source")
        files = {legacy: source if isinstance(source, str) else "the remembered file", **files}
    return files


def _signed(files: dict[str, str], source: Path, *, ledger: bool) -> dict[str, Any]:
    """The sign fields of a record after a run that chose `source`'s sign: only this file's entry changes."""
    digest = _source_sha256(source)
    kept = {key: name for key, name in files.items() if key != digest}
    if ledger and digest is not None:
        kept[digest] = source.name
    return {"sign_ledger_files": dict(list(kept.items())[-_SIGN_LEDGER_FILES:]), "sign_ledger_sha256": None}


def _same_account(stored: Any, account: str) -> bool:
    """Whether a remembered account is the one named now, in either Unicode form."""
    return isinstance(stored, str) and unicodedata.normalize("NFC", stored) == unicodedata.normalize("NFC", account)


def _find_csv_entry(file: Path, headers: list[str] | None, account: str) -> dict[str, Any] | None:
    """The remembered entry for a header row and account, without side effects."""
    from cli.csv_mapper import header_signature

    if not headers:
        return None
    record = _csv_record(file, reading=True)
    if not _is_record(record):
        return None
    wanted = header_signature(headers)
    for entry in _stored_sources(record):
        if (
            header_signature(entry.get("headers")) == wanted
            and _same_account(entry.get("account"), account)
            and isinstance(entry.get("mapping"), str)
        ):
            return entry
    return None


def _find_ofx_entry(file: Path, acctid: str) -> dict[str, Any] | None:
    """The remembered entry for an OFX account id, without side effects."""
    record = _ofx_record(file, reading=True)
    if not _is_record(record):
        return None
    for entry in _stored_ofx_accounts(record):
        if entry.get("acctid") == acctid:
            return entry
    return None


def _entry_skip(entry: dict[str, Any]) -> int | None:
    """The `skip=` a remembered mapping carries, if it parses."""
    from cli.csv_mapper import parse_mapping

    mapping = entry.get("mapping")
    if not isinstance(mapping, str):
        return None
    try:
        return parse_mapping(mapping).skip
    except UsageError:
        return None


def _usable_rules(entry: dict[str, Any], notes: list[str]) -> None:
    """Drop a remembered `--rules` path that cannot be used, announcing it."""
    from cli.csv_mapper import load_rules

    rules_path = entry.get("rules")
    if not isinstance(rules_path, str):
        return
    if is_descriptor_path(rules_path):
        # Records written before descriptors stopped being remembered
        # still hold `/dev/fd/0`: dropped without opening it, which
        # would read stdin or wait on a terminal (w5/792).
        notes.append(
            f"Remembered --rules {shlex.quote(rules_path)} names a file descriptor, not a file; "
            "importing without rules. Re-pass --rules to restore it."
        )
        entry["rules"] = None
        return
    try:
        remembered = Path(rules_path)
        # Opening a pipe nobody feeds waits forever, so it is judged
        # before `load_rules` reads it (w5/893).
        if remembered.exists() and not remembered.is_file() and not remembered.is_dir():
            raise UsageError(output.not_a_file(remembered))
        load_rules(remembered)
    except UsageError as exc:
        notes.append(
            f"Remembered --rules {shlex.quote(rules_path)} cannot be used ({exc}); importing without rules. "
            "Re-pass --rules to restore it."
        )
        entry["rules"] = None


def _recall_csv(
    file: Path, source: Path, account: str | None = None, *, notes: list[str], skip: int | None = None
) -> dict[str, Any] | None:
    """A remembered `--csv` run for this root ledger and CSV header row, if any.

    Returns the stored spec only when its mapping and account are usable
    strings; a corrupt record reads as no memory rather than a crash.
    Stale assumptions are repaired loudly: a remembered `sign=ledger` is
    dropped (sign is never re-applied across files) and an unreadable
    remembered `--rules` path degrades to an unruled import, each announced
    in `notes`. The caller persists the repaired entry only after success.
    """
    from cli.csv_mapper import header_signature, parse_mapping, read_header

    record = _csv_record(file, reading=True)
    if not _is_record(record):
        return None
    sources = _stored_sources(record)

    def headers_with(skip_value: int) -> list[str] | None:
        try:
            return read_header(source, skip=skip_value)
        except UsageError:
            # A non-UTF-8 export can still match a remembered mapping: fingerprint
            # with the decoding that works, then replay the mapping's own key.
            from cli.csv_mapper import probe_decoding

            try:
                return read_header(source, encoding=probe_decoding(source), skip=skip_value)
            except (UsageError, OSError):
                return None

    matches = []
    by_skip: dict[int, list[str] | None] = {}

    def headers_at(skip_value: int) -> list[str] | None:
        if skip_value not in by_skip:
            by_skip[skip_value] = headers_with(skip_value)
        return by_skip[skip_value]

    for entry in sources:
        # Each entry is matched against the file read with its own skip: a
        # plain read would match a skip=N entry against a file whose headers
        # sit at line 1, then replay a skip that misreads it (w5/758). A typed
        # skip declares this file's header line, so it matches every entry.
        entry_skip = skip if skip is not None else (_entry_skip(entry) or 0)
        headers = headers_at(entry_skip)
        if (
            headers
            and header_signature(headers) == header_signature(entry.get("headers"))
            and isinstance(entry.get("mapping"), str)
            and isinstance(entry.get("account"), str)
        ):
            if account is None or _same_account(entry["account"], account):
                matches.append(entry)
    if len(matches) > 1:
        accounts = ", ".join(sorted({entry["account"] for entry in matches}))
        raise UsageError(
            f"This CSV header matches multiple source accounts: {accounts}. "
            "Pass --account ACCOUNT to select the export's account; nothing was written.",
            # A mistaken account remembered once would otherwise refuse every
            # flag-free import of this header for good (w5/452).
            details=[
                f"If one of them was a mistake, delete {record} to forget the settings remembered for this "
                "ledger, then import again with --csv and the right --account."
            ],
        )
    if not matches:
        return None
    entry = matches[0]
    mapping = entry.get("mapping")
    if isinstance(mapping, str):
        try:
            sign = parse_mapping(mapping).sign
        except UsageError:
            sign = "bank"
        if sign == "ledger":
            stripped = _strip_spec_keys(mapping, {"sign"})
            entry["mapping"] = stripped
            notes.append(
                f"Dropped remembered sign=ledger for {source.name}; sign is never re-applied across files. "
                "Pass sign=ledger explicitly for a ledger-signed export."
            )
    _usable_rules(entry, notes)
    return entry


def _recall_ofx(file: Path, source: Path, account: str | None = None, *, notes: list[str]) -> dict[str, Any] | None:
    """A remembered `--ofx` run for this root ledger and OFX account id, if any.

    Returns the stored entry only when the file names exactly one account id
    and the memory holds it — and, when `--account` was typed, only when it
    names the same account. A typed account that differs recalls nothing: it
    wins for this run and the memory is updated after. An unreadable
    remembered `--rules` path degrades to an unruled import, announced in
    `notes`, as the CSV recall does.
    """
    acctids = [acctid for acctid in _ofx_acctids(source) if acctid]
    if len(acctids) != 1:
        return None
    entry = _find_ofx_entry(file, acctids[0])
    if entry is None:
        return None
    if account is not None and not _same_account(entry.get("account"), account):
        return None
    _usable_rules(entry, notes)
    return entry


def _reads_header(source: Path, delimiter: str, headers: Any, skip: int = 0) -> bool:
    """Whether a remembered delimiter still reads this file's header as the remembered one."""
    from cli.csv_mapper import header_signature, probe_decoding, read_header

    try:
        found = read_header(source, delimiter=delimiter, encoding=probe_decoding(source), skip=skip)
    except (UsageError, OSError):
        return False
    return found is not None and header_signature(found) == header_signature(headers)


def _is_multibyte_utf8(source: Path) -> bool:
    """Whether the file is valid UTF-8 that uses multi-byte sequences.

    Such a file is not cp1252 or latin-1 text: decoding it with either
    turns every accented letter into two or three wrong ones. Pure ASCII
    reads the same under all three, so it settles nothing.
    """
    try:
        data = source.read_bytes()
        data.decode("utf-8")
    except (UnicodeDecodeError, OSError):
        return False
    return not data.isascii()


def _legacy_encoding_notice(source: Path, encoding: str) -> str | None:
    """Recheck a remembered legacy decoding without guessing its code page."""
    try:
        source.read_bytes().decode("utf-8")
    except UnicodeDecodeError:
        return (
            f"Remembered --csv encoding={encoding} may misread {source.name}: non-UTF-8 bytes do not identify "
            "their code page. Re-save the export as UTF-8, or confirm its encoding and pass "
            f"--csv encoding={encoding} explicitly. The remembered mapping is unchanged."
        )
    except OSError:
        pass  # The normal source read reports its access failure.
    return None


def _remember_csv(
    file: Path, spec: dict[str, Any], notes: list[str], *, sign_change: tuple[Path, bool] | None = None
) -> bool:
    """Persist captured settings without re-reading a source already imported.

    A failed save is named in `notes` as well as on stderr, so the JSON
    envelope of the import that succeeded says its settings were not kept.
    """
    from cli.csv_mapper import header_signature

    headers = spec.get("headers")
    if not headers:
        return False
    record = _csv_record(file)
    try:
        wanted = header_signature(headers)
        record.parent.mkdir(parents=True, exist_ok=True)
        # Imports run side by side each add an entry here; without the lock the
        # later replace drops the earlier one, and a shared header then looks
        # like it belongs to a single account (w5/214). The record to read is
        # chosen under the lock: a legacy one stops applying once a concurrent
        # writer has saved the memory under the stored spelling. The lock file
        # sits beside the directory, which holds nothing but records.
        with exclusive_lock(record.parent.with_name(f"{record.parent.name}.lock")):
            stored = _stored_sources(_csv_record(file, reading=True))

            def same_entry(entry: dict[str, Any]) -> bool:
                return header_signature(entry.get("headers")) == wanted and _same_account(
                    entry.get("account"), spec["account"]
                )

            sources = [entry for entry in stored if not same_entry(entry)]
            if sign_change is not None:
                # Only this file's sign changes, on the entry as it stands now:
                # a concurrent preview's file would otherwise fall off the map
                # this run read before it (w5/886).
                latest = next((entry for entry in stored if same_entry(entry)), None)
                spec = {**spec, **_signed(_sign_ledger_files(latest), sign_change[0], ledger=sign_change[1])}
            atomic_write(record, json.dumps({"sources": [*sources, spec]}))
        return True
    except OSError as exc:
        notes.append(f"Could not remember the column mapping: {exc}. Pass --csv on the next import.")
        output.note(notes[-1])
        return False


def _remember_ofx(file: Path, spec: dict[str, Any], notes: list[str]) -> bool:
    """Persist a resolved OFX account id, replacing the entry for its id.

    A failed save is named in `notes` as well as on stderr, so the JSON
    envelope of the import that succeeded says its settings were not kept.
    """
    acctid = spec.get("acctid")
    if not acctid:
        return False
    record = _ofx_record(file)
    try:
        record.parent.mkdir(parents=True, exist_ok=True)
        # Imports run side by side each add an entry here; without the lock
        # the later replace drops the earlier one (w5/214). The lock file
        # sits beside the directory, which holds nothing but records.
        with exclusive_lock(record.parent.with_name(f"{record.parent.name}.lock")):
            stored = _stored_ofx_accounts(_ofx_record(file, reading=True))
            accounts = [entry for entry in stored if entry.get("acctid") != acctid]
            atomic_write(record, json.dumps({"accounts": [*accounts, spec]}))
        return True
    except OSError as exc:
        notes.append(f"Could not remember the OFX account: {exc}. Pass --account on the next import.")
        output.note(notes[-1])
        return False


def import_entries(
    source: Annotated[
        Path,
        typer.Argument(
            help="Bank/card export: a CSV for --csv, OFX/QFX for --ofx, or a file a configured importer recognizes"
        ),
    ],
    csv_mapping: Annotated[
        str | None,
        typer.Option(
            "--csv",
            help="Column mapping (date=Date, amount=Amount, narration=Description, ...; delimiter=';' overrides "
            "detection, encoding=cp1252 overrides UTF-8, decimal=comma|point forces the convention, skip=2 skips "
            "leading rows), or 'auto' to read the header row; no Python importer needed",
        ),
    ] = None,
    csv_account: Annotated[str | None, typer.Option("--account", help="Source account for --csv or --ofx rows")] = None,
    ofx: Annotated[
        bool,
        typer.Option(
            "--ofx", help="OFX/QFX bank export; detected from the file when omitted, no Python importer needed"
        ),
    ] = False,
    date_format: Annotated[
        str | None,
        typer.Option("--date-format", help="strptime date format for --csv; inferred from the file if unset"),
    ] = None,
    delimiter: Annotated[
        str | None,
        typer.Option(
            "--delimiter",
            help="CSV field delimiter for --csv: ',', ';', '|', or 'tab' (detected from the header when omitted)",
        ),
    ] = None,
    rules_file: Annotated[
        Path | None,
        typer.Option("--rules", click_type=NonEmptyPath(), help="TOML categorization rules for --csv or --ofx rows"),
    ] = None,
    default_account: Annotated[
        str | None,
        typer.Option(
            "--default-account",
            help="Counter account for --csv or --ofx rows no rule matches "
            "[default: Expenses:Uncategorized, under the ledger's own expenses root]",
        ),
    ] = None,
    config: Annotated[
        Path | None,
        typer.Option("--config", help="Python CONFIG file; defaults to the saved path or root-ledger/importers.py"),
    ] = None,
    importer_name: Annotated[str | None, typer.Option("--importer", help="Importer name when multiple match")] = None,
    apply: Annotated[bool, typer.Option("--apply", help="Validate and write the previewed entries")] = False,
    duplicates: Annotated[
        Duplicates, typer.Option("--duplicates", help="Decision for possible duplicates; exact IDs are always skipped")
    ] = Duplicates.review,
    id_key: Annotated[
        list[str] | None,
        typer.Option(
            "--id-key",
            help="Stable bank ID metadata key; repeat as needed (default: common bank ID keys). "
            "import-id and import-id-2 always match regardless.",
        ),
    ] = None,
    into: Annotated[
        Path | None,
        typer.Option("--into", click_type=IntoPath(), help="Write to an included file, relative to the root ledger"),
    ] = None,
    allow_errors: Annotated[
        bool,
        typer.Option(
            "--allow-errors",
            help="Preview and apply over semantic ledger errors such as a failing balance assertion; "
            "syntax errors still block",
        ),
    ] = False,
) -> None:
    """Preview bank-export entries; write with --apply.

    A CSV needs no Python importer: name its columns with --csv, or let bea
    read the header row, and categorize with --rules. An OFX/QFX export needs
    none either: bea detects it and reads its statements, with --account
    naming the export's account. Other formats go through a configured
    importer's Beangulp identify/account/extract interface. Possible
    duplicates require an explicit --duplicates skip/include decision before
    applying.
    """
    from cli.csv_mapper import (
        detect_delimiter,
        infer_date_format,
        inspect_date_column,
        matches_known_date,
        parse_delimiter,
        parse_mapping,
        split_spec,
        validate_reading_keys,
    )
    from cli.engine import launch

    file = context.current().entry_file()
    # A write through an included leaf is the root's: its memory is kept per
    # root, and `target.file` names the root, as the same import with
    # `--into` does. Resolved here, before memory is read (w5/613).
    redirect: str | None = None
    if into is None:
        resolved = launch.helper_json(["root", "--file", str(file)])
        if resolved.get("root"):
            file, into, redirect = Path(resolved["root"]), Path(resolved["into"]), resolved.get("note")
            if redirect:
                output.note(redirect)
    source = expand_path(source, "import source").resolve()
    if date_format is not None and not date_format.strip():
        # An empty value is not an omitted one (w5/239): read as unset, it was
        # remembered as `""` and refused every later plain import (w5/385).
        raise UsageError(
            f"--date-format {date_format!r} is empty; omit it to infer the file's date format, or give a strptime "
            "format such as %Y-%m-%d. Nothing was saved."
        )
    flag_delimiter: str | None = parse_delimiter(delimiter) if delimiter is not None else None
    csv_delimiter: str | None = flag_delimiter
    csv_encoding = "utf-8"
    csv_decimal: str | None = None
    csv_skip: int | None = None
    if csv_mapping is not None and config is not None:
        raise UsageError("Pass --csv or --config, not both.")
    if ofx and (csv_mapping is not None or config is not None):
        raise UsageError("Pass only one of --csv, --config, or --ofx.")
    if is_descriptor_path(source) and (held_descriptor(source) is None or source.is_file()):
        # The export is read here and by the engine child through one shared
        # offset, so a descriptor cannot pass through like --rules does; it
        # is refused by name instead of failing mid-import. A held pipe keeps
        # the w5/436 wording below (w5/792).
        raise UsageError(f"Export {source} is a file descriptor, not a file. Save it to a file and import that file.")
    if not source.is_file():
        if not os.path.lexists(source):
            raise UsageError(f"Export file not found: {source}")
        remedy = "Name the export file inside it." if source.is_dir() else "Save it to a file and import that file."
        raise UsageError(f"Export {output.not_a_file(source)}. {remedy}")
    # The engine child reads these, and does not inherit the descriptor a
    # `<(…)` passes as `/dev/fd/N`: "Bad file descriptor", or a config "not
    # found" right after "Using importers from" it (w5/582). A held
    # `--rules` descriptor that names a regular file passes through instead,
    # and is never remembered: descriptor 0 rides the inherited stdin, the
    # rest ride `pass_fds` (w5/792). `--config` cannot pass through: the
    # engine runs it with `runpy`, which opens it twice, and the two opens
    # share one offset, so the config imports empty.
    descriptor_fds: list[int] = []
    for flag, named in (("--rules", rules_file), ("--config", config)):
        path = expand_path(named, flag) if named is not None else None
        if path is None:
            continue
        if is_descriptor_path(path):
            held = held_descriptor(path)
            if flag == "--config":
                if held is None or path.is_file():
                    raise UsageError(
                        f"{flag} {path} is a file descriptor, not a file. Save it to a file and pass that file."
                    )
                # A held pipe keeps the w5/582 refusal: fall through.
            else:
                if held is None:
                    raise UsageError(
                        f"{flag} {path} is a file descriptor this process does not hold open. "
                        "Redirect a file into it, or save it to a file and pass that file."
                    )
                if held > 0 and not path.is_file():
                    raise UsageError(f"{flag} {output.not_a_file(path)}. Save it to a file and pass that file.")
                if held > 0:
                    descriptor_fds.append(held)
                continue
        if os.path.lexists(path) and not path.is_file():
            raise UsageError(f"{flag} {output.not_a_file(path)}. Save it to a file and pass that file.")

    csv_request: str | None = csv_mapping
    config_to_remember: Path | None = None
    csv_to_remember: dict[str, Any] | None = None
    ofx_to_remember: dict[str, Any] | None = None
    ofx_mode = ofx
    ofx_origin = "--ofx"
    ofx_acctid: str | None = None
    ofx_recalled: dict[str, Any] | None = None
    # The sign this run chose for its own file, applied to the stored entry
    # under the record lock: the map in `csv_to_remember` predates it (w5/886).
    sign_change: tuple[Path, bool] | None = None
    discarded_note: str | None = None
    csv_origin = "--csv"
    csv_run_account: str | None = csv_account
    csv_rules_arg: Path | None = None
    rules_is_descriptor = False
    if rules_file is not None:
        expanded_rules = expand_path(rules_file, "--rules")
        # A descriptor passes through as spelled: resolving it names
        # nothing stable, and on Linux names the redirect target, which must
        # not be remembered as the rules (w5/792).
        rules_is_descriptor = is_descriptor_path(expanded_rules)
        csv_rules_arg = expanded_rules if rules_is_descriptor else expanded_rules.resolve()
    remembered_run = False
    recalled_sign_ledger = False
    inferred_notes: list[str] = []
    recall_notes: list[str] = []
    config_notes: list[str] = []
    memory_note = _memory_unreadable(file)
    if memory_note is not None:
        config_notes.append(memory_note)
    recalled_date_format: str | None = None
    recalled_source: str | None = None
    # Only a date format the caller chose is worth remembering. An inferred one
    # belongs to the file it was read from, and two exports can share a header
    # row without sharing a date convention.
    chosen_date_format = date_format
    chosen_default_account = default_account
    # Likewise a delimiter: one detected for this file belongs to this file,
    # and forcing it onto the next export sharing the header refused a re-save
    # with another separator for "lacking" a column it plainly had (w5/077).
    chosen_delimiter = flag_delimiter
    if chosen_delimiter is None and csv_mapping is not None and csv_mapping.strip().casefold() != "auto":
        try:
            chosen_delimiter = parse_mapping(csv_mapping).delimiter
        except UsageError:
            chosen_delimiter = None
    carried_delimiter = chosen_delimiter
    typed_keys: Any = None
    typed_key_names: set[str] = set()

    def settings_notes(date_format: str | None, *, refusal: bool = False) -> list[str]:
        """Resolved settings for output; only recalled or inferred settings enrich refusals."""
        if refusal and csv_origin == "--csv":
            return []
        frontend_notes: list[str] = [*config_notes]
        if remembered_run:
            columns_only = _strip_spec_keys(csv_request or "", {"delimiter", "encoding", "decimal", "skip", "sign"})
            if recalled_sign_ledger:
                columns_only = f"{columns_only},sign=ledger"
            if csv_encoding != "utf-8":
                # One --csv keeps the echoed columns when the line is pasted.
                columns_only = f"{columns_only},encoding={csv_encoding}"
            if csv_decimal is not None:
                columns_only = f"{columns_only},decimal={csv_decimal}"
            if csv_skip is not None:
                columns_only = f"{columns_only},skip={csv_skip}"
            settings = [f"--csv {_shell_spec(columns_only)}"]
            if csv_run_account is not None:
                settings.append(shlex.join(["--account", csv_run_account]))
            if date_format is not None:
                settings.append(shlex.join(["--date-format", date_format]))
            if csv_rules_arg is not None and not rules_is_descriptor:
                settings.append(shlex.join(["--rules", str(csv_rules_arg)]))
            if default_account is not None:
                settings.append(f"--default-account {default_account}")
            if carried_delimiter is not None:
                settings.append(f"--delimiter {_display_delimiter(carried_delimiter)}")
            if recalled_source is not None and recalled_source != source.name:
                frontend_notes.append(
                    f"Using settings remembered from {recalled_source} for {source.name}: {' '.join(settings)}."
                )
            else:
                frontend_notes.append(f"Using remembered settings for {source.name}: {' '.join(settings)}.")
        elif csv_origin == "inferred --csv":
            frontend_notes.append(
                f"Read the column mapping from the header row: --csv {_shell_spec(csv_request or '')}"
                + (f" --date-format {shlex.quote(date_format)}" if date_format is not None else "")
                + ". Pass --csv to override."
            )
        else:
            delimiter_note = (
                f", delimiter {_display_delimiter(csv_delimiter)}"
                if csv_delimiter is not None and csv_delimiter != ","
                else ""
            )
            encoding_note = f", encoding {csv_encoding}" if csv_encoding != "utf-8" else ""
            decimal_note = f", decimal {csv_decimal}" if csv_decimal is not None else ""
            skip_note = f", skip {csv_skip}" if csv_skip is not None else ""
            frontend_notes.append(
                f"Using column mapping (--csv{delimiter_note}{encoding_note}{decimal_note}{skip_note})."
            )
        frontend_notes.extend(recall_notes)
        frontend_notes.extend(inferred_notes)
        return frontend_notes

    @contextmanager
    def preserve_settings_notes(*, failed_inference: bool = False) -> Iterator[None]:
        """Keep known settings on early refusals without claiming inference succeeded."""
        try:
            yield
        except UsageError as exc:
            notes = (
                [*config_notes, *recall_notes, *inferred_notes]
                if failed_inference
                else settings_notes(date_format, refusal=True)
            )
            exc.details = list(dict.fromkeys([*notes, *exc.details]))
            raise

    def ofx_notes(*, refusal: bool = False) -> list[str]:
        """Resolved OFX settings for output; only recalled or detected settings enrich refusals."""
        if refusal and ofx_origin == "--ofx":
            return []
        notes = [*config_notes]
        if remembered_run:
            settings = ["--ofx"]
            if csv_run_account is not None:
                settings.append(shlex.join(["--account", csv_run_account]))
            if csv_rules_arg is not None and not rules_is_descriptor:
                settings.append(shlex.join(["--rules", str(csv_rules_arg)]))
            if default_account is not None:
                settings.append(f"--default-account {default_account}")
            if recalled_source is not None and recalled_source != source.name:
                notes.append(
                    f"Using settings remembered from {recalled_source} for {source.name}: {' '.join(settings)}."
                )
            else:
                notes.append(f"Using remembered settings for {source.name}: {' '.join(settings)}.")
        elif ofx_origin == "detected --ofx":
            notes.append(f"Detected {source.name} as an OFX export; parsed with beangulp's OFX importer.")
        else:
            notes.append("Using OFX import (--ofx).")
        notes.extend(recall_notes)
        return notes

    if csv_request is not None:
        # `--csv auto` listed a QIF's `!Type:Bank` as "its columns", and a
        # mapping said the file "lacks" them; no mapping can read it (w5/846).
        _refuse_not_csv(source)
    if csv_request is not None and csv_request.strip().casefold() == "auto":
        with preserve_settings_notes(failed_inference=True):
            csv_request = _inferred_mapping(
                source,
                explicit=True,
                notes=inferred_notes,
                delimiter=csv_delimiter,
                encoding=csv_encoding,
                account=csv_account,
                skip=csv_skip or 0,
            )
        csv_origin = "inferred --csv"
    if csv_request is not None and csv_request.strip().casefold() != "auto":
        try:
            peek = parse_mapping(csv_request)
        except UsageError:
            # The mapping itself is judged later, with more context; the keys
            # that decide how the file is read are judged now (w5/332).
            validate_reading_keys(csv_request)
            peek = None
        if peek is not None:
            if peek.encoding is not None:
                # The decoding key applies before any read, so detection itself
                # decodes with it; the merge below re-applies it idempotently.
                csv_encoding = peek.encoding
            if peek.decimal is not None:
                # A typed convention wins over a remembered one, for this run
                # and — saved below — for the next flag-free one.
                csv_decimal = peek.decimal
            if peek.skip is not None:
                csv_skip = peek.skip
            if not peek.columns:
                # Keys without columns (`encoding=`, `delimiter=`, `sign=` alone)
                # apply on top of the mapping remembered for this header and
                # account: `--csv sign=ledger` is what bea itself advises for
                # the next file, and re-inferring instead discarded the saved
                # mapping or failed on headers inference cannot read (w5/078).
                # With nothing remembered, decode with the keys and infer the
                # mapping like `auto`.
                _check_delimiter_conflict(flag_delimiter, peek.delimiter)
                if peek.delimiter is not None:
                    csv_delimiter = peek.delimiter
                if _recall_csv(file, source, csv_account, notes=[], skip=csv_skip) is not None:
                    typed_keys = peek
                    typed_key_names = {part.partition("=")[0].strip() for part in split_spec(csv_request)}
                    csv_request = None
                else:
                    with preserve_settings_notes(failed_inference=True):
                        csv_request = _inferred_mapping(
                            source,
                            explicit=True,
                            notes=inferred_notes,
                            delimiter=csv_delimiter,
                            encoding=csv_encoding,
                            account=csv_account,
                            skip=csv_skip or 0,
                        )
                    if peek.sign != "bank" and csv_request is not None:
                        csv_request = f"{csv_request},sign={peek.sign}"
                    if peek.decimal is not None and csv_request is not None:
                        csv_request = f"{csv_request},decimal={peek.decimal}"
                    if peek.skip is not None and csv_request is not None:
                        csv_request = f"{csv_request},skip={peek.skip}"
                    csv_origin = "inferred --csv"
    if not ofx_mode and csv_mapping is None and config is None and _looks_like_ofx(source):
        # An explicitly configured ledger keeps its Python importers for OFX
        # files too: only an unconfigured one takes the no-code path
        # unasked. Explicit --ofx always wins.
        if _config_available(file, config_notes) is None:
            ofx_mode = True
            ofx_origin = "detected --ofx"
    if ofx_mode:
        found_acctids = [acctid for acctid in _ofx_acctids(source) if acctid]
        ofx_acctid = found_acctids[0] if len(found_acctids) == 1 else None
        if not ofx:
            ofx_recalled = _recall_ofx(file, source, csv_account, notes=recall_notes)
            if ofx_recalled is not None:
                if recall_notes:
                    ofx_to_remember = ofx_recalled
                csv_run_account = csv_account or ofx_recalled["account"]
                remembered_run = True
                ofx_origin = "remembered --ofx"
                if isinstance(ofx_recalled.get("source"), str):
                    recalled_source = ofx_recalled["source"]
                if csv_rules_arg is None and isinstance(ofx_recalled.get("rules"), str):
                    csv_rules_arg = Path(ofx_recalled["rules"])
                if default_account is None and isinstance(ofx_recalled.get("default_account"), str):
                    default_account = ofx_recalled["default_account"]
                # An option typed on a recalled run wins for this run, so it
                # must also be what the next flag-free run replays (w5/073).
                typed_ofx = {
                    "rules": (
                        "--rules",
                        str(csv_rules_arg) if rules_file is not None and not rules_is_descriptor else None,
                    ),
                    "default_account": ("--default-account", chosen_default_account),
                }
                ofx_updates = {
                    key: (flag, value)
                    for key, (flag, value) in typed_ofx.items()
                    if value is not None and ofx_recalled.get(key) != value
                }
                if ofx_updates:
                    changes = []
                    for key, (flag, value) in ofx_updates.items():
                        change = f"{flag} {shlex.quote(value)}"
                        prior_value = ofx_recalled.get(key)
                        if isinstance(prior_value, str):
                            change += f" (was {shlex.quote(prior_value)})"
                        changes.append(change)
                    ofx_to_remember = {**ofx_recalled, **{key: value for key, (_, value) in ofx_updates.items()}}
                    discarded_note = (
                        f"Updated remembered settings for {source.name}: {', '.join(changes)}. "
                        "A flag-free run of this bank account now uses them."
                    )
    if not ofx_mode and csv_request is None and config is None:
        remembered = _recall_csv(file, source, csv_account, notes=recall_notes, skip=csv_skip)
        if remembered is not None:
            if recall_notes:
                csv_to_remember = remembered
            csv_request = remembered["mapping"]
            csv_run_account = csv_account or remembered["account"]
            remembered_run = True
            csv_origin = "remembered --csv"
            if isinstance(remembered.get("source"), str):
                recalled_source = remembered["source"]
            if csv_rules_arg is None and isinstance(remembered.get("rules"), str):
                csv_rules_arg = Path(remembered["rules"])
            if default_account is None and isinstance(remembered.get("default_account"), str):
                default_account = remembered["default_account"]
            # A `""` saved before w5/385 refused every plain import: read it as unset.
            if date_format is None and isinstance(remembered.get("date_format"), str) and remembered["date_format"]:
                date_format = remembered["date_format"]
                recalled_date_format = remembered["date_format"]
            # Older records also kept a detected separator inside the mapping.
            stored_delimiter = remembered.get("delimiter")
            try:
                recalled_spec = parse_mapping(csv_request)
            except UsageError:
                recalled_spec = None
            if recalled_spec is not None:
                stored_delimiter = stored_delimiter or recalled_spec.delimiter
                if "encoding" in typed_key_names:
                    # A typed decoding wins over the remembered one, for this
                    # run and — saved below — for the next flag-free one.
                    csv_request = f"{_strip_spec_keys(csv_request, {'encoding'})},encoding={csv_encoding}"
                elif recalled_spec.encoding not in (None, "utf-8") and _is_multibyte_utf8(source):
                    # Re-validated per file, like the date format: two exports
                    # can share a header row without sharing an encoding, and
                    # the remembered codec would write mojibake here (w5/281).
                    # Only this run changes; the saved mapping keeps its key.
                    csv_request = _strip_spec_keys(csv_request, {"encoding"})
                    recall_notes.append(
                        f"Remembered --csv encoding={recalled_spec.encoding} does not match {source.name}, "
                        "which is UTF-8; read it as UTF-8. The remembered encoding still applies to files "
                        "that are not UTF-8."
                    )
                elif recalled_spec.encoding is not None:
                    # Detection below decodes the file, so the remembered
                    # decoding has to be in force before it runs.
                    csv_encoding = recalled_spec.encoding
                    if csv_encoding in {"cp1252", "latin-1"} and (
                        notice := _legacy_encoding_notice(source, csv_encoding)
                    ):
                        recall_notes.append(notice)
                if "decimal" in typed_key_names:
                    # A typed convention wins over the remembered one, for
                    # this run and — saved below — for the next flag-free one.
                    csv_decimal = typed_keys.decimal
                    csv_request = f"{_strip_spec_keys(csv_request, {'decimal'})},decimal={csv_decimal}"
                elif recalled_spec.decimal is not None:
                    csv_decimal = recalled_spec.decimal
                if "skip" in typed_key_names:
                    csv_skip = typed_keys.skip
                    csv_request = f"{_strip_spec_keys(csv_request, {'skip'})},skip={csv_skip}"
                elif recalled_spec.skip is not None:
                    csv_skip = recalled_spec.skip
            csv_request = _strip_spec_keys(csv_request, {"delimiter"})
            if csv_delimiter is None and isinstance(stored_delimiter, str):
                # Re-validated per file: the header matched under detection, so
                # a remembered separator that reads it differently is stale.
                if _reads_header(source, stored_delimiter, remembered.get("headers"), csv_skip or 0):
                    csv_delimiter = carried_delimiter = stored_delimiter
                else:
                    recall_notes.append(
                        f"Remembered --delimiter {_display_delimiter(stored_delimiter)} does not read "
                        f"{source.name}; detected its separator instead."
                    )
            # An option typed on a recalled run wins for this run, so it must
            # also be what the next flag-free run replays: otherwise `--apply`
            # recomputes without it and writes rows nobody reviewed (w5/073).
            typed = {
                "date_format": ("--date-format", chosen_date_format),
                # A typed descriptor run keeps the prior memory: it applies
                # to this run only (w5/792).
                "rules": (
                    "--rules",
                    str(csv_rules_arg) if rules_file is not None and not rules_is_descriptor else None,
                ),
                "default_account": ("--default-account", chosen_default_account),
                "delimiter": ("--delimiter", chosen_delimiter),
            }
            updates = {
                key: (flag, value)
                for key, (flag, value) in typed.items()
                if value is not None and remembered.get(key) != value
            }
            if updates:
                changes = []
                for key, (flag, value) in updates.items():
                    show = _display_delimiter if key == "delimiter" else shlex.quote
                    change = f"{flag} {show(value)}"
                    prior_value = remembered.get(key)
                    if isinstance(prior_value, str):
                        change += f" (was {show(prior_value)})"
                    changes.append(change)
                csv_to_remember = {**remembered, **{key: value for key, (_, value) in updates.items()}}
                discarded_note = (
                    f"Updated remembered settings for {source.name}: {', '.join(changes)}. "
                    "A flag-free run of this header now uses them."
                )
            sign_files = _sign_ledger_files(remembered)
            if typed_keys is not None:
                # The keys typed on this run are part of what the next
                # flag-free run of this file must replay. Sign stays out of
                # the mapping; only the files it was chosen for are recorded.
                if "sign" in typed_key_names:
                    csv_request = _strip_spec_keys(csv_request, {"sign"})
                    recalled_sign_ledger = typed_keys.sign == "ledger"
                    if recalled_sign_ledger:
                        csv_request = f"{csv_request},sign=ledger"
                    signed = _signed(sign_files, source, ledger=recalled_sign_ledger)
                    sign_files = signed["sign_ledger_files"]
                    sign_change = (source, recalled_sign_ledger)
                    csv_to_remember = {**(csv_to_remember or remembered), "source": source.name, **signed}
                if "encoding" in typed_key_names:
                    csv_to_remember = {
                        **(csv_to_remember or remembered),
                        "mapping": _strip_spec_keys(csv_request, {"sign", "delimiter"}),
                    }
            if sign_files and "sign" not in typed_key_names:
                # `sign=ledger` belongs to the files it was chosen for. Replaying
                # one of them keeps it, so `--apply` writes what the preview
                # showed; any other file sharing the header must say its sign.
                seeded_from = list(sign_files.values())[-1]
                current = _source_sha256(source)
                if current in sign_files:
                    recalled_sign_ledger = True
                    csv_request = f"{csv_request},sign=ledger"
                    recall_notes.append(
                        f"Re-applied sign=ledger: {source.name} is the file it was chosen for. "
                        "Pass --csv sign=bank to override."
                    )
                elif current is not None and source.name in sign_files.values():
                    # The same name with changed bytes — a pending row deleted,
                    # next month's export over the old path. Replaying the old
                    # sign would flip every amount, and reading it bank-signed
                    # already did (w5/754): refuse until the sign is said again.
                    raise UsageError(
                        f"{source.name} changed since sign=ledger was chosen for it, so its sign is no longer "
                        "known. Pass --csv sign=ledger to confirm it is still ledger-signed, or sign=bank; "
                        "nothing was written."
                    )
                else:
                    recall_notes.append(
                        f"{seeded_from} was imported with sign=ledger, but sign is never carried to another "
                        f"file: {source.name} is read bank-signed. Pass --csv sign=ledger if it is ledger-signed."
                    )
        elif config is None and _config_available(file, config_notes) is None:
            with preserve_settings_notes(failed_inference=True):
                csv_request = _inferred_mapping(
                    source,
                    explicit=False,
                    notes=inferred_notes,
                    delimiter=csv_delimiter,
                    encoding=csv_encoding,
                    account=csv_account,
                    skip=csv_skip or 0,
                )
            if csv_request is not None:
                csv_origin = "inferred --csv"

    csv_mode = csv_request is not None
    if csv_mode and csv_delimiter is None:
        with preserve_settings_notes():
            csv_delimiter = detect_delimiter(source, encoding=csv_encoding, skip=csv_skip or 0)
    if csv_origin == "inferred --csv" and csv_request is not None:
        # The echoed spec carries what was assumed, so it pastes back verbatim.
        if csv_delimiter is not None and csv_delimiter != ",":
            csv_request = f"{csv_request},delimiter={_display_delimiter(csv_delimiter)}"
        if csv_encoding != "utf-8":
            csv_request = f"{csv_request},encoding={csv_encoding}"
    argv = ["import", "--file", str(file), "--source", str(source), "--duplicates", duplicates.value]
    if apply:
        argv.append("--apply")
    if allow_errors:
        argv.append("--allow-errors")
    if into is not None:
        argv += ["--into", str(into)]
    for key in id_key or []:
        argv += ["--id-key", key]

    if csv_mode:
        if importer_name is not None:
            # The mirror of the refusal below: the column mapping has no named
            # importers, so the name would be dropped and the rows written (w5/240).
            mapping_source = {
                "inferred --csv": "the column mapping read from its header row",
                "remembered --csv": "the column mapping remembered for its header row",
            }.get(csv_origin, "the --csv column mapping")
            raise UsageError(
                f"--importer selects a Python importer by name, but this import reads {source.name} with "
                f"{mapping_source}, which has no named importers. Remove --importer, or choose a Python "
                "importer with --config FILE.",
                details=settings_notes(date_format, refusal=True),
            )
        if csv_run_account is None or csv_request is None:
            if csv_origin == "inferred --csv":
                raise UsageError(
                    f"Read a column mapping from the header row of {source.name} "
                    f"(--csv {_shell_spec(csv_request or '')}), but not which account the export belongs to. "
                    "Add --account ACCOUNT, naming the account it belongs to, or choose a Python importer with "
                    "--config FILE.",
                    # The settings notes too: an unreadable settings directory
                    # is why nothing was remembered here (w5/525).
                    details=settings_notes(date_format, refusal=True),
                )
            raise UsageError(
                # No example account: one that was never typed sent pasted
                # savings rows into checking (w5/470, w5/612).
                "--csv needs --account ACCOUNT, naming the account the export belongs to.",
                details=settings_notes(date_format, refusal=True),
            )
        mapping = parse_mapping(csv_request)
        spec_delimiter = mapping.delimiter
        with preserve_settings_notes():
            _check_delimiter_conflict(flag_delimiter, spec_delimiter)
        if spec_delimiter is not None:
            csv_delimiter = spec_delimiter
        if mapping.encoding is not None:
            csv_encoding = mapping.encoding
        if date_format is None:
            with preserve_settings_notes():
                date_format, ambiguous, rejection = inspect_date_column(
                    source,
                    mapping.columns["date"],
                    delimiter=csv_delimiter,
                    encoding=csv_encoding,
                    mapped_columns=mapping.columns,
                    skip=csv_skip or 0,
                )
            if rejection is not None:
                # No known format reads the whole column: name the cell that
                # ruled out the last one, never a format the user did not pick.
                if not rejection.first and not matches_known_date(rejection.value):
                    # Rows above parsed, and no known format reads this cell
                    # at all: it is a footer, not a wrongly-formatted date,
                    # and `--date-format` advice would send the user in
                    # circles (w5/758).
                    raise UsageError(
                        f"Row {rejection.row} (line {rejection.line}): {rejection.value!r} in column "
                        f"{mapping.columns['date']!r} is not a data row. Remove the line and import again.",
                        # The remembered-settings note first, as other refusals list it (w5/525).
                        details=settings_notes(None, refusal=True),
                    )
                fits = "any date format bea recognizes" if rejection.first else "the date format the rows above use"
                raise UsageError(
                    f"Row {rejection.row} (line {rejection.line}): cannot parse date {rejection.value!r} in column "
                    f"{mapping.columns['date']!r} with {fits}. Correct the cell, or pass --date-format with the "
                    "file's strptime format (for example --date-format %d.%m.%y).",
                    # The remembered-settings note first, as other refusals list it (w5/525).
                    details=settings_notes(None, refusal=True),
                )
            if date_format is None:
                date_format = "%Y-%m-%d"
            elif ambiguous:
                inferred_notes.append(
                    f"Dates parse as {date_format} but the column has no day past the twelfth, so day-first and "
                    "month-first cannot be told apart. Pass --date-format if that is the wrong reading."
                )
        elif recalled_date_format is not None:
            # A remembered format is re-validated against each file: two
            # exports can share headers without sharing a date convention.
            # Ambiguous files cannot prove a mismatch, so only an unambiguous
            # disagreement refuses; an unreadable column keeps the memory.
            with preserve_settings_notes():
                inferred_format, ambiguous = infer_date_format(
                    source,
                    mapping.columns["date"],
                    delimiter=csv_delimiter,
                    encoding=csv_encoding,
                    skip=csv_skip or 0,
                    # The remembered choice competes too: a custom format that
                    # still reads every date is not a mismatch (w5/911).
                    also=[recalled_date_format],
                )
            if inferred_format is not None and not ambiguous and inferred_format != recalled_date_format:
                raise UsageError(
                    f"Remembered --date-format {shlex.quote(recalled_date_format)} does not match {source.name}, "
                    f"whose dates look like {inferred_format}. Pass --date-format {shlex.quote(inferred_format)} "
                    "(or --csv) for this file.",
                    details=settings_notes(date_format, refusal=True),
                )

        frontend_notes = settings_notes(date_format)
        if rules_is_descriptor:
            frontend_notes.append(
                f"--rules {csv_rules_arg} is a file descriptor; it applies to this import only and is not "
                "remembered. The remembered rules, if any, still apply to later imports."
            )
        for line in frontend_notes:
            output.note(line)
        # The engine's parser rejects `delimiter=`, `encoding=`, `decimal=`,
        # and `skip=` by design: the frontend owns the merge above and
        # forwards columns only.
        forward_spec = _strip_spec_keys(csv_request, {"delimiter", "encoding", "decimal", "skip"})
        argv += ["--csv", forward_spec, "--account", csv_run_account, "--config-source", csv_origin]
        if csv_encoding != "utf-8":
            argv += ["--encoding", csv_encoding]
        if csv_decimal is not None:
            argv += ["--decimal", csv_decimal]
        if csv_skip is not None:
            argv += ["--skip", str(csv_skip)]
        argv += ["--date-format", date_format]
        if default_account is not None:
            # Unset, the engine derives it from the ledger's expenses root,
            # which only the loaded options can name.
            argv += ["--default-account", default_account]
        if csv_delimiter is not None:
            argv += ["--delimiter", "tab" if csv_delimiter == "\t" else csv_delimiter]
            if flag_delimiter is None and spec_delimiter is not None and csv_origin == "--csv":
                # Its advice names `delimiter=` in --csv, where it was given (w5/845).
                argv += ["--delimiter-source", "--csv"]
        if csv_rules_arg is not None:
            argv += ["--rules", str(csv_rules_arg)]
        if not remembered_run:
            # Sign is never remembered: a ledger-signed export must not flip
            # a later bank-signed file that merely shares its headers.
            # Nor a separator, which travels in its own field and only when chosen.
            stored_mapping = _strip_spec_keys(csv_request or "", {"sign", "delimiter"})
            try:
                from cli.csv_mapper import read_header

                # With the separator in force, so the header remembered is the one read (w5/922).
                headers = read_header(source, delimiter=csv_delimiter, encoding=csv_encoding, skip=csv_skip or 0)
                prior = _find_csv_entry(file, headers, csv_run_account or "")
            except UsageError:
                headers = None
                prior = None
            # A refresh that types no --date-format keeps the remembered one
            # when this file reads the same way: nothing was replaced, and
            # erasing it unannounced booked the next ambiguous export
            # month-first (w5/267).
            kept_date_format = chosen_date_format
            if prior is not None:
                if chosen_date_format is None and prior.get("date_format") == date_format:
                    kept_date_format = date_format
                discarded: list[str] = []
                if isinstance(prior.get("rules"), str) and csv_rules_arg is None:
                    discarded.append(shlex.join(["--rules", prior["rules"]]))
                if (
                    isinstance(prior.get("default_account"), str)
                    and chosen_default_account is None
                    # Records written before the default followed the
                    # ledger's root stored the built-in name itself.
                    and prior["default_account"] != "Expenses:Uncategorized"
                ):
                    discarded.append(f"--default-account {prior['default_account']}")
                if (
                    isinstance(prior.get("date_format"), str)
                    and chosen_date_format is None
                    and prior["date_format"] != date_format
                ):
                    discarded.append(shlex.join(["--date-format", prior["date_format"]]))
                if discarded:
                    discarded_note = (
                        f"Discarded remembered settings for {source.name}: "
                        f"{', '.join(discarded)}. Re-pass them to keep them across refreshes."
                    )
            if rules_is_descriptor:
                # A descriptor cannot be replayed, so the prior entry's
                # rules carry forward instead of being wiped (w5/792).
                carried = prior.get("rules") if prior is not None else None
                stored_rules = carried if isinstance(carried, str) and not is_descriptor_path(carried) else None
            else:
                stored_rules = str(csv_rules_arg) if csv_rules_arg is not None else None
            csv_to_remember = {
                "headers": headers,
                "mapping": stored_mapping,
                "source": source.name,
                "account": csv_run_account,
                "rules": stored_rules,
                "default_account": default_account,
                "date_format": kept_date_format,
                "delimiter": chosen_delimiter,
                # Sign itself is never remembered; only which files it was
                # chosen for, so replaying one of them cannot flip its sign.
                # Another file's run leaves their entries alone (w5/594).
                **_signed(_sign_ledger_files(prior), source, ledger=mapping.sign == "ledger"),
            }
            sign_change = (source, mapping.sign == "ledger")
    elif ofx_mode:
        if importer_name is not None:
            # The mirror of the CSV refusal above: the built-in OFX importer
            # has no named importers, so the name would be dropped and the
            # rows written (w5/240).
            raise UsageError(
                f"--importer selects a Python importer by name, but this import reads {source.name} with "
                "the built-in OFX importer, which has no named importers. Remove --importer, or choose a "
                "Python importer with --config FILE.",
                details=ofx_notes(refusal=True),
            )
        csv_only = [
            flag for flag, value in (("--date-format", date_format), ("--delimiter", delimiter)) if value is not None
        ]
        if csv_only:
            applies = "applies" if len(csv_only) == 1 else "apply"
            raise UsageError(
                f"{', '.join(csv_only)} {applies} only to --csv rows, but this import reads {source.name} as "
                f"OFX. Remove {'it' if len(csv_only) == 1 else 'them'} to import the OFX file.",
                details=ofx_notes(refusal=True),
            )
        if csv_run_account is None:
            if ofx_origin == "detected --ofx":
                raise UsageError(
                    f"Detected {source.name} as an OFX export, but not which account the export belongs to. "
                    "Add --account ACCOUNT, naming the account it belongs to, or choose a Python importer with "
                    "--config FILE.",
                    details=ofx_notes(refusal=True),
                )
            raise UsageError(
                # No example account: one that was never typed sent pasted
                # savings rows into checking (w5/470, w5/612).
                "--ofx needs --account ACCOUNT, naming the account the export belongs to.",
                details=ofx_notes(refusal=True),
            )
        launch.require_feature("beangulp")
        frontend_notes = ofx_notes()
        if rules_is_descriptor:
            frontend_notes.append(
                f"--rules {csv_rules_arg} is a file descriptor; it applies to this import only and is not "
                "remembered. The remembered rules, if any, still apply to later imports."
            )
        for line in frontend_notes:
            output.note(line)
        argv += ["--ofx", "--account", csv_run_account, "--config-source", ofx_origin]
        if default_account is not None:
            # Unset, the engine derives it from the ledger's expenses root,
            # which only the loaded options can name.
            argv += ["--default-account", default_account]
        if csv_rules_arg is not None:
            argv += ["--rules", str(csv_rules_arg)]
        if not remembered_run:
            prior = _find_ofx_entry(file, ofx_acctid) if ofx_acctid is not None else None
            if prior is not None:
                ofx_discarded: list[str] = []
                if isinstance(prior.get("rules"), str) and csv_rules_arg is None:
                    ofx_discarded.append(shlex.join(["--rules", prior["rules"]]))
                if (
                    isinstance(prior.get("default_account"), str)
                    and chosen_default_account is None
                    # Records written before the default followed the
                    # ledger's root stored the built-in name itself.
                    and prior["default_account"] != "Expenses:Uncategorized"
                ):
                    ofx_discarded.append(f"--default-account {prior['default_account']}")
                if ofx_discarded:
                    discarded_note = (
                        f"Discarded remembered settings for {source.name}: "
                        f"{', '.join(ofx_discarded)}. Re-pass them to keep them across refreshes."
                    )
            if rules_is_descriptor:
                # A descriptor cannot be replayed, so the prior entry's
                # rules carry forward instead of being wiped (w5/792).
                carried = prior.get("rules") if prior is not None else None
                stored_rules = carried if isinstance(carried, str) and not is_descriptor_path(carried) else None
            else:
                stored_rules = str(csv_rules_arg) if csv_rules_arg is not None else None
            if ofx_acctid is not None:
                ofx_to_remember = {
                    "acctid": ofx_acctid,
                    "account": csv_run_account,
                    "rules": stored_rules,
                    "default_account": default_account,
                    "source": source.name,
                }
    else:
        config_path, config_source = _config_path(
            file,
            config,
            config_notes,
            source=source,
            account=csv_account,
            delimiter=csv_delimiter,
            encoding=csv_encoding,
            skip=csv_skip or 0,
        )
        frontend_notes = [*config_notes]
        # A Python importer names its own account and categories and never
        # reads the column-mapping options, so one typed here would be dropped
        # and the rows written wherever the importer says (w5/131).
        ignored = [
            flag
            for flag, value in (
                ("--account", csv_account),
                ("--date-format", chosen_date_format),
                ("--delimiter", delimiter),
                ("--rules", rules_file),
                ("--default-account", chosen_default_account),
            )
            if value is not None
        ]
        if ignored:
            applies = "applies" if len(ignored) == 1 else "apply"
            if _looks_like_ofx(source):
                instead = (
                    "replace --config with --ofx to import it without an importer"
                    if config is not None
                    else "pass --ofx to import it without an importer"
                )
            else:
                instead = (
                    f"replace --config with --csv auto to read {source.name} by its header row"
                    if config is not None
                    else f"add --csv auto to read {source.name} by its header row"
                )
            raise UsageError(
                f"{', '.join(ignored)} {applies} only to --csv or --ofx rows, but this import uses the Python "
                f"importers from {config_path} ({config_source}), which choose the account and categories "
                f"themselves. Remove {'it' if len(ignored) == 1 else 'them'} to use the importer, or {instead}.",
                details=config_notes,
            )
        config_to_remember = config_path
        frontend_notes.append(f"Using importers from {config_path} ({config_source})")
        for line in frontend_notes:
            output.note(line)
        argv += ["--config", str(config_path), "--config-source", config_source]
        if importer_name is not None:
            argv += ["--importer", importer_name]

    if remembered_run and ofx_mode:
        json_remembered: dict[str, Any] | None = {
            "mapping": None,
            "source": recalled_source,
            "account": csv_run_account,
            "date_format": None,
            "delimiter": None,
            "encoding": None,
            "decimal": None,
            "skip": None,
            "rules": (
                (ofx_recalled.get("rules") if isinstance(ofx_recalled, dict) else None)
                if rules_is_descriptor
                else (str(csv_rules_arg) if csv_rules_arg is not None else None)
            ),
            "default_account": default_account,
        }
    elif remembered_run:
        json_remembered = {
            "mapping": csv_request,
            "source": recalled_source,
            "account": csv_run_account,
            "date_format": date_format,
            "delimiter": carried_delimiter,
            "encoding": csv_encoding,
            "decimal": csv_decimal,
            "skip": csv_skip,
            "rules": (
                (remembered.get("rules") if isinstance(remembered, dict) else None)
                if rules_is_descriptor
                else (str(csv_rules_arg) if csv_rules_arg is not None else None)
            ),
            "default_account": default_account,
        }
    else:
        json_remembered = None
    try:
        preview = launch.helper_json(argv, writes="--apply" in argv, pass_fds=sorted(set(descriptor_fds)))
    except BeaError as exc:
        # Extraction finished far enough to build a preview (conflict / invalid
        # apply). Surface the engine's notes the same way a successful preview does.
        # An importer that raised has no preview, only what it printed first —
        # shown ahead of the error it leads up to; JSON keeps it in error.result.
        if isinstance(exc.result, dict):
            for note in exc.result.get("notes") or []:
                output.note(str(note))
            if exc.result.get("importer_output"):
                output.note(str(exc.result["importer_output"]).rstrip("\n"))
        if context.current().json_output:
            # The settings this run resolved were only ever notes on stderr,
            # which JSON mode does not print: a refused import reports them as
            # a preview does (w5/282). With no preview, details name them only
            # where the mapping was recalled or inferred, never typed: other
            # failures keep their details to what the error itself lists.
            if isinstance(exc.result, dict):
                refused_notes = [*frontend_notes, *(str(note) for note in exc.result.get("notes") or [])]
                if refused_notes:
                    exc.result["notes"] = refused_notes
                if csv_mode and date_format is not None:
                    exc.result["date_format"] = date_format
                exc.result["remembered"] = json_remembered
            elif csv_mode and csv_origin != "--csv":
                exc.details = [*frontend_notes, *exc.details]
        raise
    # Only a successful preview/apply commits settings. A rejected apply may
    # carry a preview in error.result, but must preserve the previous memory.
    if memory_note is not None:
        csv_to_remember = config_to_remember = ofx_to_remember = None
    # The engine compares NFC account names. Match its spelling both when
    # rejecting unopened settings and when persisting a valid mapping (w5/714).
    pending_remember = csv_to_remember if csv_to_remember is not None else ofx_to_remember
    if pending_remember is not None:
        for key in ("account", "default_account"):
            if isinstance(account := pending_remember.get(key), str):
                pending_remember[key] = unicodedata.normalize("NFC", account)
    unopened = {
        unicodedata.normalize("NFC", account)
        for account in preview.get("unopened_accounts") or []
        if isinstance(account, str)
    }
    mistaken = [
        account
        for account in ((pending_remember or {}).get("account"), (pending_remember or {}).get("default_account"))
        if isinstance(account, str) and account in unopened
    ]
    if mistaken:
        # A preview with a mistyped source or default account would otherwise
        # register it beside the right one, and every later flag-free import of
        # the header refuses to choose between them (w5/452).
        csv_to_remember = ofx_to_remember = None
        not_remembered = (
            f"Not remembering these settings: {', '.join(mistaken)} "
            f"{'is' if len(mistaken) == 1 else 'are'} not open in this ledger."
        )
        frontend_notes.append(not_remembered)
        output.note(not_remembered)
    if (
        csv_to_remember is not None
        and _remember_csv(file, csv_to_remember, frontend_notes, sign_change=sign_change)
        and discarded_note is not None
    ):
        frontend_notes.append(discarded_note)
        output.note(discarded_note)
    if (
        ofx_to_remember is not None
        and _remember_ofx(file, ofx_to_remember, frontend_notes)
        and discarded_note is not None
    ):
        frontend_notes.append(discarded_note)
        output.note(discarded_note)
    engine_notes = [str(note) for note in preview.pop("notes", []) or []]
    for note in engine_notes:
        output.note(note)
    if config_to_remember is not None:
        _remember_config(file, config_to_remember, engine_notes)

    if context.current().json_output:
        notes = [*([redirect] if redirect else []), *frontend_notes, *engine_notes]
        if notes:
            preview["notes"] = notes
        if csv_mode and date_format is not None:
            preview["date_format"] = date_format
        preview["remembered"] = json_remembered
        # The write destination sits in `target.into` for every writer, as
        # `add` and `price export` report it (w5/324).
        output.emit(preview, target=output.write_target(file, str(preview.get("into") or file)))
    else:
        # The diff is ledger text, and what `--apply` is approved on: UTF-8
        # whatever the locale, as `list` and `report` print (w5/532).
        output.utf8_stdout()
        summary = (
            f"{preview['importer']} → {preview['account']}: {preview['ready']} ready, "
            f"{preview['duplicates']} exact duplicates, {preview['possible_duplicates']} possible duplicates"
        )
        if preview["skipped_blank"]:
            noun = "row" if preview["skipped_blank"] == 1 else "rows"
            summary += f", {preview['skipped_blank']} blank {noun} skipped"
        if preview.get("skipped_pending"):
            noun = "row" if preview["skipped_pending"] == 1 else "rows"
            summary += f", {preview['skipped_pending']} pending {noun} left out"
        if preview["conflicts"]:
            noun = "conflict" if preview["conflicts"] == 1 else "conflicts"
            summary += f", {preview['conflicts']} {noun}"
        if preview["blocked"]:
            summary += f", {preview['blocked']} blocked"
        if preview.get("invalid"):
            summary += f", {preview['invalid']} invalid"
        typer.echo(summary)
        headers = ["ROW", "STATUS", "DATE", "PAYEE / NARRATION", "SOURCE AMOUNT", "ID"]
        if csv_mode or ofx_mode:
            headers.append("RULE")
        rows = preview["rows"]
        output.table(
            headers,
            [
                [
                    str(row["row"]),
                    row["status"],
                    row["date"],
                    " / ".join(v for v in (row["payee"], row["narration"]) if v),
                    row["amount"],
                    row.get("id_source") or "",
                    *([row.get("rule") or ""] if csv_mode or ofx_mode else []),
                ]
                for row in rows
            ],
        )
        for row in rows:
            if row["match"]:
                match = row["match"]
                if match["row"] is not None:
                    typer.echo(f"\nRow {row['row']}: {row['reason']}\nMatches row {match['row']} of this import:")
                else:
                    typer.echo(
                        f"\nRow {row['row']}: {row['reason']}\nExisting entry at {match['filename']}:{match['lineno']}:"
                    )
                typer.echo(match["entry"])
            elif row["status"] == "blocked":
                typer.echo(f"\nRow {row['row']}: {row['reason']}")
        # The diff's context lines are the existing ledger's own tail, byte for
        # byte, so a hand-edited or third-party file's escape sequences would
        # otherwise repaint the table above (w5/244); JSON keeps the exact value.
        typer.echo(inert_text(preview["diff"]))
        for error in preview["validation_errors"]:
            output.note(error)
        for warning in preview["validation_warnings"]:
            output.note(warning)
        if preview.get("importer_output"):
            output.note(preview["importer_output"])
        if apply:
            written = preview["written"]
            noun = "entry" if written == 1 else "entries"
            output.success(f"Wrote {written} {noun} to {preview['into']}.")
        elif preview["validation_errors"]:
            # `--apply` refuses while these stand, so it is not the next step (w5/638).
            typer.echo("Preview only. The import would leave the ledger invalid; fix the errors above before --apply.")
        elif preview["blocked"] or preview["conflicts"]:
            kinds = [name for key, name in (("blocked", "blocked"), ("conflicts", "conflicting")) if preview[key]]
            typer.echo(f"Preview only. Resolve the {' and '.join(kinds)} rows, then preview again.")
        elif preview["possible_duplicates"] and duplicates == "review":
            typer.echo(
                "Preview only. Review possible duplicates and choose --duplicates skip/include, then preview again."
            )
        elif not preview["ready"]:
            typer.echo("Nothing new to import.")
        else:
            typer.echo("Preview only. Review the entries, then repeat with --apply to write.")
