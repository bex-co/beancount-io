from __future__ import annotations

import os
import re
import tempfile
import unicodedata
from datetime import date as Date
from pathlib import Path
from typing import Any

import typer

from cli.errors import UsageError


def single_line(text: str) -> str:
    """Keep text readable as one ledger field or table cell, preserving other whitespace."""
    return re.sub(r"[\r\n]+", " ", text)


def fold_account(name: str) -> str:
    """The key two account names must share to match in a filter.

    The engine twin (`bea_engine.ledger.text.fold_account`) carries the full
    reasoning; the short of it is that NFC and NFD spellings of one account
    name render identically, so comparing them raw makes a filter miss an
    account the user can see. Neither side may import the other, and a filter
    applied here must agree with the one applied there.
    """
    return unicodedata.normalize("NFC", unicodedata.normalize("NFC", name).casefold())


def owner_and_name(full_name: str) -> tuple[str, str]:
    """REST addresses a ledger as `{owner}/{name}` — two segments, exactly."""
    owner, _, name = full_name.partition("/")
    if not owner or not name or "/" in name:
        raise UsageError(f"'{full_name}' is not a ledger full name; expected 'owner/name'.")
    return owner, name


# The server accepts exactly this, in REST v1 and in GraphQL alike. Keep the two
# in step: a stricter rule here would refuse a name the service would have taken.
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
    try:
        return Date.fromisoformat(date_str)
    except ValueError as err:
        raise typer.BadParameter(f"Invalid date '{date_str}'. Use YYYY-MM-DD format.") from err


def parse_opt_date(date_str: str | None) -> Date | None:
    if date_str is None:
        return None
    return parse_date(date_str)


def atomic_write(path: Path, content: str) -> None:
    """Replace `path` with `content` without a half-written file."""
    try:
        mode = path.stat().st_mode
    except FileNotFoundError:
        mode = None
    if mode is not None and not mode & 0o222:
        raise PermissionError(f"Output file is read-only: {path}")
    fd, name = tempfile.mkstemp(prefix=".bea-", suffix=".tmp", dir=path.parent)
    candidate = Path(name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(candidate, path)
    finally:
        candidate.unlink(missing_ok=True)
