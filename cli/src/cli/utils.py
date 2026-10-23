from __future__ import annotations

import os
import re
import secrets
import stat
import sys
import unicodedata
import warnings
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date as Date
from pathlib import Path
from typing import Any

import typer
from typer._click.types import ParamType

from cli.errors import AuthError, LedgerError, UsageError
from cli.paths import is_descriptor_path

#: The engine twin (`bea_engine.ledger.text.CONTROL_CHARACTERS`) carries the
#: same pattern and the full reasoning; neither side may import the other.
CONTROL_CHARACTERS = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]")


def single_line(text: str) -> str:
    """Keep text readable as one table cell, and inert as one terminal line.

    Runs of CR/LF become a space; every other control character is escaped to a
    visible `\\xNN`. Table cells carry untrusted text — an imported bank
    description is the obvious case — and `output.table` writes them straight
    to the terminal, where a raw `\\x1b[1A\\x1b[2K` would erase the row above
    and make the import preview disagree with the file it is previewing.

    Escaping rather than deleting keeps the oddity visible, and escaping tabs
    along with the rest is what makes a cell occupy exactly one grid column
    span. The engine twin (`bea_engine.ledger.text.single_line`) must agree,
    and a test pins that it does.
    """
    return _escape_controls(re.sub(r"[\r\n]+", " ", text))


def inert_text(text: str) -> str:
    """The same neutralization for text that is allowed to span several lines.

    A proposed directive and a model's answer are multi-line by nature, so
    `single_line` would destroy them — but they carry exactly the same hazard
    that `single_line` exists for, and more sharply: the `ask` approval panel is
    the only gate between AI-proposed text and the user's books, so the text
    being approved must not be able to repaint the panel asking about it.

    Line breaks are kept (CRLF and lone CR normalized to LF, so a stray CR
    cannot return the cursor to the start of the line it was just shown on);
    every other control character becomes a visible `\\xNN`, as `single_line`
    does, for the same reason — the oddity stays legible instead of vanishing.
    """
    return _escape_controls(re.sub(r"\r\n?", "\n", text))


def _escape_controls(text: str) -> str:
    """Every control character as a visible `\\xNN` (`\\uNNNN` past Latin-1). The one place that mapping lives."""
    return CONTROL_CHARACTERS.sub(_visible_escape, text)


def _visible_escape(match: re.Match[str]) -> str:
    code = ord(match.group())
    return f"\\x{code:02x}" if code < 0x100 else f"\\u{code:04x}"


UTF8_BOM = b"\xef\xbb\xbf"
"""The three bytes several Windows editors prepend to a UTF-8 ledger.

The engine twin (`bea_engine.compat.UTF8_BOM`) carries the same value;
neither side may import the other, so the constant is repeated, not shared.
"""


def has_bom(path: Path) -> bool:
    """Whether the file at `path` starts with a UTF-8 byte-order mark."""
    try:
        with open(path, "rb") as stream:
            return stream.read(len(UTF8_BOM)) == UTF8_BOM
    except OSError:
        return False


def decode_error_message(path: object, exc: UnicodeDecodeError, data: bytes | None = None) -> str:
    """A decode failure as path, byte offset, attempted encoding, and remedy.

    The engine twin (`bea_engine.ledger.text.decode_error_message`) carries
    the same wording; neither side may import the other, so the helper is
    repeated, not shared. Callers choose the category: a caller's input file
    is a usage error, an undecodable ledger is a validation error.

    Pass the raw bytes when the failing decode used `utf-8-sig`: the codec
    strips a leading BOM, so the offset is quoted against the raw bytes
    (w5/738). Callers decoding plain `utf-8` pass nothing — a BOM decodes
    there as an ordinary character, so their offsets are already raw.
    """
    base = len(UTF8_BOM) if data is not None and data.startswith(UTF8_BOM) else 0
    offset = exc.start + base
    return f"Cannot decode '{path}' as UTF-8: {exc.reason} at byte {offset}. Re-save the file as UTF-8 and retry."


def refuse_blank_filter(flag: str, value: str | None) -> None:
    """Reject an empty or whitespace-only filter value as a usage error.

    An empty filter is almost always a template hole or an unset shell
    variable, and a substring test would silently match every row — so the
    caller is told which flag was empty rather than handed a full result set.
    `list`, `report`, and `balance` all validate through this one helper so
    the behavior cannot drift between them.
    """
    if value is not None and not value.strip():
        raise UsageError(f"{flag} needs a non-empty value; drop {flag} to leave it unset.")


_PADDING = " \t\r\n\f\v"


def strip_padding(value: str) -> str:
    """The value without the ASCII whitespace a shell or a paste adds around it.

    Not `str.strip()`: that also removes the Unicode spaces (NBSP, U+3000,
    U+202F) an account name may end with, so `Assets:Cash\u00a0` selected the
    other account (w5/956).
    """
    return value.strip(_PADDING)


def account_filter(flag: str, value: str | None) -> str | None:
    """An `--account` value as it is matched: stripped, and refused when it can never match.

    The blank check tested the stripped value while the raw one was matched,
    so `-a " Assets:Cash"` matched nothing with exit 0. And Click reads
    `-a=Food` as the value `=Food`, which no account name holds (w5/626).
    """
    refuse_blank_filter(flag, value)
    if value is None:
        return None
    stripped = strip_padding(value)
    if stripped.startswith("="):
        name = stripped.lstrip("=")
        raise UsageError(
            f"{flag} {value!r} starts with '=', which no account name holds: a short option takes its value "
            f"after a space. Write -a {name} or --account={name}."
        )
    return stripped


def fold_account(name: str) -> str:
    """The key two account names must share to match in a filter.

    The engine twin (`bea_engine.ledger.text.fold_account`) carries the full
    reasoning; the short of it is that NFC and NFD spellings of one account
    name render identically, so comparing them raw makes a filter miss an
    account the user can see. Neither side may import the other, and a filter
    applied here must agree with the one applied there.
    """
    turkish = unicodedata.normalize("NFC", name).replace("İ", "i").replace("ı", "i")
    return unicodedata.normalize("NFC", turkish.casefold().replace("i\u0307", "i"))


def owner_and_name(full_name: str) -> tuple[str, str]:
    """REST addresses a ledger as `{owner}/{name}` — two segments, exactly.

    Each segment is checked against the spec's own path-parameter pattern, not
    just for presence: percent-encoding leaves `.` intact and httpx removes dot
    segments client-side, so `../account` would otherwise address
    `/api-gateway/v1/account` — a different endpoint, never a ledger.
    """
    owner, _, name = full_name.partition("/")
    if not owner or not name or "/" in name:
        raise UsageError(f"'{full_name}' is not a ledger full name; expected 'owner/name'.")
    if not _LEDGER_OWNER.fullmatch(owner) or owner in {".", ".."}:
        raise UsageError(
            f"'{full_name}' is not a ledger full name; the owner '{owner}' must use letters, digits, "
            "dots, hyphens and underscores, and cannot be '.' or '..'."
        )
    if not _LEDGER_NAME.fullmatch(name) or len(name) > _LEDGER_NAME_MAX:
        raise UsageError(
            f"'{full_name}' is not a ledger full name; the name '{name}' must use lowercase letters, digits, "
            f"hyphens and underscores, at most {_LEDGER_NAME_MAX} characters."
        )
    return owner, name


# The server accepts exactly these, in REST v1 and in GraphQL alike (the v1
# spec's `owner`/`name` path patterns). Keep them in step: a stricter rule here
# would refuse a name the service would have taken.
_LEDGER_OWNER = re.compile(r"^[A-Za-z0-9_.-]+$")
_LEDGER_NAME = re.compile(r"^[a-z0-9_-]+$")
_LEDGER_NAME_MAX = 100


def ledger_name(name: str) -> str:
    """A hosted ledger name, checked against the service's own slug rule.

    Checked locally so a malformed name is a usage error with the rule in it,
    rather than an authentication failure that never mentions the name — the
    same reason `owner_and_name` runs before credentials are touched.
    """
    if _LEDGER_NAME.fullmatch(name) and len(name) <= _LEDGER_NAME_MAX:
        return name
    rule = (
        f"Ledger names use lowercase letters, digits, hyphens and underscores, at most {_LEDGER_NAME_MAX} characters."
    )
    suggestion = re.sub(r"^[-_]+|[-_]+$", "", re.sub(r"[^a-z0-9_-]+", "-", name.lower()))[:_LEDGER_NAME_MAX]
    if suggestion and suggestion != name:
        rule += f" Try '{suggestion}'."
    raise UsageError(f"'{name}' is not a valid ledger name. {rule}")


def snake_case(name: str) -> str:
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name).lower()


def snake_keys(data: dict[str, Any]) -> dict[str, Any]:
    """Wire camelCase → the snake_case keys the CLI's JSON envelope documents."""
    return {snake_case(key): value for key, value in data.items()}


def parse_date(date_str: str) -> Date:
    """A `YYYY-MM-DD` calendar date only.

    `date.fromisoformat` also reads ISO basic (`20260102`) and week dates
    (`2026-W01-1` is 2025-12-29), so a typo could start books in another year.
    The engine holds JSON dates to the same rule (`bea_engine.ledger.text`).
    """
    if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", date_str):
        raise typer.BadParameter(f"Invalid date '{date_str}'. Use YYYY-MM-DD format.")
    try:
        return Date.fromisoformat(date_str)
    except ValueError as err:
        # Already YYYY-MM-DD: a format hint sent `2027-02-29` back to the
        # format it had (w5/330). Say the day does not exist.
        raise typer.BadParameter(f"Invalid date '{date_str}': not a calendar date ({err}).") from err


_URL = re.compile(r"[a-z][a-z0-9+.-]*://", re.IGNORECASE)


def refuse_empty_path(value: Any, param: Any) -> None:
    """Refuse `''` or a blank value for a path option, naming the option.

    `Path('')` is `.`, the working directory, so an unset variable in a
    template reached commands as a directory: `--into ''` advised creating
    the ledger's own folder as an include and `--rules ''` failed as "Is a
    directory" (w5/386), w5/239's empty-value rule for paths.
    """
    if str(value).strip():
        return
    if getattr(param, "param_type_name", None) == "argument":
        # A positional has no flag to omit: name it the way usage shows it.
        name = str(getattr(param, "human_readable_name", "PATH")).upper()
        raise UsageError(f"The {name} argument is empty ({str(value)!r}); name a file or directory.")
    name = param.opts[0] if param is not None and getattr(param, "opts", None) else "The path"
    if getattr(param, "required", False):
        # Omitting a required option fails as missing, so advising it sends
        # the user from one refusal into the next (w5/738).
        raise UsageError(f"{name} {str(value)!r} is empty; name a path.")
    raise UsageError(f"{name} {str(value)!r} is empty; name a path, or omit {name}.")


class NonEmptyPath(ParamType):
    """A path option whose empty value is refused instead of read as `.`."""

    name = "path"

    def convert(self, value: Any, param: Any, ctx: Any) -> Path:
        refuse_empty_path(value, param)
        return Path(value)


class RawPath(ParamType):
    """A path parameter whose raw text reaches the command, for stdin checks.

    `Path("./-")` normalizes to `Path("-")`, which would read stdin instead
    of the file named `-` (w5/736): the stdin decision needs the raw token,
    so this converts to `str`, refusing an empty value first like
    `NonEmptyPath`.
    """

    name = "path"

    def convert(self, value: Any, param: Any, ctx: Any) -> str:
        refuse_empty_path(value, param)
        return str(value)


class IntoPath(ParamType):
    """`--into`: a local file relative to the root ledger; a URL is refused.

    As a `Path`, `--into https://beancount.io/prices/BTC-USD` collapsed to
    the local `https:/beancount.io/prices/BTC-USD`: bea advised creating that
    directory, then wrote the entry into a file the ledger never loads, since
    the include fetches the feed (w5/449). An empty value is refused too.
    """

    name = "path"

    def convert(self, value: Any, param: Any, ctx: Any) -> Path:
        refuse_empty_path(value, param)
        match = _URL.match(str(value))
        if match is None:
            return Path(value)
        if match.group().lower() in ("http://", "https://"):
            reason = (
                "A managed price feed is read-only; declare a price directive in your own ledger file to override "
                "it, or pass --into a local file the root ledger includes."
            )
        else:
            reason = "Pass --into a local file path, relative to the root ledger."
        raise UsageError(f"--into '{value}' names a URL. {reason}")


_POSIX_CLASS = re.compile(r"\[:[a-z]+:\]")


def regex_reads_otherwise(pattern: str, flags: int = 0) -> str | None:
    """Why Python's regex reads `pattern` other than as written, or None.

    `re` has no POSIX bracket classes: `[[:alpha:]]` is a set of `[`, `:` and
    letters, and Python only warns "Possible nested set" (to stderr, with its
    own source path) before matching something else, silently (w5/429). The
    same holds for a `[` inside a set and for `--`, `&&`, `~~` or `||` there.
    An invalid pattern is its caller's to report, so it answers None. The
    engine twin (`bea_engine.ledger.text.regex_reads_otherwise`) says the same.
    """
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        # A pattern compiled before in this process comes from the cache,
        # which never warns again.
        re.purge()
        try:
            re.compile(pattern, flags)
        except (re.error, OverflowError, RecursionError, MemoryError):
            # An invalid pattern is its caller's to report; a repetition too
            # large or nesting too deep to compile is invalid the same way
            # (w5/806).
            return None
    changed = next(
        (str(item.message) for item in caught if issubclass(item.category, (FutureWarning, DeprecationWarning))),
        None,
    )
    if changed is None:
        return None
    posix = _POSIX_CLASS.search(pattern)
    if posix is not None:
        return (
            f"{posix.group()} is a POSIX class, which Python's regex does not have: it reads it as a set of "
            "characters. Write [^\\W\\d_] for letters, \\d for digits or \\s for whitespace instead"
        )
    return (
        f"Python's regex reads it differently from what it says ({changed}). Escape a literal [ inside "
        "a set as \\[, and a doubled -, &, ~ or | there with backslashes"
    )


def parse_opt_date(date_str: str | None) -> Date | None:
    if date_str is None:
        return None
    return parse_date(date_str)


def writes_through_descriptor(path: Path | str) -> bool:
    """Whether an output path names one of this process's descriptors: `/dev/fd/N`, `/dev/stderr`, `>(…)`.

    Only the process holding a descriptor can write it: a child opening the
    same name finds it closed, or finds its own descriptor of that number —
    the engine's reply pipe — and nothing can be staged beside it (w5/853).
    """
    return is_descriptor_path(path) or str(path) in ("/dev/stdout", "/dev/stderr")


def atomic_write(path: Path, content: str, *, export: bool = False) -> None:
    """Replace atomically; exports preserve modes and follow destination links.

    Internal configuration remains private. Export creation lets the OS apply
    the umask, avoiding any process-wide mask change while other threads run.
    """
    if export:
        if writes_through_descriptor(path):
            # `--json -o /dev/stderr` staged a copy in /dev/fd/ and failed (w5/853).
            with path.open("w", encoding="utf-8") as stream:
                stream.write(content)
            return
        path = path.resolve()
    try:
        status = path.stat()
    except FileNotFoundError:
        mode = None
    else:
        if export and not stat.S_ISREG(status.st_mode):
            # A device or FIFO (`-o /dev/null`) cannot be staged beside: its
            # directory is not ours to write, and replacing it would swap the
            # device for a regular file. There is nothing to keep atomic.
            with path.open("w", encoding="utf-8") as stream:
                stream.write(content)
            return
        mode = stat.S_IMODE(status.st_mode)
    if mode is not None and not mode & 0o222:
        if export:
            raise AuthError(f"Output file {path} is read-only and cannot be replaced. Nothing was written.")
        raise PermissionError(f"Output file is read-only: {path}")
    creation_mode = 0o666 if export and mode is None else 0o600
    with _unwinding_on_stop() as staged:
        _stage_and_replace(path, content, export=export, mode=mode, creation_mode=creation_mode, staged=staged)


class _Stopped(BaseException):
    """SIGTERM or SIGHUP while a staged copy exists, raised so its `finally` runs."""

    def __init__(self, number: int) -> None:
        super().__init__(number)
        self.number = number


@contextmanager
def _unwinding_on_stop() -> Iterator[list[Path]]:
    """Turn SIGTERM and SIGHUP into an exception while a copy is staged, then die by the signal.

    Their default disposition ended the process on the spot, so the `finally`
    that removes the `.bea-*.tmp` copy never ran, and a stopped `format -o`
    left a full-size copy beside its destination (w5/608). A handler someone
    else installed is left alone, and only the main thread can install one.
    """
    import signal
    import threading

    staged: list[Path] = []
    if threading.current_thread() is not threading.main_thread():
        yield staged
        return

    def stop(number: int, _frame: Any) -> None:
        raise _Stopped(number)

    installed: list[tuple[int, Any]] = []
    for name in ("SIGTERM", "SIGHUP"):
        number = getattr(signal, name, None)
        if number is not None and signal.getsignal(number) is signal.SIG_DFL:
            installed.append((number, signal.signal(number, stop)))
    try:
        yield staged
    except _Stopped as stopped:
        # A stop between creating the copy and guarding it removes it here.
        for candidate in staged:
            candidate.unlink(missing_ok=True)
        # The copy is gone; end the way the signal would have, status and all.
        for number, previous in installed:
            signal.signal(number, previous)
        os.kill(os.getpid(), stopped.number)
        raise SystemExit(128 + stopped.number) from None
    finally:
        for number, previous in installed:
            signal.signal(number, previous)


def _stage_and_replace(
    path: Path, content: str, *, export: bool, mode: int | None, creation_mode: int, staged: list[Path]
) -> None:
    while True:
        candidate = path.parent / f".bea-{secrets.token_hex(8)}.tmp"
        staged.append(candidate)
        try:
            fd = os.open(candidate, os.O_RDWR | os.O_CREAT | os.O_EXCL, creation_mode)
            break
        except FileExistsError:
            # Someone else's file: never ours to remove on a stop.
            staged.remove(candidate)
            continue
        except PermissionError as exc:
            if not export:
                raise
            # The filesystem refusing (exit 3), named by the destination the
            # user chose rather than the hidden staging file beside it (w5/119).
            raise AuthError(
                f"Cannot write {path}: the directory {path.parent} is not writable. Nothing was written."
            ) from exc
        except OSError as exc:
            if not export:
                raise
            # A full disk refused the copy itself: the stdout sentence, "Could
            # not write output", named no file and not that nothing was written (w5/610).
            raise LedgerError(
                f"Cannot write {path} ({exc.strerror or type(exc).__name__}); nothing was written."
            ) from exc
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        if export and mode is not None:
            candidate.chmod(mode)
        os.replace(candidate, path)
    except OSError as exc:
        if not export or isinstance(exc, PermissionError):
            raise
        # A full disk or a size limit read `[Errno 27] File too large`, not
        # saying the destination was untouched (w5/410).
        raise LedgerError(f"Cannot write {path} ({exc.strerror or type(exc).__name__}); nothing was written.") from exc
    finally:
        candidate.unlink(missing_ok=True)


@contextmanager
def exclusive_lock(lock: Path) -> Iterator[None]:
    """Hold the exclusive advisory lock on `lock` across a read-modify-write.

    An atomic replace keeps a file whole but still loses an update when two
    processes read the same old contents. The lock file is created if missing
    and never removed, so every waiter locks the same inode.
    """
    fd = os.open(lock, os.O_RDWR | os.O_CREAT, 0o600)
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
