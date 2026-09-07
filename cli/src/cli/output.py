"""Everything the CLI prints, in exactly two shapes: a table for people, an envelope for machines.

In JSON mode data goes to stdout and nothing else does, so a caller can pipe
stdout straight into `jq`; failures go to stderr as one error object with the
category and exit code from `cli.errors`.
"""

from __future__ import annotations

import datetime
import json
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any, NoReturn

import typer

from cli import context
from cli.config import package_version, settings
from cli.errors import LedgerError, to_bea_error


def json_mode() -> bool:
    return context.current().json_output


def success(message: str | None = None) -> None:
    """Print a human-readable confirmation. Silent in JSON mode — the envelope says it."""
    if message and not json_mode():
        print(message)


def note(message: str) -> None:
    """Progress and advice, on stderr so it never contaminates piped stdout."""
    if not json_mode():
        print(message, file=sys.stderr)


def error(exc: BaseException | str, code: int | None = None) -> NoReturn:
    """Fail with a documented category and exit code, rendered for the active mode."""
    err = to_bea_error(exc)
    exit_code = code if code is not None else err.exit_code

    if json_mode():
        payload: dict[str, Any] = {
            "category": err.category,
            "message": str(err),
            "exit_code": exit_code,
        }
        if err.request_id:
            payload["request_id"] = err.request_id
        if err.details:
            payload["details"] = err.details
        print(json.dumps({"error": payload}), file=sys.stderr)
    else:
        print(f"Error: {err}", file=sys.stderr)
        for detail in err.details:
            print(f"  {detail}", file=sys.stderr)

    raise typer.Exit(exit_code)


def table(headers: list[str], rows: list[list[str]]) -> None:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    sep = "  "
    typer.echo(sep.join(h.ljust(widths[i]) for i, h in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for row in rows:
        typer.echo(sep.join(cell.ljust(widths[i]) for i, cell in enumerate(row)))


def file_target(path: Path) -> dict[str, Any]:
    return {"file": str(path.resolve())}


def server_target() -> dict[str, Any]:
    return {"server": settings.api_url}


def emit(
    data: Any,
    *,
    target: dict[str, Any] | None = None,
    truncated: bool = False,
    limit: int | None = None,
) -> None:
    """Print the documented JSON envelope on stdout."""
    envelope: dict[str, Any] = {
        "bea": package_version(),
        "target": target,
        "data": jsonable(data),
        "truncated": truncated,
    }
    if limit is not None:
        envelope["limit"] = limit
    print(json.dumps(envelope))


def jsonable(value: Any) -> Any:
    """Convert accounting values to JSON without losing precision.

    Decimals become strings: a float would silently round an amount, and every
    consumer of this envelope is doing money arithmetic.
    """
    if value is None or isinstance(value, str | bool | int):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, float):
        return str(Decimal(repr(value)))
    if isinstance(value, datetime.date | datetime.datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    # Named shapes before structural ones: beancount's Amount and Position are
    # tuples, and rendering them as bare arrays would drop the field names a
    # consumer needs.
    number = getattr(value, "number", None)
    currency = getattr(value, "currency", None)
    if number is not None and currency is not None:
        return {"number": jsonable(number), "currency": currency}

    for attr in ("model_dump", "_asdict"):
        method = getattr(value, attr, None)
        if callable(method):
            return jsonable(method())

    if isinstance(value, dict):
        # A beancount Inventory is a dict keyed by (currency, cost); its own
        # iteration order yields positions, which is what a caller wants to read.
        inventory = _beancount_inventory()
        if inventory is not None and isinstance(value, inventory):
            return [jsonable(position) for position in value]
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set | frozenset):
        return [jsonable(v) for v in value]

    return str(value)


def _beancount_inventory() -> type | None:
    """The Inventory class, but only if beancount is already loaded — `--help` must not import it."""
    module = sys.modules.get("beancount.core.inventory")
    return getattr(module, "Inventory", None) if module else None


def render_ledger_errors(errors: list[Any], *, allow: bool) -> None:
    """Report loader errors instead of quietly analysing a ledger that does not load.

    A total computed from a ledger with parse errors looks authoritative and
    is not, so the default is to refuse; `--allow-errors` opts into partial data.
    """
    if not errors:
        return
    formatted = [format_ledger_error(err) for err in errors]
    if not allow:
        raise LedgerError(
            f"Ledger has {len(formatted)} error(s). Pass --allow-errors to report anyway.",
            details=formatted,
        )
    for line in formatted:
        print(line, file=sys.stderr)


def format_ledger_error(err: Any) -> str:
    source = getattr(err, "source", None) or {}
    filename = source.get("filename", "<ledger>")
    lineno = source.get("lineno", 0)
    return f"{filename}:{lineno}: {getattr(err, 'message', err)}"
