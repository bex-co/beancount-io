from __future__ import annotations

from datetime import date as Date

import typer


def full_name_to_ledger_id(full_name: str) -> str:
    return full_name


def parse_date(date_str: str) -> Date:
    try:
        return Date.fromisoformat(date_str)
    except ValueError as err:
        raise typer.BadParameter(f"Invalid date '{date_str}'. Use YYYY-MM-DD format.") from err


def parse_opt_date(date_str: str | None) -> Date | None:
    if date_str is None:
        return None
    return parse_date(date_str)
