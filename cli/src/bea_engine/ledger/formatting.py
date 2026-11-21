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

import signal
import sys
import unicodedata
from collections.abc import Callable, Iterator
from contextlib import ExitStack
from pathlib import Path
from typing import Any

from bea_engine.ledger import write
from bea_engine.paths import expand_path
from bea_engine.protocol import EngineError, LedgerError, UsageError

#: The UTF-8 BOM as one character: `compat.UTF8_BOM` is the same mark in bytes.
BOM_CHARACTER = "\ufeff"

# Match the frontend's explicit-width ceiling without importing frontend code.
_MAX_ALIGNMENT_WIDTH = 200

#: Characters `str.splitlines` treats as line breaks besides `\n`.
#: Beancount's lexer counts only `\n`, and upstream's aligner splits with
#: `splitlines`, so a line holding one of these is numbered differently by
#: each — and upstream would turn the character into a newline. A lone `\r`
#: is one of them: inside a comment or a string the lexer reads it as text,
#: and turning it into a line break broke a ledger or changed a payee (w5/355).
_FOREIGN_LINE_BREAKS = frozenset("\r\x0b\x0c\x1c\x1d\x1e\x85\u2028\u2029")


def _universal(text: str) -> str:
    """The text without its BOM and with `\r\n` as `\n`; a lone `\r` is text the lexer reads, so it stays."""
    return text.removeprefix(BOM_CHARACTER).replace("\r\n", "\n")


def _aligner_would_misread(line: str) -> bool:
    """Whether upstream's aligner sees whitespace in `line` that the lexer does not.

    Besides the foreign line breaks, that is a space other than ` ` or tab
    ahead of any comment or string: U+00A0, U+3000 and the like are part of
    an account name to Beancount, while upstream's `\\s+` between account,
    number and currency swallows them — merging two accounts (w5/165). Past a
    `;` or `"` upstream copies the text through, so it stays alignable.

    A balance tolerance is misread the other way: in `balance A 1538 ~ 1 USD`
    upstream takes everything up to the `~` as the prefix and the tolerance as
    the number, so one assertion set the prefix column of the whole file
    (w5/271). Only a dated line can carry a `~` outside a comment or string.
    """
    if not _FOREIGN_LINE_BREAKS.isdisjoint(line):
        return True
    dated = line[:1].isdigit()
    for char in line:
        if char in ';"':
            break
        if char.isspace() and char not in " \t\n":
            return True
        if char == "~" and dated:
            return True
    return False


def _split_lines(text: str) -> list[str]:
    """Split on `\n` alone, keeping the ends — the lexer's idea of a line."""
    lines = [line + "\n" for line in text.split("\n")]
    lines[-1] = lines[-1][:-1]
    return lines if lines[-1] else lines[:-1]


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
    byte is written, in the same global order `append` uses — so two
    concurrent runs, or a run racing an append, queue instead of deadlocking.
    A lock is an open descriptor, so a run with more targets than the process
    may hold open locks each file only while it is read and replaced instead:
    one lock at a time cannot deadlock either (w5/207).
    """
    widths = (prefix_width, num_width, currency_column)
    targets = sorted({expand_path(file, "format").resolve() for file in files})
    if not in_place:
        return {"changed": [str(file) for file in targets if _would_change(file, widths)]}

    from bea_engine import stopping

    changed: list[str] = []
    unchanged: list[str] = []
    stopped: int | None = None
    try:
        with ExitStack() as stack:
            locks = write.lock_order(targets)
            # Each file's directory is locked as well, always after its lock file (w5/181).
            together = write.descriptors_allow(2 * len(locks))
            for file in locks if together else ():
                stack.enter_context(write.lock_file(file))
            if together:
                stack.enter_context(write.lock_directories(targets))
            # Once per directory, not per file: a sweep lists the whole
            # directory, so a flat one of thousands of files went quadratic.
            for directory in dict.fromkeys(file.parent for file in targets):
                write.sweep_abandoned_candidates(directory)
            for file in targets:
                # Once a file is rewritten a stop is only noted, so the run
                # went on rewriting until the frontend's grace period ended
                # in SIGKILL, and nothing said which files had changed
                # (w5/825). A stop now ends it here, reporting both.
                stopped = stopping.requested()
                if stopped is not None:
                    break
                with ExitStack() as each:
                    if not together:
                        each.enter_context(write.lock_file(file))
                        each.enter_context(write.lock_directories([file]))
                    raw, text = _read(file)
                    aligned = _aligned(file, text, widths)
                    if aligned.encode("utf-8") == raw:
                        unchanged.append(str(file))
                        continue
                    original_stat = file.stat()
                    with write.candidate_file(file, aligned) as candidate:
                        write.replace_checked(file, candidate, raw, original_stat)
                        # Record the commit before staging cleanup can fail.
                        changed.append(str(file))
    except (EngineError, OSError) as exc:
        error = exc if isinstance(exc, EngineError) else LedgerError(f"Could not finish in-place formatting: {exc}.")
        completed = {*changed, *unchanged}
        error.result = (error.result or {}) | {
            "formatted": changed,
            "unchanged": unchanged,
            "failed": [] if str(file) in completed else [{"file": str(file), "errors": [str(error), *error.details]}],
            "not_attempted": [str(target) for target in targets if str(target) not in completed and target != file],
        }
        if error is exc:
            raise
        raise error from exc
    if stopped is not None:
        name = signal.Signals(stopped).name
        completed = {*changed, *unchanged}
        raise LedgerError(
            f"Stopped ({name}) before formatting the remaining files.",
            result={
                "formatted": changed,
                "unchanged": unchanged,
                "failed": [],
                "not_attempted": [str(target) for target in targets if str(target) not in completed],
                "stopped": name,
            },
        )
    return {"changed": changed}


def render_file(file: Path, widths: tuple[int | None, int | None, int | None]) -> str:
    """The same formatted text for stdout/output as for an in-place rewrite."""
    from beancount.parser import parser

    from bea_engine.amounts import evaluated_zero_divisor_line, zero_divisor_line
    from bea_engine.query import format_error

    text = _universal(sys.stdin.read()) if str(file) == "-" else _read(file)[1]
    name = "stdin" if str(file) == "-" else str(file)
    line = zero_divisor_line(text)
    if line is None:
        # A divisor the grammar evaluates, like `100/(2-2)`, crashes the
        # parser the literal scan cannot see, so refuse it the same way.
        line = evaluated_zero_divisor_line(text)
    if line is not None:
        errors = [
            f"{name}:{line}: Division by zero in an amount expression; Beancount's parser crashes on a "
            "zero divisor, so this file was not parsed."
        ]
    else:
        # Parse exactly the text we will align, without loading includes or
        # executing plugins. Read NFC as every engine file parser does, while
        # preserving the user's spelling in the formatted output.
        _, parsed_errors, _ = parser.parse_string(unicodedata.normalize("NFC", text), report_filename=name)
        errors = [format_error(error) for error in parsed_errors]
    if errors:
        raise LedgerError(f"Cannot format {name}: syntax errors; nothing was written.", details=errors)
    return _aligned(file, text, widths)


def _would_change(file: Path, widths: tuple[int | None, int | None, int | None]) -> bool:
    """Whether a rewrite would change `file`, without touching it."""
    raw, text = _read(file)
    return _aligned(file, text, widths).encode("utf-8") != raw


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
    return raw, _universal(text)


def _aligned(file: Path, text: str, widths: tuple[int | None, int | None, int | None]) -> str:
    """Align real postings while preserving metadata indents and string content."""
    text = _universal(text)
    lines = _split_lines(text)
    continued, postings = _string_and_posting_lines(text)
    for index in postings:
        lines[index] = "  " + lines[index].lstrip(" \t")
    # Shield continuation lines even when they look like postings, so
    # upstream's regex aligner neither rewrites them nor uses them to choose
    # alignment widths.
    protected = {index: lines[index] for index in continued}
    for index, line in enumerate(lines):
        if _aligner_would_misread(line):
            # Upstream would split this line where the lexer does not, or
            # delete a space the lexer reads as text; keep it whole and out
            # of the aligner instead.
            protected[index] = line
    for index in protected:
        lines[index] = ";\n"

    try:
        aligned = align_text("".join(lines), *widths)
    except AssertionError as exc:
        # Upstream asserts that it changed nothing but whitespace. Its own
        # message is both halves of the file, which is no use in an envelope.
        raise LedgerError(
            f"bean-format could not align {file}: it would have changed more than whitespace. Nothing was written.",
            traceback=str(exc)[:2000],
        ) from None
    formatted = _split_lines(aligned)
    for index, original in protected.items():
        # Normalize the whole trailing CR run before restoring one LF. Leaving
        # a CR beside that LF would lose another CR on each later format pass.
        formatted[index] = original.removesuffix("\n").rstrip("\r") + "\n"
    return "".join(formatted)


def _string_and_posting_lines(text: str) -> tuple[set[int], set[int]]:
    """Zero-based indices (lines split on `\\n`) that continue a multi-line string, and that open a posting.

    A STRING token names its closing line, so the lines before it back to its
    opening one are string content. A posting is an indented line whose first
    token, after any flag, is an account: metadata nested under it is not one.
    """
    from beancount.parser.lexer import lex_iter_string

    lex: Callable[[str], Iterator[tuple[str, int, bytes, object]]] = lex_iter_string
    continued: set[int] = set()
    postings: set[int] = set()
    indented: int | None = None
    for kind, lineno, raw, _ in lex(text):
        if kind == "STRING":
            continued.update(range(lineno - raw.count(b"\n"), lineno))
        if kind == "INDENT":
            indented = lineno
        elif kind in {"FLAG", "ASTERISK", "HASH", "CAPITAL"} and indented == lineno:
            continue
        else:
            if kind == "ACCOUNT" and indented == lineno:
                postings.add(lineno - 1)
            indented = None
    return continued, postings


def string_continuation_lines(text: str) -> set[int]:
    """Zero-based indices (lines split on `\\n`) that continue a multi-line string.

    Text there is string content, however much it looks like a posting, so
    neither indentation nor alignment may touch it.
    """
    return _string_and_posting_lines(text)[0]


def posting_lines(text: str) -> set[int]:
    """Zero-based indices (lines split on `\\n`) of the posting lines `bea format` indents by two spaces."""
    return _string_and_posting_lines(text)[1]


def align_protected(text: str) -> str:
    """`align_text` for `\\n`-separated text, leaving string content and foreign whitespace alone.

    String continuation lines and lines holding a character `splitlines`
    would break on, or a foreign space upstream would swallow, are swapped for
    a comment while upstream aligns, then put back verbatim — the line count
    is unchanged either way (w1/136).
    """
    lines = text.split("\n")
    protected = string_continuation_lines(text) | {
        index for index, line in enumerate(lines) if _aligner_would_misread(line)
    }
    shielded = [";" if index in protected else line for index, line in enumerate(lines)]
    aligned = align_text("\n".join(shielded)).split("\n")
    return "\n".join(lines[index] if index in protected else line for index, line in enumerate(aligned))


def align_text(
    text: str,
    prefix_width: int | None = None,
    num_width: int | None = None,
    currency_column: int | None = None,
) -> str:
    """Use native alignment without letting one oversized value widen every row."""
    import regex
    from beancount.core import account, amount
    from beancount.scripts import format as upstream

    if not currency_column and (not prefix_width or not num_width):
        # The pinned aligner exposes no width-discovery helper. Match exactly
        # what it measures, including dated directives, before it allocates
        # padding. Values wider than the ceiling retain their natural width.
        pattern = (
            rf'(^\d[^";]*?|\s+{account.ACCOUNT_RE})\s+'
            rf"({upstream.PARENTHESIZED_BINARY_OP_RE}|{upstream.NUMBER_RE})\s+"
            rf"((?:{amount.CURRENCY_RE})\b.*)"
        )
        automatic_prefix = automatic_number = 0
        for line in text.splitlines():
            match = regex.match(pattern, line)
            if match is None:
                continue
            prefix, number, _ = match.groups()
            if len(prefix) <= _MAX_ALIGNMENT_WIDTH:
                automatic_prefix = max(automatic_prefix, len(prefix))
            if len(number) <= _MAX_ALIGNMENT_WIDTH:
                automatic_number = max(automatic_number, len(number))
        prefix_width = prefix_width or automatic_prefix or _MAX_ALIGNMENT_WIDTH
        num_width = num_width or automatic_number or _MAX_ALIGNMENT_WIDTH
    align: Callable[[str, int | None, int | None, int | None], str] = upstream.align_beancount
    return align(text, prefix_width, num_width, currency_column)
