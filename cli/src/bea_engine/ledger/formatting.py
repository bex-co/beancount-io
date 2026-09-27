"""Align ledger files the way `bean-format` does — locked, and one atomic replace.

Formatting used to happen in the frontend around `bean-format --in-place`: the
user's own file was handed to upstream, which truncates it and writes the
aligned text back, and then the frontend rewrote it a second time for the
canonical posting indent. Neither write was staged and neither took the ledger
lock, so an interrupt could leave the file empty (w3/435) and a concurrent
`bea add` that had already reported success could be silently discarded
(w3/434).

Upstream's alignment is a pure text transformation — `align_beancount` *is*
`bean-format`, which deliberately does not parse — so the engine runs it in
memory and reuses the discipline every other writer here already has: read and
align under `lock_file`, stage into a `candidate_file` beside the original,
`os.replace` it over the target. The file is read but never written until the
last step, so it never passes through zero bytes and never holds a half-applied
formatting pass.

The same comparison answers `bea format --check` / `--dry-run`, so the report
and the rewrite can never disagree about what would change.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from contextlib import ExitStack
from pathlib import Path
from typing import Any

from bea_engine.ledger import write
from bea_engine.protocol import EngineError, LedgerError, UsageError

#: The UTF-8 BOM as one character: `compat.UTF8_BOM` is the same mark in bytes.
BOM_CHARACTER = "\ufeff"


def format_files(
    files: list[Path],
    *,
    in_place: bool,
    prefix_width: int | None,
    num_width: int | None,
    currency_column: int | None,
) -> dict[str, Any]:
    """Which files alignment would change, rewriting them when `in_place`.

    Targets are resolved and sorted, and every lock is taken before the first
    byte is written, in that same ascending order `append` uses — so two
    concurrent runs, or a run racing an append, queue instead of deadlocking.
    """
    widths = (prefix_width, num_width, currency_column)
    targets = sorted({file.expanduser().resolve() for file in files})
    if not in_place:
        return {"changed": [str(file) for file in targets if _would_change(file, widths)]}

    changed: list[str] = []
    with ExitStack() as stack:
        for file in targets:
            stack.enter_context(write.lock_file(file))
        try:
            for file in targets:
                write.sweep_abandoned_candidates(file.parent)
                if _rewrite(file, widths):
                    changed.append(str(file))
        except EngineError as exc:
            # A batch that rewrote three of five files says which three: it is
            # the one thing the caller cannot recover by re-reading the ledger.
            exc.result = {"formatted": changed}
            raise
    return {"changed": changed}


def canonical_posting_indent(text: str) -> str:
    """Normalize tab / single-space posting indents to the usual two spaces.

    Upstream bean-format turns tabs into one ASCII space and then treats that
    as already formatted. Agents and docs use two spaces; rewrite leftover
    odd indents so --check stays honest.
    """
    lines: list[str] = []
    for line in text.splitlines(keepends=True):
        match = re.match(r"^([ \t]+)(.*)$", line)
        if match and match.group(1) != "  ":
            rest = match.group(2)
            if rest and not re.match(r"^\d{4}-\d{2}-\d{2}\b", rest):
                ending = "\n" if line.endswith("\n") else ""
                body = line[: -len(ending)] if ending else line
                lines.append("  " + body.lstrip(" \t") + ending)
                continue
        lines.append(line)
    return "".join(lines)


def _rewrite(file: Path, widths: tuple[int | None, int | None, int | None]) -> bool:
    """Replace `file` with its aligned bytes, atomically; False when already aligned."""
    raw, text = _read(file)
    aligned = _aligned(file, text, widths)
    if aligned.encode("utf-8") == raw:
        return False
    original_stat = file.stat()
    with write.candidate_file(file, aligned) as candidate:
        write.replace_checked(file, candidate, raw, original_stat)
    return True


def _would_change(file: Path, widths: tuple[int | None, int | None, int | None]) -> bool:
    """Whether a rewrite would change `file`, without touching it."""
    raw, text = _read(file)
    if raw != text.encode("utf-8"):
        # A byte alignment cannot see: a BOM upstream cannot parse at all.
        return True
    # Both sides canonicalized, because an odd indent is not an alignment
    # difference: upstream leaves it alone and the pass below fixes it.
    return _aligned(file, text, widths) != canonical_posting_indent(text)


def _read(file: Path) -> tuple[bytes, str]:
    """The file's bytes, and the text alignment sees.

    The mark is an encoding declaration rather than content, and line endings
    arrive universal — upstream reads its files in text mode, and its own
    whitespace-only sanity check rejects a carriage return that survived. Both
    normalizations are byte differences, which is why the raw bytes come back
    too: they are what says whether the file needs rewriting.
    """
    from bea_engine.ledger.text import decode_error_message

    try:
        raw = file.read_bytes()
    except OSError as exc:
        raise UsageError(f"Could not read {file}: {exc.strerror or exc}.") from exc
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise LedgerError(decode_error_message(file, exc)) from exc
    return raw, text.removeprefix(BOM_CHARACTER).replace("\r\n", "\n").replace("\r", "\n")


def _aligned(file: Path, text: str, widths: tuple[int | None, int | None, int | None]) -> str:
    """Upstream's alignment plus the canonical posting indent, in memory."""
    from beancount.scripts import format as upstream

    align: Callable[[str, int | None, int | None, int | None], str] = upstream.align_beancount
    try:
        aligned = align(text, *widths)
    except AssertionError as exc:
        # Upstream asserts that it changed nothing but whitespace. Its own
        # message is both halves of the file, which is no use in an envelope.
        raise LedgerError(
            f"bean-format could not align {file}: it would have changed more than whitespace. Nothing was written.",
            traceback=str(exc)[:2000],
        ) from None
    return canonical_posting_indent(aligned)
