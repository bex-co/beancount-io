"""Validate a candidate ledger before atomically replacing its entry file."""

from __future__ import annotations

import difflib
import glob
import hashlib
import os
import re
import shlex
import stat
import sys
import tempfile
from collections import Counter
from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cli import output
from cli.config import cache_dir
from cli.errors import AuthError, ConflictError, LedgerError, UsageError


def destination(root: Path, into: Path | None = None) -> Path:
    """Destinations are relative to the root ledger, independently of cwd."""
    return (root.parent / into.expanduser()).resolve() if into is not None else root.resolve()


def _includes(content: bytes) -> Iterator[tuple[int, int, str]]:
    from beancount.parser.lexer import lex_iter_string

    starts = [0]
    for line in content.splitlines(keepends=True):
        starts.append(starts[-1] + len(line))
    pending = False
    for kind, line, text, value in lex_iter_string(content):  # type: ignore[no-untyped-call]
        if pending and kind == "STRING":
            start = content.find(text, starts[line - 1])
            if start < 0:
                raise UsageError("Cannot locate an include path in the ledger.")
            yield start, start + len(text), value
        pending = kind == "INCLUDE"


@dataclass
class LedgerSnapshot:
    """Freeze the root and its include graph for validation and conflict checks."""

    root: Path
    contents: dict[Path, bytes] = field(default_factory=dict)
    stats: dict[Path, os.stat_result] = field(default_factory=dict)
    patterns: dict[str, tuple[Path, ...]] = field(default_factory=dict)

    @classmethod
    def capture(cls, root: Path) -> LedgerSnapshot:
        snapshot = cls(root.resolve())
        pending = [snapshot.root]
        while pending:
            path = pending.pop(0)
            if path in snapshot.contents:
                continue
            snapshot.stats[path] = path.stat()
            content = snapshot.contents[path] = path.read_bytes()
            for _, _, name in _includes(content):
                pattern = str(path.parent / name)
                matches = tuple(sorted(Path(p).absolute() for p in glob.glob(pattern, recursive=True)))
                snapshot.patterns[pattern] = matches
                pending.extend(matches)
        return snapshot

    def require_target(self, target: Path) -> None:
        if not any(path.resolve() == target for path in self.contents):
            raise UsageError(
                f"Write destination {target} is not included by {self.root}. "
                "Create it and add an include directive to the root first."
            )

    def verify(self) -> None:
        for path, original in self.contents.items():
            try:
                current = path.stat()
                before = self.stats[path]
                changed = (current.st_ino, current.st_mtime_ns, current.st_size) != (
                    before.st_ino,
                    before.st_mtime_ns,
                    before.st_size,
                ) or path.read_bytes() != original
            except OSError:
                changed = True
            if changed:
                raise ConflictError(f"The ledger changed during the operation: {path}. Nothing was written; retry.")
        for pattern, before_paths in self.patterns.items():
            current_paths = tuple(sorted(Path(p).absolute() for p in glob.glob(pattern, recursive=True)))
            if current_paths != before_paths:
                raise ConflictError(f"The included files changed: {pattern}. Nothing was written; retry.")

    @contextmanager
    def staged(self, candidate: Path, target: Path) -> Iterator[tuple[Path, dict[Path, Path]]]:
        """Keep each staged file beside its source so documents/plugins retain their paths."""
        from beancount.utils import misc_utils

        escape_string: Callable[[str], str] = misc_utils.escape_string

        with ExitStack() as stack:
            paths = {path: stack.enter_context(candidate_file(path, "")) for path in self.contents}
            for path, original in self.contents.items():
                content = candidate.read_bytes() if path.resolve() == target else original
                for start, end, name in reversed(list(_includes(content))):
                    matches = self.patterns.get(str(path.parent / name), ())
                    if matches:
                        replacement = "\ninclude ".join(f'"{escape_string(str(paths[p]))}"' for p in matches)
                        content = content[:start] + replacement.encode() + content[end:]
                paths[path].write_bytes(content)
            yield paths[self.root], {staged: original for original, staged in paths.items()}


@contextmanager
def lock_file(file: Path) -> Iterator[None]:
    """Serialize CLI writers across atomic replacements of the ledger inode.

    The cached lock must stay in place: unlinking it would let another process
    lock a different inode while a waiting writer still holds the old one.
    """
    directory = cache_dir() / "locks"
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    key = hashlib.sha256(os.path.normcase(str(file.resolve())).encode()).hexdigest()
    fd = os.open(directory / f"{key}.lock", os.O_RDWR | os.O_CREAT, 0o600)
    with os.fdopen(fd, "r+b") as stream:
        if sys.platform == "win32":
            import msvcrt

            if not os.fstat(stream.fileno()).st_size:
                stream.write(b"\0")
                stream.flush()
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl

            fcntl.flock(stream.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            if sys.platform == "win32":
                stream.seek(0)
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


@contextmanager
def candidate_file(file: Path, content: str) -> Iterator[Path]:
    """Keep relative includes and documents relative to the original directory."""
    fd, name = tempfile.mkstemp(prefix=".bea-", suffix=".tmp", dir=file.parent)
    candidate = Path(name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        yield candidate
    finally:
        candidate.unlink(missing_ok=True)
        Path(str(candidate) + ".picklecache").unlink(missing_ok=True)


def _balance_recovery_hints(
    balance: Any, source: Path, root: Path, entries: list[Any], options: dict[str, Any], snapshot: LedgerSnapshot | None
) -> list[str]:
    import datetime

    from beancount.core.data import Close, Open

    original = snapshot.contents.get(source, b"") if snapshot else b""
    if balance.meta.get("lineno", 0) <= len(original.splitlines()):
        return [
            f"Review transactions against the existing assertion at {source}:{balance.meta['lineno']}. "
            "Correct missing transactions or edit that assertion; adding another balance would duplicate it."
        ]
    if balance.date == datetime.date.min:
        return ["Review the assertion date: an opening adjustment needs an earlier pad date."]
    pad_date = balance.date - datetime.timedelta(days=1)
    active: dict[str, list[str] | None] = {}
    for entry in entries:
        if entry.date > pad_date:
            break
        if isinstance(entry, Open):
            active[entry.account] = entry.currencies
        elif isinstance(entry, Close):
            active.pop(entry.account, None)
    if balance.account not in active:
        return [
            f"Review the assertion date: {balance.account} must be open on an earlier day to use --pad-from. "
            "Balance assertions run at the start of the day."
        ]
    source_account = f"{options['name_equity']}:OpeningBalances"
    allowed_currencies = active.get(source_account)
    if (
        source_account not in active
        or source_account == balance.account
        or (allowed_currencies and balance.amount.currency not in allowed_currencies)
    ):
        source_account = "SOURCE_ACCOUNT"
    tolerance = f" ~ {balance.tolerance:f}" if balance.tolerance is not None else ""
    amount = f"{balance.amount.number:f}{tolerance} {balance.amount.currency}"
    command = [
        "bea",
        "--file",
        str(root),
        "add",
        "balance",
        "--date",
        balance.date.isoformat(),
        "--account",
        balance.account,
        "--amount",
        amount,
        "--pad-from",
        source_account,
    ]
    if source.resolve() != root.resolve():
        command.extend(["--into", os.path.relpath(source, root.parent)])
    hints = [
        "Review missing transactions first. The following command creates an intentional opening adjustment.",
        "Opening adjustment command: " + shlex.join(command),
    ]
    if source_account == "SOURCE_ACCOUNT":
        hints.append(
            f"Replace SOURCE_ACCOUNT with the intended adjustment source, active on {pad_date} "
            f"and allowing {balance.amount.currency}."
        )
    return hints


def validate_candidate(
    candidate: Path, file: Path, *, allow_errors: bool = False, snapshot: LedgerSnapshot | None = None
) -> list[str]:
    from beancount import loader
    from beancount.core import interpolate
    from beancount.core.data import Balance, Close, Document, Open, Pad, Transaction
    from beancount.parser.grammar import ParserError, ParserSyntaxError
    from beancount.parser.lexer import LexerError

    if snapshot is None:
        entries, errors, options = loader.load_file(candidate)
        filenames = {candidate: file}
    else:
        with snapshot.staged(candidate, file) as (root, filenames):
            entries, errors, options = loader.load_file(root)
    accounts = [entry.account for entry in entries if isinstance(entry, Open)]
    messages = []
    invalid_pad_accounts = False
    for error in errors:
        hints = []
        message = output.format_ledger_error(error)
        for staged, original in filenames.items():
            message = message.replace(str(staged), str(original))
        if "unknown account '" in message:
            account = message.split("unknown account '", 1)[1].split("'", 1)[0]
            matches = difflib.get_close_matches(account, accounts, n=3, cutoff=0.6)
            if matches:
                message += f" Did you mean {', '.join(matches)}?"
            message += f" To create it, use bea add open --account {shlex.quote(account)} --date YYYY-MM-DD."
        if "inactive account '" in message:
            account = message.split("inactive account '", 1)[1].split("'", 1)[0]
            for entry in entries:
                if isinstance(entry, Open | Close) and entry.account == account:
                    location = str(entry.meta.get("filename", ""))
                    for staged, original in filenames.items():
                        location = location.replace(str(staged), str(original))
                    state = "opened" if isinstance(entry, Open) else "closed"
                    message += f" Account {state} {entry.date} at {location}:{entry.meta.get('lineno')}."
            message += (
                " Correct the transaction date or edit that directive; for new books use bea init --date YYYY-MM-DD."
            )
        if isinstance(error.entry, Pad) and error.message.startswith("Invalid reference to "):
            invalid_pad_accounts = True
            hints.append("Pad accounts must be active, even with --allow-errors.")
        if isinstance(error.entry, Transaction) and "does not balance" in error.message:
            residual = interpolate.compute_residual(error.entry.postings)  # type: ignore[no-untyped-call]
            if len(residual.currencies()) > 1:
                hints.append(
                    "For a currency exchange, use a price annotation with the actual exchange rate: "
                    "for example, '100 EUR @ 1.08 USD' balances against '-108 USD'."
                )
        source = Path(error.source.get("filename", str(candidate)))
        source = filenames.get(source, source)
        if isinstance(error.entry, Document) and "File does not exist" in error.message:
            hints.append(
                f"Relative document paths resolve from {source.parent}, the directory containing {source.name}."
            )
        if "Unused Pad" in message:
            message += (
                " Add both directives atomically with bea add balance --pad-from ACCOUNT"
                " --date YYYY-MM-DD --amount 'NUMBER CURRENCY' --account ACCOUNT."
            )
        elif isinstance(error.entry, Balance) and "Balance failed" in error.message:
            if allow_errors:
                hints.append(
                    "Review this assertion and missing transactions before further writes; it still fails validation."
                )
            else:
                hints.extend(
                    _balance_recovery_hints(
                        error.entry, source, snapshot.root if snapshot else file, entries, options, snapshot
                    )
                )
        messages.append(message)
        messages.extend(hints)
    syntax_errors = [err for err in errors if isinstance(err, ParserError | ParserSyntaxError | LexerError)]
    if errors and (not allow_errors or syntax_errors or invalid_pad_accounts):
        raise LedgerError("The change would leave the ledger invalid; nothing was written.", details=messages)
    return messages


def _destination_style(content: bytes) -> tuple[str, int | None]:
    """Posting indentation and amount column observed in the existing entries.

    Falls back to two spaces and the appended block's own width when the
    destination has no postings yet. `bea format` stays the only command that
    realigns existing lines; appends only ever add lines.
    """
    indents: Counter[str] = Counter()
    columns: Counter[int] = Counter()
    for line in content.decode("utf-8").splitlines():
        match = re.match(r"^(\s+)(\S+)( +).*$", line)
        if not match:
            continue
        lead, head, gap = match.groups()
        if "\t" in lead:
            continue
        indents[lead] += 1
        if ":" in head and not head.endswith(":") and len(gap) >= 2:
            columns[len(lead) + len(head) + len(gap)] += 1
    return (indents.most_common(1)[0][0] if indents else "  ", columns.most_common(1)[0][0] if columns else None)


def _align_block(texts: list[str], indent: str, column: int | None) -> list[str]:
    """Render appended entries in the destination's style without touching it.

    Continuation lines take the destination's indentation; posting amounts
    align to the destination's amount column when the block fits, otherwise
    the block aligns within itself.
    """
    parsed: list[list[tuple[str, str, str]]] = []
    widest = 0
    for text in texts:
        block: list[tuple[str, str, str]] = []
        for index, line in enumerate(text.rstrip().splitlines()):
            match = None if index == 0 else re.match(r"^\s*(\S+)(  +)(\S.*)$", line)
            if match and ":" in match.group(1) and not match.group(1).endswith(":"):
                widest = max(widest, len(match.group(1)))
                block.append(("posting", match.group(1), match.group(3)))
            elif index == 0 or not line.strip() or not line[0].isspace():
                # A continuation at column zero is content (a wrapped note
                # comment), not structure: only re-indent indented lines.
                block.append(("verbatim", line, ""))
            else:
                block.append(("indented", line.strip(), ""))
        parsed.append(block)
    target = column
    if target is None or len(indent) + widest + 2 > target:
        target = len(indent) + widest + 2
    rendered = []
    for block in parsed:
        lines = []
        for kind, first, second in block:
            if kind == "posting":
                lines.append(f"{indent}{first}{' ' * (target - len(indent) - len(first))}{second}")
            elif kind == "indented":
                lines.append(f"{indent}{first}")
            else:
                lines.append(first)
        rendered.append("\n".join(lines))
    return rendered


def appended_content(original: bytes, texts: list[str]) -> str:
    if not texts:
        return original.decode("utf-8")
    indent, column = _destination_style(original)
    blocks = _align_block(texts, indent, column)
    return original.decode("utf-8") + "".join("\n" + block + "\n" for block in blocks)


def validate_append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
) -> None:
    snapshot = snapshot or LedgerSnapshot.capture(file)
    target = destination(file, into)
    snapshot.require_target(target)
    with candidate_file(target, appended_content(target.read_bytes(), texts)) as candidate:
        validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
    snapshot.verify()


def require_writable(file: Path) -> None:
    """Respect file permissions even though rename only needs directory access."""
    if not file.stat().st_mode & (stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH) or not os.access(file, os.W_OK):
        raise AuthError(
            f"Ledger file is read-only or not writable: {file}. "
            "Change its permissions explicitly before retrying; nothing was written."
        )


def replace_checked(file: Path, candidate: Path, original: bytes, original_stat: os.stat_result) -> None:
    """Refuse to overwrite an edit made while validation was running."""
    require_writable(file)
    current = file.stat()
    if (current.st_ino, current.st_mtime_ns, current.st_size, current.st_mode) != (
        original_stat.st_ino,
        original_stat.st_mtime_ns,
        original_stat.st_size,
        original_stat.st_mode,
    ) or file.read_bytes() != original:
        raise ConflictError(
            "The ledger changed while the operation was running; nothing was written. Retry the command."
        )
    candidate.chmod(stat.S_IMODE(original_stat.st_mode))
    os.replace(candidate, file)


def append(
    file: Path,
    texts: list[str],
    *,
    allow_errors: bool = False,
    expected: bytes | None = None,
    into: Path | None = None,
    snapshot: LedgerSnapshot | None = None,
) -> list[str]:
    if not texts:
        return []
    file = file.resolve()
    target = destination(file, into)
    with ExitStack() as stack:
        for path in sorted({file, target}):
            stack.enter_context(lock_file(path))
        snapshot = snapshot or LedgerSnapshot.capture(file)
        snapshot.require_target(target)
        snapshot.verify()
        require_writable(target)
        original_stat = target.stat()
        original = target.read_bytes()
        if expected is not None and original != expected:
            raise ConflictError("The ledger changed since the preview was prepared; nothing was written. Retry.")
        with candidate_file(target, appended_content(original, texts)) as candidate:
            warnings = validate_candidate(candidate, target, allow_errors=allow_errors, snapshot=snapshot)
            snapshot.verify()
            replace_checked(target, candidate, original, original_stat)
    return warnings


def metadata_for_write(meta: dict[str, Any]) -> dict[str, Any]:
    """Restore typed JSON metadata; source locations never become ledger metadata."""
    import datetime
    from decimal import Decimal, InvalidOperation

    from beancount.core.amount import Amount

    result = {}
    for key, value in meta.items():
        if key in {"filename", "lineno"} or key.startswith("__"):
            continue
        if isinstance(value, dict):
            kind = value.get("kind")
            try:
                if kind == "number":
                    value = Decimal(value["value"])
                elif kind == "date":
                    value = datetime.date.fromisoformat(value["value"])
                elif kind == "amount":
                    value = Amount(Decimal(value["number"]), value["currency"])
                else:
                    raise LedgerError(f"Unsupported metadata value for {key!r}.")
            except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
                raise LedgerError(f"Invalid {kind!r} metadata for {key!r}: {exc}") from exc
        result[key] = value
    return result
