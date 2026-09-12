"""The wire format between `bea` and `bea-engine`, and the errors it can carry.

One invocation writes exactly one JSON object to stdout and nothing else, so a
caller does a single read and a single parse. Failures use the same envelope
with `ok: false` rather than a second stream, because a caller that must decide
which stream to parse before it knows the outcome has a race, not a protocol.
stderr stays unstructured: progress, warnings, and whatever the engine's
dependencies print. It is never parsed.

The exit code repeats what the envelope says so a shell caller needs neither a
JSON parser nor stdout. Codes match `cli.errors` on the frontend side — 1 for a
ledger or validation failure, 2 for a bad invocation, 3 for a permission
refusal, 4 for a lost race with another writer — so the frontend can pass a
category straight through instead of translating one table into another.
"""

from __future__ import annotations

import dataclasses
import json
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any

EXIT_OK = 0
EXIT_VALIDATION = 1
EXIT_USAGE = 2
EXIT_AUTH = 3
EXIT_CONFLICT = 4


class EngineError(Exception):
    """A failure with a category the frontend can re-render without guessing.

    `details` carries the per-error lines a ledger failure produces, already
    formatted: the frontend has no Beancount objects to format for itself, and
    after the ADR014 migration it will have no Beancount at all.
    """

    category = "validation"
    exit_code = EXIT_VALIDATION

    def __init__(
        self,
        message: str,
        *,
        details: list[str] | None = None,
        ledger_errors: list[str] | None = None,
        result: dict[str, Any] | None = None,
        traceback: str | None = None,
    ) -> None:
        super().__init__(message)
        self.details = details or []
        # Tolerated load errors from an earlier successful read, distinct from
        # `details` which belong to this failure.
        self.ledger_errors = ledger_errors or []
        # Partial success payload (e.g. which rows of a batch were written).
        self.result = result
        # Child-process traceback for `--debug` when user importer code fails.
        self.traceback = traceback


class LedgerError(EngineError):
    """The ledger does not load, or a directive failed validation."""


class UsageError(EngineError):
    """The invocation is wrong: a missing ledger, a bad argument."""

    category = "usage"
    exit_code = EXIT_USAGE


class AuthError(EngineError):
    """The filesystem refused: a read-only ledger, an unwritable destination."""

    category = "auth"
    exit_code = EXIT_AUTH


class ConflictError(EngineError):
    """Something else changed the ledger while this operation was running."""

    category = "conflict"
    exit_code = EXIT_CONFLICT


@dataclass
class Answer:
    """The business result a command fills in, published when its block exits."""

    data: dict[str, Any] = field(default_factory=dict)


@contextmanager
def answering(command: str) -> Iterator[Answer]:
    """Run a command body and publish exactly one envelope, whatever happens.

    An unexpected exception becomes a `validation` failure rather than a
    traceback on stderr with nothing on stdout: the frontend is a machine, and
    an empty stdout would tell it only that the protocol broke.
    """
    answer = Answer()
    try:
        yield answer
    except EngineError as exc:
        _write(_failure(command, exc))
        raise SystemExit(exc.exit_code) from None
    except Exception as exc:  # noqa: BLE001 - the protocol owes the caller an envelope
        _write(_failure(command, EngineError(str(exc) or type(exc).__name__)))
        raise SystemExit(EXIT_VALIDATION) from None
    _write({"engine": _version(), "command": command, "ok": True, "data": answer.data})


def note(message: str) -> None:
    """Progress for a person watching a slow load. stderr, so stdout stays parseable."""
    print(message, file=sys.stderr)


def _failure(command: str, exc: EngineError) -> dict[str, Any]:
    error: dict[str, Any] = {
        "category": exc.category,
        "message": str(exc),
        "details": exc.details,
        "exit_code": exc.exit_code,
    }
    if exc.ledger_errors:
        error["ledger_errors"] = exc.ledger_errors
    if exc.result is not None:
        error["result"] = exc.result
    if exc.traceback:
        error["traceback"] = exc.traceback
    return {"engine": _version(), "command": command, "ok": False, "error": error}


def _write(envelope: dict[str, Any]) -> None:
    print(json.dumps(_jsonable(envelope)))


def _jsonable(value: Any) -> Any:
    """Serialize a command's result the way the frontend's `cli.output.jsonable` does.

    Deliberately the same walk, value for value: a helper command may put a
    Beancount entry straight into its answer, and the frontend then re-encodes
    the same payload into its own envelope. Two walks that disagreed would make
    the shape of `bea add --json` depend on which side built it.

    Named shapes come before structural ones. Beancount's directives, amounts
    and positions are namedtuples, so `_asdict` is what keeps their field names;
    rendering them as bare arrays would silently drop every label. Inventories
    are dict subclasses keyed by `(currency, cost)` tuples, which JSON cannot
    encode as keys — their own iteration yields the positions a caller wants.
    """
    from datetime import date, datetime
    from decimal import Decimal
    from pathlib import Path

    if value is None or isinstance(value, str | bool | int):
        return value
    # Exact dict/list first: most of what passes through here is already JSON.
    if type(value) is dict:
        return {str(k): _jsonable(v) for k, v in value.items()}
    if type(value) is list:
        return [_jsonable(v) for v in value]
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, float):
        return str(Decimal(repr(value)))
    if isinstance(value, date | datetime):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, type) and value.__module__ == "beancount.core.number" and value.__name__ == "MISSING":
        return None
    number = getattr(value, "number", None)
    currency = getattr(value, "currency", None)
    if number is not None and currency is not None:
        amount: dict[str, Any] = {"number": _jsonable(number), "currency": currency}
        if hasattr(value, "date") and hasattr(value, "label"):
            # A Cost is an Amount plus the lot's acquisition date and label —
            # the two fields that tell one lot from another.
            amount["date"] = _jsonable(value.date)
            amount["label"] = value.label
        return amount
    for attr in ("model_dump", "_asdict"):
        method = getattr(value, attr, None)
        if callable(method):
            return _jsonable(method())
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {f.name: _jsonable(getattr(value, f.name)) for f in dataclasses.fields(value)}
    if isinstance(value, dict):
        if type(value).__module__ == "beancount.core.inventory":
            return [_jsonable(position) for position in value]
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, list | tuple | set | frozenset):
        return [_jsonable(v) for v in value]
    return str(value)


def _version() -> str:
    from bea_engine import version

    return version()
