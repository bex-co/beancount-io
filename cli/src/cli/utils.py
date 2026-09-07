from __future__ import annotations

import re
from datetime import date as Date
from typing import Any

import typer

from cli.errors import UsageError


def owner_and_name(full_name: str) -> tuple[str, str]:
    """REST addresses a ledger as `{owner}/{name}` — two segments, exactly."""
    owner, _, name = full_name.partition("/")
    if not owner or not name or "/" in name:
        raise UsageError(f"'{full_name}' is not a ledger full name; expected 'owner/name'.")
    return owner, name


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
