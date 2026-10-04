from __future__ import annotations

import os
import re
import secrets
import stat
import unicodedata
from datetime import date as Date
from pathlib import Path
from typing import Any

import typer

from cli.errors import UsageError

#: The engine twin (`bea_engine.ledger.text.CONTROL_CHARACTERS`) carries the
#: same pattern and the full reasoning; neither side may import the other.
CONTROL_CHARACTERS = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\x9f]")


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
    """Every control character as a visible `\\xNN`. The one place that mapping lives."""
    return CONTROL_CHARACTERS.sub(lambda m: f"\\x{ord(m.group()):02x}", text)


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


def decode_error_message(path: object, exc: UnicodeDecodeError) -> str:
    """A decode failure as path, byte offset, attempted encoding, and remedy.

    The engine twin (`bea_engine.ledger.text.decode_error_message`) carries
    the same wording; neither side may import the other, so the helper is
    repeated, not shared. Callers choose the category: a caller's input file
    is a usage error, an undecodable ledger is a validation error.
    """
    return f"Cannot decode '{path}' as UTF-8: {exc.reason} at byte {exc.start}. Re-save the file as UTF-8 and retry."


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
    try:
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", date_str):
            raise ValueError(date_str)
        return Date.fromisoformat(date_str)
    except ValueError as err:
        raise typer.BadParameter(f"Invalid date '{date_str}'. Use YYYY-MM-DD format.") from err


def parse_opt_date(date_str: str | None) -> Date | None:
    if date_str is None:
        return None
    return parse_date(date_str)


def atomic_write(path: Path, content: str, *, export: bool = False) -> None:
    """Replace atomically; exports preserve modes and follow destination links.

    Internal configuration remains private. Export creation lets the OS apply
    the umask, avoiding any process-wide mask change while other threads run.
    """
    if export:
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
        raise PermissionError(f"Output file is read-only: {path}")
    creation_mode = 0o666 if export and mode is None else 0o600
    while True:
        candidate = path.parent / f".bea-{secrets.token_hex(8)}.tmp"
        try:
            fd = os.open(candidate, os.O_RDWR | os.O_CREAT | os.O_EXCL, creation_mode)
            break
        except FileExistsError:
            continue
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        if export and mode is not None:
            candidate.chmod(mode)
        os.replace(candidate, path)
    finally:
        candidate.unlink(missing_ok=True)
