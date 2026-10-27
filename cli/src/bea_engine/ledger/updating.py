"""Locate and rewrite transactions for `bea-engine update`.

An imported row is found by the identity its importer wrote: the `import-id`
metadata every bea import stamps, or the `ref` metadata bank importers use.
Either may repeat across entries — a re-imported statement, a transfer both of
whose legs carry the bank's reference — so a repeated value is refused rather
than guessed at, and `file:line` names the entry outright. Only entries written
in a ledger file resolve: a plugin-synthesized row has no source lines to
rewrite.

A rewrite touches only the entry's own lines — its header for a flag,
narration or tags, its posting lines for an account retarget — so neighbours
keep their bytes. Only a narration that spanned lines, replaced by one-line
text, removes the continuation lines it no longer needs. The rewritten file is
validated as a whole and installed through the same locked, atomic replace
every other writer uses.
"""

from __future__ import annotations

import codecs
import difflib
import os
import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine import protocol
from bea_engine.ledger import reader
from bea_engine.ledger import write as ledger_write
from bea_engine.ledger.text import (
    decode_error_message,
    ledger_roots,
    parse_account,
    require_flag,
    require_tag,
    single_line,
)
from bea_engine.query import format_error

TYPES = ("transaction", "transactions")


def parse_location(id_text: str) -> tuple[Path, int] | None:
    """A `file:line` reference, or None when the text is not one.

    The split is on the last colon, so a Windows drive letter survives it, and
    the path must name an existing file: an import-id such as `stmt:42` is
    metadata, not a location.
    """
    path_text, separator, line_text = id_text.rpartition(":")
    if not separator or not path_text or not line_text.isdigit():
        return None
    lineno = int(line_text)
    if lineno < 1:
        return None
    path = Path(path_text)
    if not path.is_file():
        return None
    return path, lineno


def _same_location(entry: Any, path: Path, lineno: int) -> bool:
    """Whether the entry is written at `path:lineno`.

    Compared by identity where the filesystem allows it, so a symlinked or
    case-variant spelling of the ledger still resolves; otherwise by
    normalized absolute path.
    """
    meta = entry.meta or {}
    if meta.get("lineno") != lineno:
        return False
    filename = meta.get("filename")
    if not isinstance(filename, str) or not filename:
        return False
    try:
        if os.path.samefile(path, filename):
            return True
    except OSError:
        pass
    return os.path.normcase(os.path.abspath(str(path))) == os.path.normcase(os.path.abspath(filename))


def _metadata_values(entry: Any, key: str) -> list[str]:
    """The entry's values for a metadata key, as the id forms compare them.

    A `ref` may be typed — a date, a decimal — where an import-id is always a
    string, so both compare as strings. A decimal also answers to the
    fixed-point text listings print, since `str()` reads `0.00000001` as
    `1E-8` and the id copied from `bea list` found nothing (w5/1030).
    """
    value = (entry.meta or {}).get(key)
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    forms = [str(value)]
    if isinstance(value, Decimal) and format(value, "f") not in forms:
        forms.append(format(value, "f"))
    return forms


def _where(entry: Any) -> str:
    """The entry's `file:line`, for an error that names each match."""
    meta = entry.meta or {}
    return f"{meta.get('filename', '?')}:{meta.get('lineno', '?')}"


def _ambiguous(id_text: str, key: str, matches: list[Any]) -> protocol.UsageError:
    places = ", ".join(_where(entry) for entry in matches)
    if key == "location":
        return protocol.UsageError(
            f"Location {id_text} holds {len(matches)} transactions ({places}); "
            "a plugin duplicated the entry, so it cannot be updated in place. Nothing was written."
        )
    return protocol.UsageError(
        f"{key} {id_text!r} matches {len(matches)} transactions ({places}); "
        "name one with file:line instead. Nothing was written."
    )


def locate_transaction(entries: list[Any], id_text: str) -> Any:
    """The one on-disk transaction `id_text` names.

    `file:line` resolves by location; anything else resolves by `import-id`
    first and `ref` second, so an import-id always wins when a `ref` elsewhere
    spells the same value. A repeated value is ambiguous and an absent one is
    not found; both are usage errors, because the caller named the wrong entry
    rather than the ledger failing to load.
    """
    from beancount.core.data import Transaction

    shared = reader.shared_locations(entries)
    on_disk = [
        entry
        for entry in entries
        if isinstance(entry, Transaction) and not reader.entry_generated(entry, "transaction", shared)
    ]
    location = parse_location(id_text)
    if location is not None:
        path, lineno = location
        matches = [entry for entry in on_disk if _same_location(entry, path, lineno)]
        if len(matches) > 1:
            raise _ambiguous(f"{path}:{lineno}", "location", matches)
        if matches:
            return matches[0]
        raise protocol.UsageError(
            f"No transaction at {path}:{lineno}; the line holds no transaction of this ledger. Nothing was written."
        )
    # The loader reads metadata as NFC, so a decomposed id copied from the
    # file is compared in that form too (w5/1030).
    wanted = unicodedata.normalize("NFC", id_text)
    for key in ("import-id", "ref"):
        matches = [entry for entry in on_disk if wanted in _metadata_values(entry, key)]
        if len(matches) > 1:
            raise _ambiguous(id_text, key, matches)
        if matches:
            return matches[0]
    raise protocol.UsageError(f"No transaction with import-id or ref {id_text!r} in this ledger. Nothing was written.")


@dataclass
class _Changes:
    """One validated update request: which entry, and what about it changes."""

    id: str
    account: str | None = None
    from_account: str | None = None
    flag: str | None = None
    tags: list[str] | None = None
    narration: str | None = None
    has_narration: bool = False


_REQUEST_FIELDS = ("id", "account", "flag", "tags", "narration")


def _validate_request(request: dict[str, Any]) -> _Changes:
    """The request as validated changes, or a usage failure naming the problem.

    Unknown keys are refused rather than ignored: a misspelled `acount` that
    silently changed nothing would read as a categorized row.
    """
    unknown = [key for key in request if key not in _REQUEST_FIELDS]
    if unknown:
        raise protocol.UsageError(
            f"Unknown update field {', '.join(repr(key) for key in unknown)}; "
            f"use {', '.join(_REQUEST_FIELDS)}. Nothing was written."
        )
    raw_id = request.get("id")
    if not isinstance(raw_id, str) or not raw_id.strip():
        raise protocol.UsageError("An update needs an 'id': an import-id, a ref, or file:line. Nothing was written.")
    changes = _Changes(id=raw_id)
    account = request.get("account")
    if account is not None:
        if not isinstance(account, str) or not account.strip():
            raise protocol.UsageError("'account' must be an account name, optionally as OLD=NEW. Nothing was written.")
        changes.account = account.strip()
    flag = request.get("flag")
    if flag is not None:
        if not isinstance(flag, str):
            raise protocol.UsageError("'flag' must be a one-character flag such as '*' or '!'. Nothing was written.")
        try:
            changes.flag = require_flag(flag)
        except ValueError as exc:
            raise protocol.UsageError(f"{exc} Nothing was written.") from None
    tags = request.get("tags")
    if tags is not None:
        if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
            raise protocol.UsageError("'tags' must be a list of tag names. Nothing was written.")
        try:
            changes.tags = [require_tag(tag) for tag in tags]
        except ValueError as exc:
            raise protocol.UsageError(f"{exc} Nothing was written.") from None
    if "narration" in request:
        narration = request["narration"]
        if not isinstance(narration, str):
            raise protocol.UsageError("'narration' must be a string. Nothing was written.")
        # A field, so escaped like `add` escapes its fields: a pasted line
        # break becomes a space rather than a second directive.
        changes.narration = single_line(narration)
        changes.has_narration = True
    if changes.account is None and changes.flag is None and not changes.tags and not changes.has_narration:
        raise protocol.UsageError(
            "Nothing to change: pass 'account', 'flag', 'tags', or 'narration' alongside 'id'. Nothing was written."
        )
    return changes


def _gate_load_errors(errors: list[Any], file: Path, *, allow_errors: bool) -> None:
    """Refuse to plan an edit against a ledger that does not load.

    The span and the line edits are computed from the parse; on a broken parse
    they could name the wrong lines. `--allow-errors` tolerates pre-existing
    errors the write itself does not touch, like every other writer.
    """
    if errors and not allow_errors:
        raise protocol.LedgerError(
            f"{file}: {len(errors)} error(s).",
            details=[format_error(error, ledger_file=file) for error in errors],
        )


def _generated(entry: Any, shared: frozenset[tuple[str, int]]) -> bool:
    """Whether the entry is plugin-synthesized rather than written in its file."""
    return reader.entry_generated(entry, type(entry).__name__.lower(), shared)


def entry_span(entries: list[Any], entry: Any, line_count: int) -> tuple[int, int]:
    """The 1-based inclusive line span the entry's source lines occupy.

    Bounded by the next written entry in the same file, or the end of file.
    Trailing comments and blank lines between entries fall inside the span and
    stay byte-identical: only the header line and the retargeted posting lines
    are ever rewritten. Synthesized entries never bound the span, so a plugin
    row stamped inside it cannot truncate the edit.
    """
    meta = entry.meta or {}
    start = int(meta["lineno"])
    filename = os.path.normcase(os.path.abspath(str(meta["filename"])))
    shared = reader.shared_locations(entries)
    following = []
    for other in entries:
        other_meta = other.meta or {}
        lineno = other_meta.get("lineno")
        if not isinstance(lineno, int) or lineno <= start:
            continue
        other_file = os.path.normcase(os.path.abspath(str(other_meta.get("filename", ""))))
        if other_file != filename or _generated(other, shared):
            continue
        following.append(lineno)
    return start, min(following) - 1 if following else line_count


_HEADER_DATE = re.compile(r"\d{4,}[-/]\d+[-/]\d+")
_HEADER_STRING = re.compile(r'"(?:[^"\\]|\\.)*"', re.DOTALL)
_HEADER_MARK = re.compile(r"[#^][A-Za-z0-9\-_/.]+")
_TAG_CHARACTER = re.compile(r"[A-Za-z0-9\-_/.]")


@dataclass
class _Header:
    """A transaction header's token spans, as offsets into its logical text.

    The logical header runs from the date to the first line break outside a
    string, so a payee or narration that continues onto later lines belongs
    to it whole (w5/1026).
    """

    end: int
    flag: tuple[int, int]
    strings: list[tuple[int, int]]
    marks: list[tuple[int, int]]


def _skip_gap(text: str, at: int) -> int:
    """The offset past the spaces, tabs and carriage returns the lexer ignores."""
    while at < len(text) and text[at] in " \t\r":
        at += 1
    return at


def _lex_header(text: str) -> _Header | None:
    """The written header's spans, lexed as Beancount's lexer does, or None.

    Tokens may touch without whitespace — `!"Merchant""Coffee"#tag^link` is
    one flag, two strings, a tag and a link (w5/1039, w5/1042). `txn`, a
    punctuation flag, or a capital letter followed by whitespace is the flag;
    a `#` that starts a tag is a tag, not the flag.
    """
    date = _HEADER_DATE.match(text)
    if date is None:
        return None
    at = _skip_gap(text, date.end())
    if text.startswith("txn", at):
        flag = (at, at + 3)
    elif at < len(text) and (
        text[at] in "*!&?%"
        or (text[at] == "#" and _TAG_CHARACTER.match(text, at + 1) is None)
        or ("A" <= text[at] <= "Z" and (at + 1 == len(text) or text[at + 1] in " \t\n"))
    ):
        flag = (at, at + 1)
    else:
        return None
    strings: list[tuple[int, int]] = []
    marks: list[tuple[int, int]] = []
    at = flag[1]
    while True:
        at = _skip_gap(text, at)
        if at == len(text) or text[at] == "\n":
            break
        if text[at] == ";":
            newline = text.find("\n", at)
            at = len(text) if newline < 0 else newline
            break
        token = _HEADER_STRING.match(text, at) if not marks else None
        if token is not None:
            strings.append(token.span())
        else:
            token = _HEADER_MARK.match(text, at)
            if token is None:
                return None
            marks.append(token.span())
        at = token.end()
    return _Header(end=at, flag=flag, strings=strings, marks=marks)


def _fresh_tags(entry: Any, changes: _Changes) -> list[str]:
    """The requested tags the entry does not already carry, in request order."""
    return [tag for tag in dict.fromkeys(changes.tags or []) if tag not in set(entry.tags or ())]


def _edit_header(text: str, entry: Any, changes: _Changes) -> tuple[str, int]:
    """The logical header with the requested flag, narration and tags applied.

    `text` runs from the header's first line to the entry's end; the answer is
    the rewritten header and the length of the original header it replaces.
    Each edit splices one written token's span, so adjacent strings, tags,
    links, comments and spacing keep their bytes: the flag swaps only the flag
    token, the narration lands in the written narration slot — the second of
    two strings, the only one of one, or right after the flag of a bare header,
    ahead of every tag and link — and new tags follow the last tag or link,
    outside every string. Byte-identical when nothing about the header
    changes: an equal flag keeps even the `txn` keyword's spelling.
    """
    header = _lex_header(text)
    if header is None:  # pragma: no cover - the located entry parsed from these lines
        raise protocol.UsageError(
            f"Cannot update the entry at {_where(entry)}: its header line is no longer a transaction line. "
            "Nothing was written."
        )
    original = text[: header.end]
    flag_start, flag_end = header.flag
    glued = flag_end < len(original) and original[flag_end] not in " \t\r\n"
    # (start, end, replacement) in original offsets; at one offset, the
    # earlier splice reads first.
    splices: list[tuple[int, int, str]] = []
    if changes.flag is not None and changes.flag != entry.flag:
        # A capital letter is only a flag when whitespace follows it.
        spaced = changes.flag.isalpha() and glued and not (changes.has_narration and not header.strings)
        splices.append((flag_start, flag_end, changes.flag + (" " if spaced else "")))
    if changes.has_narration:
        assert changes.narration is not None
        quoted = '"' + changes.narration.replace("\\", "\\\\").replace('"', '\\"') + '"'
        # The slot is the one the header writes — not the loaded payee's,
        # which a plugin may have filled or dropped (w5/1026).
        if header.strings:
            start, end = header.strings[-1]
            splices.append((start, end, quoted))
        else:
            splices.append((flag_end, flag_end, f" {quoted}" + (" " if glued else "")))
    fresh = _fresh_tags(entry, changes) if changes.tags else []
    if fresh:
        # After the existing tags and links, which a reviewer reads left to right.
        at = max(end for _, end in [header.flag, *header.strings, *header.marks])
        splices.append((at, at, "".join(f" #{tag}" for tag in fresh)))
    edited = original
    for _, (start, end, replacement) in sorted(
        enumerate(splices), key=lambda item: (item[1][0], item[0]), reverse=True
    ):
        edited = edited[:start] + replacement + edited[end:]
    return edited, header.end


def holding_account(options: dict[str, Any]) -> str:
    """The account imports park uncategorized rows in under this ledger's roots."""
    return f"{ledger_roots(options)[-1]}:Uncategorized"


_POSTING_LINE = re.compile(r"^(\s+)((?:[*!&#?%]\s*|[A-Z]\s+)?)(\S+)(.*)$")


def _retarget_accounts(entry: Any, options: dict[str, Any], changes: _Changes) -> tuple[str, str]:
    """The (old, new) posting accounts the change retargets.

    A bare account retargets the review queue's leg: the unique posting to the
    holding account, or the only posting when the entry holds one. Anything
    less clear names the entry's accounts and asks for OLD=NEW, which retargets
    every posting at OLD.
    """
    assert changes.account is not None
    held = [posting.account for posting in entry.postings]
    if "=" in changes.account:
        old, _, new = changes.account.partition("=")
        old = parse_account(old.strip())
        new = parse_account(new.strip())
        if old not in held:
            raise protocol.UsageError(
                f"No posting to {old} in the entry at {_where(entry)}; it posts to {', '.join(held)}. "
                "Nothing was written."
            )
        return old, new
    new = parse_account(changes.account)
    candidates = [account for account in held if account == holding_account(options)]
    if len(candidates) == 1:
        return candidates[0], new
    if not candidates and len(held) == 1:
        return held[0], new
    listing = ", ".join(held)
    if len(candidates) > 1:
        raise protocol.UsageError(
            f"The entry at {_where(entry)} posts to the holding account twice ({listing}); "
            f"name the leg to retarget as OLD=NEW. Nothing was written."
        )
    raise protocol.UsageError(
        f"The entry at {_where(entry)} posts to {listing}, so {new} alone does not say which leg to retarget; "
        "name it as OLD=NEW. Nothing was written."
    )


def _summarize(entry: Any, options: dict[str, Any], changes: _Changes) -> list[str]:
    """The row's changes as `field: old → new` phrases, for the batch table."""
    summary = []
    if changes.account is not None:
        old, new = _retarget_accounts(entry, options, changes)
        if old != new:
            summary.append(f"account: {old} → {new}")
    if changes.flag is not None and changes.flag != entry.flag:
        summary.append(f"flag: {entry.flag} → {changes.flag}")
    fresh = _fresh_tags(entry, changes) if changes.tags else []
    if fresh:
        summary.append(f"tags: {', '.join(f'+{tag}' for tag in fresh)}")
    if changes.has_narration and changes.narration != entry.narration:
        before = entry.narration if entry.narration is not None else "—"
        summary.append(f"narration: {before!r} → {changes.narration!r}")
    return summary


def plan_lines(
    lines: list[str], entries: list[Any], options: dict[str, Any], entry: Any, changes: _Changes
) -> dict[int, str | None]:
    """The entry's rewritten lines by 0-based index; every other line stays verbatim.

    A `None` removes its line: a narration that spanned lines and is replaced
    by one-line text leaves its continuation lines behind, so the header's
    first line carries the whole new header and the rest go. Every other edit
    keeps the line count. One row's plan, computed against the file as read:
    batch rows plan against the same original and combine, which is sound
    because entry spans never overlap and every index names an original line.
    """
    start, end = entry_span(entries, entry, len(lines))
    planned: dict[int, str | None] = {}
    if changes.flag is not None or changes.has_narration or changes.tags:
        text = "\n".join(lines[start - 1 : end])
        rewritten, consumed = _edit_header(text, entry, changes)
        old_lines = text[:consumed].split("\n")
        new_lines = rewritten.split("\n")
        if len(new_lines) == len(old_lines):
            for offset, (old, new) in enumerate(zip(old_lines, new_lines, strict=True)):
                if old != new:
                    planned[start - 1 + offset] = new
        else:
            planned[start - 1] = rewritten
            for offset in range(1, len(old_lines)):
                planned[start - 1 + offset] = None
    if changes.account is not None:
        old, new = _retarget_accounts(entry, options, changes)
        if old != new:
            # Only the account token is swapped; indentation, flags, amounts
            # and alignment stay byte-identical. Metadata lines can never
            # match: their first token ends with a colon, which no account does.
            # Nor can a line inside a multiline memo, narration or metadata
            # string that happens to start with the account: only the lines
            # the postings were parsed from are candidates (w5/1025).
            span = range(start - 1, min(end, len(lines)))
            source = (entry.meta or {}).get("filename")
            posted = {
                lineno - 1
                for posting in entry.postings
                if (posting.meta or {}).get("filename") == source
                and isinstance(lineno := (posting.meta or {}).get("lineno"), int)
            }
            for number in sorted(posted & set(span)) if posted else span:
                matched = _POSTING_LINE.match(lines[number])
                # The loader reads the account in NFC; a decomposed `Café` in
                # the file is that same account (w5/1038).
                token = matched.group(3) if matched is not None else ""
                if matched is None or unicodedata.normalize("NFC", token) != old or token.endswith(":"):
                    continue
                planned[number] = f"{matched.group(1)}{matched.group(2)}{new}{matched.group(4)}"
    return planned


def _decode(target: Path, original: bytes) -> tuple[str, bool]:
    """The file's text, and whether a byte-order mark prefixes it.

    Decoded for editing and re-encoded with the mark restored, so a BOM file
    keeps its first bytes; the header pattern would otherwise miss a line-one
    entry glued to the mark.
    """
    try:
        return original.decode("utf-8-sig"), original.startswith(codecs.BOM_UTF8)
    except UnicodeDecodeError as exc:
        raise protocol.LedgerError(decode_error_message(target, exc)) from exc


def plan_rewrite(
    entries: list[Any],
    options: dict[str, Any],
    entry: Any,
    changes: _Changes,
    original: bytes,
    target: Path,
) -> tuple[str, str]:
    """The rewritten file content and the unified diff of one entry's update.

    Lines are counted the way the lexer counts them — by `\\n` alone — so a
    carriage return or a Unicode line break inside a string cannot shift the
    span. Every line outside the entry's span, and every unmatched line inside
    it, is returned verbatim.
    """
    text, bom = _decode(target, original)
    lines = text.split("\n")
    planned = plan_lines(lines, entries, options, entry, changes)
    if not planned:
        return text, ""
    new_text = _combined_text(lines, planned)
    return (("\ufeff" if bom else "") + new_text), _file_diff(text, new_text, target)


def _planned_answer(
    changes: _Changes, target: Path, entry: Any, diff: str, *, written: int, warnings: list[str]
) -> dict[str, Any]:
    return {
        "id": changes.id,
        "target": str(target),
        "lineno": (entry.meta or {}).get("lineno"),
        "diff": diff,
        "written": written,
        "warnings": warnings,
    }


def _notes(entry: Any, options: dict[str, Any], changes: _Changes, snapshot: ledger_write.LedgerSnapshot) -> list[str]:
    """Warn when the retarget spells an account in another normalization than the ledger."""
    if changes.account is None:
        return []
    old, new = _retarget_accounts(entry, options, changes)
    if old == new:
        return []
    return ledger_write.respelled_account_notes([new], snapshot)


@dataclass
class _RowPlan:
    """One batch row, resolved to its entry and planned against the file as read."""

    index: int
    changes: _Changes
    entry: Any
    target: Path
    lineno: int
    edits: dict[int, str | None]
    summary: list[str]


def _row_reason(index: int, exc: Exception) -> str:
    """`Row N: ...` for a row's failure.

    The single-row refusals end in "Nothing was written", which a batch must
    not repeat: its other rows may still write.
    """
    return f"Row {index + 1}: {str(exc).removesuffix(' Nothing was written.')}"


def _plan_rows(
    entries: list[Any], options: dict[str, Any], rows: list[Any], file_lines: dict[Path, list[str]]
) -> tuple[list[_RowPlan], list[str], list[int], dict[int, str], bool]:
    """Resolve and plan every row.

    Returns the plans, the `Row N` detail lines, the rejected 0-based indexes,
    the per-row reasons, and whether any row failed its own shape (which earns
    the answer an example row). A row that resolves but changes nothing plans
    to no edits; it reports `unchanged`, never rejected.
    """
    plans: list[_RowPlan] = []
    rejected: list[str] = []
    rejected_rows: list[int] = []
    reasons: dict[int, str] = {}
    schema_rejects = False
    seen: dict[tuple[str, int], int] = {}

    def refuse(index: int, reason: str, *, schema: bool = False) -> None:
        rejected.append(reason)
        rejected_rows.append(index)
        reasons[index] = reason
        nonlocal schema_rejects
        schema_rejects = schema_rejects or schema

    for index, item in enumerate(rows):
        if not isinstance(item, dict):
            refuse(index, f"Row {index + 1} must be an object with 'id' and the fields to change.", schema=True)
            continue
        try:
            changes = _validate_request(item)
        except protocol.UsageError as exc:
            refuse(index, _row_reason(index, exc), schema=True)
            continue
        try:
            entry = locate_transaction(entries, changes.id)
        except protocol.UsageError as exc:
            refuse(index, _row_reason(index, exc))
            continue
        key = (str((entry.meta or {})["filename"]), int((entry.meta or {})["lineno"]))
        if key in seen:
            refuse(
                index,
                f"Row {index + 1} targets {key[0]}:{key[1]}, already targeted by row {seen[key] + 1}; "
                "merge them into one row.",
            )
            continue
        seen[key] = index
        try:
            summary = _summarize(entry, options, changes)
        except protocol.UsageError as exc:
            refuse(index, _row_reason(index, exc))
            continue
        target = Path(key[0])
        edits = plan_lines(file_lines[target], entries, options, entry, changes)
        plans.append(
            _RowPlan(
                index=index, changes=changes, entry=entry, target=target, lineno=key[1], edits=edits, summary=summary
            )
        )
    return plans, rejected, rejected_rows, reasons, schema_rejects


def _merge_edits(plans: list[_RowPlan]) -> dict[int, str | None]:
    """Every planned line rewrite, by 0-based index; spans never overlap, so none collide."""
    return {number: line for plan in plans for number, line in plan.edits.items()}


def _combined_text(lines: list[str], edits: dict[int, str | None]) -> str:
    """The file's lines with every planned rewrite applied and every `None` line removed."""
    rewritten: list[str | None] = list(lines)
    for number, new_line in edits.items():
        rewritten[number] = new_line
    return "\n".join(line for line in rewritten if line is not None)


def _file_diff(text: str, new_text: str, target: Path) -> str:
    """One file's unified diff, in the shape the import preview answers."""
    return "".join(
        difflib.unified_diff(text.splitlines(True), new_text.splitlines(True), fromfile=str(target), tofile=str(target))
    )


def _validate_text(
    target: Path, snapshot: ledger_write.LedgerSnapshot, new_text: str, *, allow_errors: bool
) -> list[str]:
    """The warnings for a candidate file content, raising what it would break."""
    with ledger_write.candidate_file(target, new_text) as candidate:
        return ledger_write.validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)


def _validate_plans(
    plans: list[_RowPlan],
    file_lines: dict[Path, list[str]],
    snapshot: ledger_write.LedgerSnapshot,
    rejected: list[str],
    rejected_rows: list[int],
    reasons: dict[int, str],
    *,
    allow_errors: bool,
) -> dict[Path, list[_RowPlan]]:
    """Validate every file's combined rewrite, attributing failures to rows.

    Each file's rows validate together first: one load per file, not per row.
    When a file's combination fails, its rows validate alone so the answer
    names the guilty ones; survivors that pass alone but fail together are
    rejected with the combined error and a way forward, never silently dropped.
    Validation details are already `file:line` located, so they join the
    answer verbatim beneath their `Row N` line.
    """
    by_file: dict[Path, list[_RowPlan]] = {}
    for plan in plans:
        by_file.setdefault(plan.target, []).append(plan)
    valid: dict[Path, list[_RowPlan]] = {}
    for target in sorted(by_file):
        file_plans = [plan for plan in by_file[target] if plan.edits]
        if not file_plans:
            continue
        combined = _combined_text(file_lines[target], _merge_edits(file_plans))
        try:
            _validate_text(target, snapshot, combined, allow_errors=allow_errors)
        except protocol.LedgerError:
            survivors: list[_RowPlan] = []
            for plan in file_plans:
                single = _combined_text(file_lines[target], plan.edits)
                try:
                    _validate_text(target, snapshot, single, allow_errors=allow_errors)
                except protocol.LedgerError as exc:
                    reason = _row_reason(plan.index, exc)
                    rejected.append(reason)
                    rejected.extend(exc.details)
                    rejected_rows.append(plan.index)
                    reasons[plan.index] = reason
                else:
                    survivors.append(plan)
            if not survivors:
                continue
            combined = _combined_text(file_lines[target], _merge_edits(survivors))
            try:
                _validate_text(target, snapshot, combined, allow_errors=allow_errors)
            except protocol.LedgerError as exc:
                together = ", ".join(f"row {plan.index + 1}" for plan in survivors)
                for plan in survivors:
                    reason = (
                        f"Row {plan.index + 1}: valid alone, but {together} together "
                        f"would leave the ledger invalid: {exc}"
                    )
                    rejected.append(reason)
                    rejected_rows.append(plan.index)
                    reasons[plan.index] = reason
                rejected.extend(exc.details)
            else:
                valid[target] = survivors
        else:
            valid[target] = file_plans
    return valid


def _row_payload(
    rows: list[Any],
    plans: list[_RowPlan],
    reasons: dict[int, str],
    file_texts: dict[Path, str],
    file_lines: dict[Path, list[str]],
) -> list[dict[str, Any]]:
    """Every row's result, in input order: one JSON object per row."""
    by_index = {plan.index: plan for plan in plans}
    payload = []
    for index, item in enumerate(rows):
        raw_id = item.get("id") if isinstance(item, dict) else None
        if index in reasons:
            payload.append({"row": index + 1, "id": raw_id, "status": "rejected", "reason": reasons[index]})
            continue
        plan = by_index[index]
        if not plan.edits:
            payload.append(
                {
                    "row": index + 1,
                    "id": plan.changes.id,
                    "status": "unchanged",
                    "target": str(plan.target),
                    "lineno": plan.lineno,
                    "changes": [],
                    "diff": "",
                    "noop": True,
                }
            )
            continue
        single = _combined_text(file_lines[plan.target], plan.edits)
        payload.append(
            {
                "row": index + 1,
                "id": plan.changes.id,
                "status": "ok",
                "target": str(plan.target),
                "lineno": plan.lineno,
                "changes": plan.summary,
                "diff": _file_diff(file_texts[plan.target], single, plan.target),
            }
        )
    return payload


def _transactions(file: Path, request: dict[str, Any], *, apply: bool, allow_errors: bool) -> dict[str, Any]:
    """Preview or apply a batch of rows, writing every valid row.

    Unlike `add transactions`, there is no `--partial`: valid rows always
    write and rejected rows never abort them. The exit status is still nonzero
    whenever any row was rejected — the documented partial-failure code, 1 —
    with `written_rows` and `rejected_rows` in the result, as `add` reports.
    """
    from bea_engine import managed_load

    rows = request.get("rows")
    if not isinstance(rows, list):
        raise protocol.UsageError("'rows' must be an array of update rows. Nothing was written.")
    if not rows:
        raise protocol.UsageError("No rows to update. Nothing was written.")

    def load(snapshot: ledger_write.LedgerSnapshot | None = None) -> tuple[list[Any], dict[str, Any]]:
        entries, errors, options = managed_load.load_file(file, snapshot=snapshot)
        _gate_load_errors(errors, file, allow_errors=allow_errors)
        return list(entries), options

    def files(snapshot: ledger_write.LedgerSnapshot) -> tuple[dict[Path, str], dict[Path, list[str]], dict[Path, bool]]:
        texts, lines, marks = {}, {}, {}
        for path, content in snapshot.contents.items():
            if snapshot.stats[path] is None:
                continue
            text, bom = _decode(path, content)
            texts[path] = text
            lines[path] = text.split("\n")
            marks[path] = bom
        return texts, lines, marks

    def report(
        row_payload: list[dict[str, Any]],
        diff: str,
        *,
        written: int,
        rejected_rows: list[int],
        unchanged_rows: list[int],
        warnings: list[str],
    ) -> dict[str, Any]:
        return {
            "rows": row_payload,
            "diff": diff,
            "ready": sum(1 for row in row_payload if row["status"] == "ok"),
            "unchanged": len(unchanged_rows),
            "rejected": len(rejected_rows),
            "written": written,
            "warnings": warnings,
        }

    def refuse_partial(
        row_payload: list[dict[str, Any]],
        rejected: list[str],
        *,
        written: int,
        written_rows: list[int],
        rejected_rows: list[int],
        unchanged_rows: list[int],
        schema_rejects: bool,
    ) -> protocol.LedgerError:
        count = len(rejected_rows)
        noun = "row was" if count == 1 else "rows were"
        total = len(rows)
        message = f"Updated {written} of {total} transactions; {count} {noun} rejected."
        if unchanged_rows:
            alone = "was" if len(unchanged_rows) == 1 else "were"
            message += f" {len(unchanged_rows)} {alone} already up to date."
        details = list(rejected)
        if schema_rejects:
            details.append(
                'Example row: {"id": "9f2c", "account": "Expenses:Groceries", "flag": "*"}. '
                "Use bea update transactions --help for the full row shape."
            )
        return protocol.LedgerError(
            message,
            details=details,
            result={
                "rows": row_payload,
                "written": written,
                "written_rows": sorted(written_rows),
                "rejected_rows": rejected_rows,
                "unchanged_rows": sorted(unchanged_rows),
            },
        )

    if not apply:
        entries, options = load()
        snapshot = ledger_write.LedgerSnapshot.capture(file)
        file_texts, file_lines, _ = files(snapshot)
        plans, rejected, rejected_rows, reasons, schema_rejects = _plan_rows(entries, options, rows, file_lines)
        valid = _validate_plans(
            plans, file_lines, snapshot, rejected, rejected_rows, reasons, allow_errors=allow_errors
        )
        diffs = "".join(
            _file_diff(
                file_texts[target],
                _combined_text(file_lines[target], _merge_edits(valid[target])),
                target,
            )
            for target in sorted(valid)
        )
        notes: list[str] = []
        for plan in plans:
            if plan.edits and plan.index not in reasons:
                notes.extend(_notes(plan.entry, options, plan.changes, snapshot))
        row_payload = _row_payload(rows, plans, reasons, file_texts, file_lines)
        unchanged_rows = [row["row"] - 1 for row in row_payload if row["status"] == "unchanged"]
        return report(
            row_payload,
            diffs,
            written=0,
            rejected_rows=rejected_rows,
            unchanged_rows=unchanged_rows,
            warnings=notes,
        )

    with ledger_write.locked_graph(file, file, deciding=True) as snapshot:
        entries, options = load(snapshot)
        file_texts, file_lines, marks = files(snapshot)
        plans, rejected, rejected_rows, reasons, schema_rejects = _plan_rows(entries, options, rows, file_lines)
        # Every file validates before any file writes, so a validation failure
        # never leaves half the batch behind.
        valid = _validate_plans(
            plans, file_lines, snapshot, rejected, rejected_rows, reasons, allow_errors=allow_errors
        )
        for directory in dict.fromkeys(path.parent for path in snapshot.contents):
            ledger_write.sweep_abandoned_candidates(directory)
        # The loop below re-reads every file before each write; the answer's
        # diffs compare against the files as they were, or each earlier file's
        # rows reported an empty diff once it had been written (w5/1029).
        before_texts, before_lines = dict(file_texts), dict(file_lines)
        written_rows: list[int] = []
        warnings: list[str] = []
        for target in sorted(valid):
            # Re-read the bytes each previous replace left: the next file's
            # plan is unaffected (each file is written once, from its own lines),
            # but its validation and compare must run against the ledger as it
            # stands, with every earlier file's retargets already in it.
            snapshot = ledger_write.LedgerSnapshot.capture(file)
            file_texts, file_lines, marks = files(snapshot)
            file_plans = valid[target]
            combined = _combined_text(file_lines[target], _merge_edits(file_plans))
            original = snapshot.require_target(target)
            try:
                original_stat = target.stat()
            except OSError:
                raise protocol.ConflictError(
                    f"The ledger changed during the operation: {target}. Nothing was written; retry."
                ) from None
            try:
                ledger_write.require_writable(target)
            except protocol.AuthError as exc:
                if not written_rows:
                    raise
                # An earlier file is already replaced: "nothing was written"
                # was false, and the answer named no row (w5/1040).
                unwritten = sorted(
                    plan.index for plan in plans if plan.index not in written_rows and plan.index not in rejected_rows
                )
                raise protocol.AuthError(
                    f"Ledger file is read-only or not writable: {target}. {len(written_rows)} of {len(rows)} rows "
                    f"were already written (rows {', '.join(str(i + 1) for i in sorted(written_rows))}); rows "
                    f"{', '.join(str(i + 1) for i in unwritten)} were not. Change its permissions and retry them.",
                    result={
                        "written": len(written_rows),
                        "written_rows": sorted(written_rows),
                        "unwritten_rows": unwritten,
                        "rejected_rows": rejected_rows,
                    },
                ) from exc
            new_text = ("\ufeff" if marks[target] else "") + combined
            with ledger_write.candidate_file(target, new_text) as candidate:
                try:
                    warnings.extend(
                        ledger_write.validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
                    )
                except protocol.LedgerError as exc:
                    for plan in file_plans:
                        reason = _row_reason(plan.index, exc)
                        rejected.append(reason)
                        rejected_rows.append(plan.index)
                        reasons[plan.index] = reason
                    rejected.extend(exc.details)
                    continue
                try:
                    snapshot.verify()
                    ledger_write.replace_checked(target, candidate, original, original_stat)
                except protocol.ConflictError as exc:
                    raise protocol.ConflictError(
                        f"{exc} {len(written_rows)} of {len(rows)} rows were already written; retry to apply the rest.",
                        result={
                            "written": len(written_rows),
                            "written_rows": sorted(written_rows),
                            "rejected_rows": rejected_rows,
                        },
                    ) from exc
            written_rows.extend(plan.index for plan in file_plans)
            for plan in file_plans:
                warnings.extend(_notes(plan.entry, options, plan.changes, snapshot))
        row_payload = _row_payload(rows, plans, reasons, before_texts, before_lines)
        unchanged_rows = [row["row"] - 1 for row in row_payload if row["status"] == "unchanged"]
        diffs = "".join(
            _file_diff(
                before_texts[target],
                _combined_text(before_lines[target], _merge_edits(valid[target])),
                target,
            )
            for target in sorted(valid)
            if all(plan.index in written_rows for plan in valid[target])
        )
        if rejected_rows:
            raise refuse_partial(
                row_payload,
                rejected,
                written=len(written_rows),
                written_rows=written_rows,
                rejected_rows=rejected_rows,
                unchanged_rows=unchanged_rows,
                schema_rejects=schema_rejects,
            )
        return report(
            row_payload,
            diffs,
            written=len(written_rows),
            rejected_rows=[],
            unchanged_rows=unchanged_rows,
            warnings=warnings,
        )


def answer(
    file: Path,
    directive_type: str,
    request: dict[str, Any],
    *,
    apply: bool = False,
    allow_errors: bool = False,
) -> dict[str, Any]:
    """Preview or apply one entry's update, and report what changed."""
    if directive_type == "transactions":
        return _transactions(file, request, apply=apply, allow_errors=allow_errors)
    if directive_type != "transaction":
        raise protocol.UsageError(f"Unknown directive type {directive_type!r}. Use one of: {', '.join(TYPES)}.")
    from bea_engine import managed_load

    changes = _validate_request(request)
    if not apply:
        entries, errors, options = managed_load.load_file(file)
        _gate_load_errors(errors, file, allow_errors=allow_errors)
        entry = locate_transaction(list(entries), changes.id)
        target = Path((entry.meta or {})["filename"])
        snapshot = ledger_write.LedgerSnapshot.capture(file)
        original = snapshot.require_target(target)
        _, diff = plan_rewrite(list(entries), options, entry, changes, original, target)
        return _planned_answer(
            changes, target, entry, diff, written=0, warnings=_notes(entry, options, changes, snapshot)
        )
    with ledger_write.locked_graph(file, file, deciding=True) as snapshot:
        # Read under the locks: a queued bea writer's commit lands in this
        # read rather than tripping the verify below (w5/183). The entry's own
        # file is in the graph the load read, so it is locked too.
        entries, errors, options = managed_load.load_file(file, snapshot=snapshot)
        _gate_load_errors(errors, file, allow_errors=allow_errors)
        entry = locate_transaction(list(entries), changes.id)
        target = Path((entry.meta or {})["filename"])
        original = snapshot.require_target(target)
        new_text, diff = plan_rewrite(list(entries), options, entry, changes, original, target)
        if not diff:
            return {**_planned_answer(changes, target, entry, diff, written=0, warnings=[]), "noop": True}
        for directory in dict.fromkeys([target.parent, *(path.parent for path in snapshot.contents)]):
            ledger_write.sweep_abandoned_candidates(directory)
        snapshot.verify()
        try:
            original_stat = target.stat()
        except OSError:
            raise protocol.ConflictError(
                f"The ledger changed during the operation: {target}. Nothing was written; retry."
            ) from None
        ledger_write.require_writable(target)
        with ledger_write.candidate_file(target, new_text) as candidate:
            warnings = ledger_write.validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
            snapshot.verify()
            ledger_write.replace_checked(target, candidate, original, original_stat)
        warnings = [*warnings, *_notes(entry, options, changes, snapshot)]
        return _planned_answer(changes, target, entry, diff, written=1, warnings=warnings)
