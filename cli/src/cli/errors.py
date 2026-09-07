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
"""

from __future__ import annotations

from typing import Any

EXIT_SUCCESS = 0
EXIT_VALIDATION = 1
EXIT_USAGE = 2
EXIT_AUTH = 3
EXIT_CONFLICT = 4


class BeaError(Exception):
    """An error with a documented category and exit code."""

    category = "error"
    exit_code = EXIT_VALIDATION

    def __init__(
        self,
        message: str,
        *,
        request_id: str | None = None,
        details: list[str] | None = None,
    ) -> None:
        super().__init__(message)
        self.request_id = request_id
        self.details = details or []


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


def _request_id(response: Any) -> str | None:
    """Pull the backend's request id out of a response so support can trace the call."""
    headers = getattr(response, "headers", None)
    if headers is None:
        return None
    for name in ("x-request-id", "x-amzn-requestid", "cf-ray"):
        value = headers.get(name)
        if value:
            return str(value)
    return None


def to_bea_error(exc: BaseException | str) -> BeaError:
    """Classify anything a command can raise into one documented category."""
    if isinstance(exc, str):
        return BeaError(exc)
    if isinstance(exc, BeaError):
        return exc

    # Typer vendors its own copy of click, so this must be typer's class, not
    # the one an `import click` would resolve to.
    import typer

    if isinstance(exc, typer.BadParameter):
        return UsageError(exc.format_message())

    import httpx

    from cli.api.gql_client.exceptions import (
        GraphQLClientGraphQLError,
        GraphQLClientGraphQLMultiError,
        GraphQLClientHttpError,
    )

    if isinstance(exc, GraphQLClientHttpError):
        request_id = _request_id(exc.response)
        if exc.status_code in (401, 403):
            return AuthError(
                f"Not authorized (HTTP {exc.status_code}). Run 'bea auth login'.",
                request_id=request_id,
            )
        if exc.status_code == 409:
            return ConflictError(f"Conflict (HTTP {exc.status_code}).", request_id=request_id)
        return BeaError(str(exc), request_id=request_id)

    if isinstance(exc, GraphQLClientGraphQLMultiError | GraphQLClientGraphQLError):
        errors = exc.errors if isinstance(exc, GraphQLClientGraphQLMultiError) else [exc]
        request_id = None
        for err in errors:
            extensions = err.extensions or {}
            candidate = extensions.get("requestId") or extensions.get("request_id")
            if candidate:
                request_id = str(candidate)
                break
        codes = {str((err.extensions or {}).get("code", "")).upper() for err in errors}
        message = "; ".join(err.message for err in errors) or str(exc)
        if codes & {"UNAUTHENTICATED", "FORBIDDEN", "UNAUTHORIZED"}:
            return AuthError(message, request_id=request_id)
        if "CONFLICT" in codes:
            return ConflictError(message, request_id=request_id)
        return BeaError(message, request_id=request_id)

    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        request_id = _request_id(exc.response)
        if status in (401, 403):
            return AuthError(f"Not authorized (HTTP {status}). Run 'bea auth login'.", request_id=request_id)
        if status == 409:
            return ConflictError(f"Conflict (HTTP {status}).", request_id=request_id)
        return BeaError(str(exc), request_id=request_id)

    if isinstance(exc, FileNotFoundError):
        return UsageError(str(exc))

    return BeaError(str(exc))


def unknown_write_outcome(operation: str, exc: BaseException) -> ConflictError:
    """A write that timed out or lost its connection: never retried automatically.

    The caller is told the outcome is unknown, and how to find out, rather than
    being handed a success or a plain failure that invites a blind retry.
    """
    return ConflictError(
        f"{operation} did not complete cleanly ({exc}). "
        f"The outcome is unknown — check the current state before retrying."
    )
