"""Validate a candidate ledger before atomically replacing its entry file."""

from __future__ import annotations

import difflib
import os
import stat
import sys
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from cli import output
from cli.errors import ConflictError, LedgerError


@contextmanager
def lock_file(file: Path) -> Iterator[None]:
    """Serialize CLI writers across atomic replacements of the ledger inode.

    The sidecar must stay in place: unlinking it would let another process
    lock a different inode while a waiting writer still holds the old one.
    """
    with file.with_name(f".{file.name}.bea.lock").open("a+b") as stream:
        if sys.platform == "win32":
            import msvcrt

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


def validate_candidate(candidate: Path, file: Path, *, allow_errors: bool = False) -> list[str]:
    from beancount import loader
    from beancount.core.data import Open
    from beancount.parser.grammar import ParserError, ParserSyntaxError

    entries, errors, _ = loader.load_file(candidate)
    accounts = [entry.account for entry in entries if isinstance(entry, Open)]
    messages = []
    for error in errors:
        message = output.format_ledger_error(error).replace(str(candidate), str(file))
        if "unknown account '" in message:
            account = message.split("unknown account '", 1)[1].split("'", 1)[0]
            matches = difflib.get_close_matches(account, accounts, n=3, cutoff=0.6)
            if matches:
                message += f" Did you mean {', '.join(matches)}?"
        messages.append(message)
    syntax_errors = [err for err in errors if isinstance(err, ParserError | ParserSyntaxError)]
    if errors and (not allow_errors or syntax_errors):
        raise LedgerError("The change would leave the ledger invalid; nothing was written.", details=messages)
    return messages


def appended_content(original: bytes, texts: list[str]) -> str:
    return original.decode("utf-8") + "".join("\n" + text.rstrip() + "\n" for text in texts)


def validate_append(file: Path, texts: list[str], *, allow_errors: bool = False) -> None:
    with candidate_file(file, appended_content(file.read_bytes(), texts)) as candidate:
        validate_candidate(candidate, file, allow_errors=allow_errors)


def replace_checked(file: Path, candidate: Path, original: bytes, original_stat: os.stat_result) -> None:
    """Refuse to overwrite an edit made while validation was running."""
    current = file.stat()
    if (current.st_ino, current.st_mtime_ns, current.st_size) != (
        original_stat.st_ino,
        original_stat.st_mtime_ns,
        original_stat.st_size,
    ) or file.read_bytes() != original:
        raise ConflictError(
            "The ledger changed while the operation was running; nothing was written. Retry the command."
        )
    candidate.chmod(stat.S_IMODE(original_stat.st_mode))
    os.replace(candidate, file)


def append(file: Path, texts: list[str], *, allow_errors: bool = False, expected: bytes | None = None) -> list[str]:
    if not texts:
        return []
    file = file.resolve()
    with lock_file(file):
        original_stat = file.stat()
        original = file.read_bytes()
        if expected is not None and original != expected:
            raise ConflictError("The ledger changed since the preview was prepared; nothing was written. Retry.")
        with candidate_file(file, appended_content(original, texts)) as candidate:
            warnings = validate_candidate(candidate, file, allow_errors=allow_errors)
            replace_checked(file, candidate, original, original_stat)
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
