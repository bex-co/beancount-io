"""Error categories and the exit codes they map to.

One table, used by every command, so a caller can branch on the exit status
without parsing messages:

| code | category     | meaning                                                       |
| ---- | ------------ | ------------------------------------------------------------- |
| 0    | —            | success                                                       |
| 1    | `validation` | ledger or validation error (also the catch-all runtime error) |
| 2    | `usage`      | bad arguments, missing target, missing extra, input needed    |
| 3    | `auth`       | authentication or permission                                  |
| 4    | `conflict`   | conflict, or a write whose outcome is unknown                 |

There is no sixth category: every exit code in that table maps to exactly one
category name, so a caller can branch on either and get the same answer.
"""

from __future__ import annotations

from typing import Any

EXIT_VALIDATION = 1
EXIT_USAGE = 2
EXIT_AUTH = 3
EXIT_CONFLICT = 4


class BeaError(Exception):
    """An error with a documented category and exit code.

    The base class is the catch-all, and it answers `validation`/1 rather than
    inventing a category the table above does not list — an undocumented value
    in this field is worse than a coarse one, because a script branching on it
    has nothing to match.
    """

    category = "validation"
    exit_code = EXIT_VALIDATION

    def __init__(
        self,
        message: str,
        *,
        request_id: str | None = None,
        details: list[str] | None = None,
        result: dict[str, Any] | None = None,
        traceback: str | None = None,
    ) -> None:
        super().__init__(message)
        self.request_id = request_id
        self.details = details or []
        self.result = result
        self.traceback = traceback


class LedgerError(BeaError):
    """The ledger does not load, or a directive failed validation."""

    category = "validation"
    exit_code = EXIT_VALIDATION


class UsageError(BeaError):
    """The invocation is wrong: bad arguments, no target, a missing extra, or input needed."""

    category = "usage"
    exit_code = EXIT_USAGE


class AuthError(BeaError):
    """Not authenticated, or not permitted."""

    category = "auth"
    exit_code = EXIT_AUTH


class ConflictError(BeaError):
    """The server rejected a stale change, or a write's outcome is unknown."""

    category = "conflict"
    exit_code = EXIT_CONFLICT


BY_CATEGORY: dict[str, type[BeaError]] = {
    "validation": LedgerError,
    "usage": UsageError,
    "auth": AuthError,
    "conflict": ConflictError,
}
"""The table above, as code. The engine reports the same category names, so one
crossing the process boundary is looked up here rather than translated into a
second vocabulary."""


def request_id_from(headers: Any) -> str | None:
    """Pull the backend's request id out of response headers so support can trace the call."""
    if headers is None:
        return None
    for name in ("x-request-id", "x-amzn-requestid", "cf-ray"):
        value = headers.get(name)
        if value:
            return str(value)
    return None


def error_from_status(status: int, message: str | None, *, request_id: str | None = None) -> BeaError:
    """Map a v1 HTTP status to the documented category, keeping the server's words.

    One deterministic table, so a script can branch on the exit code and a
    person reads the server's own message rather than a paraphrase.
    """
    detail = message or f"HTTP {status}"
    if status in (401, 403):
        return AuthError(f"Not authorized ({detail}). Run 'bea cloud login'.", request_id=request_id)
    if status == 409:
        return ConflictError(detail, request_id=request_id)
    if status == 400:
        return UsageError(detail, request_id=request_id)
    if status == 429:
        return BeaError(f"Rate limited ({detail}). Wait a moment and retry.", request_id=request_id)
    if status >= 500:
        return BeaError(f"Server error ({detail}).", request_id=request_id)
    return BeaError(detail, request_id=request_id)


def to_bea_error(exc: BaseException | str) -> BeaError:
    """Classify anything a command can raise into one documented category."""
    if isinstance(exc, str):
        return BeaError(_redact_secrets(exc))
    if isinstance(exc, BeaError):
        return exc

    # Typer vendors its own copy of click, so this must be typer's class, not
    # the one an `import click` would resolve to.
    import typer

    if isinstance(exc, typer.BadParameter):
        return UsageError(exc.format_message())
    # The parent class works with both standalone Click (older Typer) and
    # Typer's vendored Click, without a dependency on either private module.
    click_usage_error = typer.BadParameter.__bases__[0]
    if isinstance(exc, click_usage_error):
        option = getattr(exc, "option_name", None)
        examples = {
            "-f": "bea -f main.bean check",
            "--file": "bea --file main.bean check",
            "--json": "bea --json list transaction",
            "--debug": "bea --debug import statement.csv",
            "--no-input": "bea --no-input check",
            "--yes": "bea --yes COMMAND",
            "-y": "bea -y COMMAND",
        }
        hint = f" Place {option} before the command, for example: {examples[option]}." if option in examples else ""
        return UsageError(str(exc) + hint)

    import httpx

    if isinstance(exc, httpx.TransportError):
        # httpx transport errors frequently stringify to nothing at all, which
        # would leave the caller an empty message and no clue the network failed.
        # Never echo the exception text: LocalProtocolError can embed a Bearer
        # token that failed header validation.
        return BeaError(f"Could not reach the server ({type(exc).__name__}).")

    if isinstance(exc, FileNotFoundError):
        return UsageError(_redact_secrets(str(exc)))

    return BeaError(_redact_secrets(str(exc) or f"{type(exc).__name__} (no detail)."))


def _redact_secrets(text: str) -> str:
    """Strip credential-shaped fragments out of exception text before display."""
    import os
    import re

    redacted = text
    token = os.environ.get("BEA_TOKEN")
    if token:
        redacted = redacted.replace(token, "[redacted]")
        redacted = redacted.replace(repr(token.encode()), "[redacted]")
        redacted = redacted.replace(repr(f"Bearer {token}".encode()), "[redacted]")
    # Generic Bearer spill even when the env var was already cleared.
    return re.sub(r"Bearer [^\s'\"]+", "Bearer [redacted]", redacted)


def unknown_write_outcome(operation: str, exc: BaseException) -> ConflictError:
    """A write that timed out or lost its connection: never retried automatically.

    The caller is told the outcome is unknown, and how to find out, rather than
    being handed a success or a plain failure that invites a blind retry.
    """
    return ConflictError(
        f"{operation} did not complete cleanly ({type(exc).__name__}). "
        f"The outcome is unknown — check the current state before retrying."
    )
