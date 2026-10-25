"""Locate and rewrite one transaction for `bea-engine update`.

An imported row is found by the identity its importer wrote: the `import-id`
metadata every bea import stamps, or the `ref` metadata bank importers use.
Either may repeat across entries — a re-imported statement, a transfer both of
whose legs carry the bank's reference — so a repeated value is refused rather
than guessed at, and `file:line` names the entry outright. Only entries written
in a ledger file resolve: a plugin-synthesized row has no source lines to
rewrite.

A rewrite touches only the entry's own lines — its header line for a flag,
narration or tags, its posting lines for an account retarget — and never adds
or removes a line, so neighbours keep their bytes and their line numbers. The
rewritten file is validated as a whole and installed through the same locked,
atomic replace every other writer uses.
"""

from __future__ import annotations

import codecs
import difflib
import os
import re
from dataclasses import dataclass
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

TYPES = ("transaction",)


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
    string, so both compare as strings.
    """
    value = (entry.meta or {}).get(key)
    if value is None:
        return []
    return [value if isinstance(value, str) else str(value)]


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
    for key in ("import-id", "ref"):
        matches = [entry for entry in on_disk if id_text in _metadata_values(entry, key)]
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
    following = [
        other.meta["lineno"]
        for other in entries
        if isinstance((other.meta or {}).get("lineno"), int)
        and (other.meta or {}).get("lineno", 0) > start
        and os.path.normcase(os.path.abspath(str((other.meta or {}).get("filename", "")))) == filename
        and not _generated(other, shared)
    ]
    return start, min(following) - 1 if following else line_count


_HEADER_FLAG = re.compile(r"^(\s*\d{4}[-/]\d+[-/]\d+\s*)(\S+)(.*)$")
_QUOTED = re.compile(r'"(?:[^"\\]|\\.)*"')
_TAG_LINK_TAIL = re.compile(r"(?:\s+[#^]\S+)+\s*$")


def _split_comment(line: str) -> tuple[str, str]:
    """The header line without and with its trailing `;` comment, if any."""
    from bea_engine.ledger.models import comment_start

    at = comment_start(line)
    if at is None:
        return line, ""
    return line[:at].rstrip(), line[at:]


def _outside_quotes(spans: list[re.Match[str]], position: int) -> bool:
    return all(not (span.start() <= position < span.end()) for span in spans)


def _edit_header(line: str, entry: Any, changes: _Changes) -> str:
    """The header line with the requested flag, narration and tags applied."""
    if changes.flag is not None:
        matched = _HEADER_FLAG.match(line)
        if matched is None:  # pragma: no cover - the located entry parsed from this line
            raise protocol.UsageError(
                f"Cannot update the entry at {_where(entry)}: its header line is no longer a transaction line. "
                "Nothing was written."
            )
        line = f"{matched.group(1)}{changes.flag}{matched.group(3)}"
    body, comment = _split_comment(line)
    spans = list(_QUOTED.finditer(body))
    if changes.has_narration:
        assert changes.narration is not None
        quoted = '"' + changes.narration.replace("\\", "\\\\").replace('"', '\\"') + '"'
        # With a payee the narration is the second string; without one it is
        # the only string, and a bare header grows one before its tags.
        index = 1 if entry.payee is not None else 0
        if index < len(spans):
            span = spans[index]
            body = body[: span.start()] + quoted + body[span.end() :]
            spans = list(_QUOTED.finditer(body))
        else:
            tail = _TAG_LINK_TAIL.search(body)
            at = tail.start() if tail is not None and _outside_quotes(spans, tail.start()) else len(body)
            body = body[:at].rstrip() + f" {quoted}" + body[at:]
            spans = list(_QUOTED.finditer(body))
    if changes.tags:
        fresh = [tag for tag in dict.fromkeys(changes.tags) if tag not in set(entry.tags or ())]
        if fresh:
            tail = _TAG_LINK_TAIL.search(body)
            if tail is not None and not _outside_quotes(spans, tail.start()):
                tail = None
            # After the existing tags, which a reviewer reads left to right;
            # a narration, above, goes before them, where the grammar puts it.
            at = tail.end() if tail is not None else len(body)
            addition = "".join(f" #{tag}" for tag in fresh)
            body = body[:at].rstrip() + addition + body[at:]
    return body + (f" {comment}" if comment else "")


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


def _edit_postings(lines: list[str], start: int, end: int, old: str, new: str) -> list[str]:
    """The span lines with every posting to `old` retargeted to `new`.

    Only the account token is swapped; indentation, flags, amounts and
    alignment stay byte-identical. Metadata lines can never match: their first
    token ends with a colon, which no account does.
    """
    edited = list(lines)
    for number in range(start - 1, min(end, len(lines))):
        matched = _POSTING_LINE.match(lines[number])
        if matched is None or matched.group(3) != old or matched.group(3).endswith(":"):
            continue
        edited[number] = f"{matched.group(1)}{matched.group(2)}{new}{matched.group(4)}"
    return edited


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
    start, end = entry_span(entries, entry, len(lines))
    edited = list(lines)
    if changes.flag is not None or changes.has_narration or changes.tags:
        edited[start - 1] = _edit_header(lines[start - 1], entry, changes)
    if changes.account is not None:
        old, new = _retarget_accounts(entry, options, changes)
        if old != new:
            edited = _edit_postings(edited, start, end, old, new)
    if edited == lines:
        return text, ""
    new_text = "\n".join(edited)
    diff = "".join(
        difflib.unified_diff(
            text.splitlines(True),
            new_text.splitlines(True),
            fromfile=str(target),
            tofile=str(target),
        )
    )
    return (("\ufeff" if bom else "") + new_text), diff


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


def answer(
    file: Path,
    directive_type: str,
    request: dict[str, Any],
    *,
    apply: bool = False,
    allow_errors: bool = False,
) -> dict[str, Any]:
    """Preview or apply one entry's update, and report what changed."""
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
