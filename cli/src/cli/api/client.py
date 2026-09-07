"""The hosted-API seam: build clients from settings and credentials, and turn
transport responses into the documented error categories.

Commands never touch httpx or parse a `V1Error`; they call an operation module
from the generated client and hand the `Response` to `unwrap`.
"""

from __future__ import annotations

from typing import cast

from cli.api.rest_client.client import AuthenticatedClient, Client
from cli.api.rest_client.models.v1_error import V1Error
from cli.api.rest_client.types import Response


def make_client() -> AuthenticatedClient:
    """Anonymous client for the pre-credential ceremony (device flow).

    Typed as `AuthenticatedClient` because every generated operation module
    types its `client` parameter that way, even for anonymous-capable
    operations; the two generated classes share the transport surface, and
    this cast is the one place that fact lives.
    """
    from cli.config import settings

    return cast(AuthenticatedClient, Client(base_url=settings().api_url))


def bearer_client(token: str) -> AuthenticatedClient:
    from cli.config import settings

    return AuthenticatedClient(base_url=settings().api_url, token=token)


def authenticated_client() -> AuthenticatedClient:
    """The client every hosted command needs: the stored or environment credential, attached."""
    from cli.auth.credentials import require_credentials

    return bearer_client(require_credentials().token)


def unwrap[T](response: Response[T | V1Error]) -> T:
    """The success payload, or the documented error category — nothing else."""
    result = unwrap_or_none(response)
    if result is None:
        from cli.errors import BeaError

        raise BeaError(f"Empty response (HTTP {response.status_code}).")
    return result


def unwrap_or_none[T](response: Response[T | V1Error]) -> T | None:
    """`unwrap` for operations whose success body is legitimately null."""
    from cli.errors import error_from_status, request_id_from

    parsed = response.parsed
    if response.status_code < 400 and not isinstance(parsed, V1Error):
        return parsed
    raise error_from_status(
        response.status_code,
        _error_message(parsed, response.content),
        request_id=request_id_from(response.headers),
    )


def _error_message(parsed: object, content: bytes) -> str | None:
    """The server's own words, even on statuses the generated parser skips.

    The spec documents every status the app itself produces, so those parse
    into `V1Error`; what remains is infrastructure answering for the server
    (a proxy's 502, an HTML error page). Read the raw body as best effort
    rather than reducing everything to "HTTP <status>".
    """
    if isinstance(parsed, V1Error):
        return parsed.error.message
    import json

    try:
        message = json.loads(content).get("error", {}).get("message")
    except Exception:
        return None
    return str(message) if message else None
