"""The hosted-API seam: build clients from settings and credentials, and turn
transport responses into the documented error categories.

Commands never touch httpx or parse a `V1Error`; `call` guards the generated
operation's parser and `unwrap` handles its resulting `Response`.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any, cast

import httpx

from cli.api.rest_client.client import AuthenticatedClient, Client
from cli.api.rest_client.models.v1_error import V1Error
from cli.api.rest_client.types import Response

# Bound every cloud HTTP call so unattended agents fail instead of hanging when
# a server accepts the TCP connection and stops responding. Device-flow polling
# issues many short requests; each still respects this deadline.
DEFAULT_TIMEOUT = httpx.Timeout(30.0)


def _install_tolerant_json(client: httpx.Client) -> httpx.Client:
    """Make generated `response.json()` calls survive non-JSON error bodies.

    openapi-python-client parses documented error statuses with `response.json()`
    before our `unwrap` runs; without this, an HTML 403 becomes a JSON decoder
    validation error and loses the HTTP status and request id.
    """
    original_request = client.request
    original_json = httpx.Response.json

    def request(method: str, url: httpx.URL | str, **kwargs: Any) -> httpx.Response:
        response = original_request(method, url, **kwargs)

        def json_method(**kw: Any) -> Any:
            try:
                return original_json(response, **kw)
            except (json.JSONDecodeError, ValueError):
                if response.status_code >= 400:
                    return {
                        "ok": False,
                        "error": {
                            "code": "HTTP_ERROR",
                            "message": f"HTTP {response.status_code}",
                        },
                    }
                raise

        response.json = json_method  # type: ignore[method-assign]
        return response

    client.request = request  # type: ignore[method-assign]
    return client


def make_client() -> AuthenticatedClient:
    """Anonymous client for the pre-credential ceremony (device flow).

    Typed as `AuthenticatedClient` because every generated operation module
    types its `client` parameter that way, even for anonymous-capable
    operations; the two generated classes share the transport surface, and
    this cast is the one place that fact lives.
    """
    from cli.config import settings

    client = cast(
        AuthenticatedClient,
        Client(base_url=settings().api_url, timeout=DEFAULT_TIMEOUT),
    )
    _install_tolerant_json(client.get_httpx_client())
    return client


def bearer_client(token: str) -> AuthenticatedClient:
    from cli.config import settings

    client = AuthenticatedClient(
        base_url=settings().api_url,
        token=token,
        timeout=DEFAULT_TIMEOUT,
    )
    _install_tolerant_json(client.get_httpx_client())
    return client


def authenticated_client() -> AuthenticatedClient:
    """The client every hosted command needs: the stored or environment credential, attached."""
    from cli.auth.credentials import require_credentials

    return bearer_client(require_credentials().token)


def call[T](
    operation: Callable[..., Response[T]],
    /,
    *args: Any,
    client: AuthenticatedClient,
    **kwargs: Any,
) -> Response[T]:
    """Keep HTTP context when a generated parser rejects a response body.

    Parsing happens inside `sync_detailed`, before `unwrap` can see a Response.
    A temporary response hook captures status/headers without exposing the body
    or converting errors raised before an HTTP response into server failures.

    Generated operations take their path parameters positionally, and each is
    refused here if it is a dot segment: `quote` leaves `.` and `..` intact and
    httpx then resolves them, so the request would leave the operation's path
    for another endpoint. Commands validate their arguments first; this is
    the backstop for every path parameter, present and future.
    """
    from cli.errors import BeaError, UsageError, request_id_from

    for arg in args:
        if isinstance(arg, str) and arg in {".", ".."}:
            raise UsageError(
                f"'{arg}' cannot be a path segment; refusing to send a request that would leave its endpoint."
            )

    response: httpx.Response | None = None

    def capture(received: httpx.Response) -> None:
        nonlocal response
        response = received

    hooks = client.get_httpx_client().event_hooks["response"]
    hooks.append(capture)
    try:
        result = operation(*args, client=client, **kwargs)
        if response is not None and response.is_success and isinstance(result.parsed, list):
            # Generated array parsers iterate JSON directly: {} and "" would
            # otherwise silently become [], falsely claiming an empty page.
            if not isinstance(response.json(), list):
                raise ValueError("Expected a JSON array")
        return result
    except (KeyError, ValueError, TypeError, AttributeError) as exc:
        if response is None:
            raise
        if not response.is_success:
            # A documented error status whose JSON body lacks the `{ok, error}`
            # envelope (a gateway's `{"message": ...}`, `[]`, a bare string)
            # makes `V1Error.from_dict` raise; keep the status mapping anyway.
            from cli.errors import error_from_status

            raise error_from_status(
                response.status_code,
                _error_message(None, response.content),
                request_id=request_id_from(response.headers),
            ) from exc
        raise BeaError(
            f"Unexpected server response (HTTP {response.status_code}).",
            request_id=request_id_from(response.headers),
        ) from exc
    finally:
        hooks.remove(capture)


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
    from cli.errors import server_message

    if isinstance(parsed, V1Error):
        return server_message(parsed.error.message)
    try:
        body = json.loads(content)
    except (ValueError, RecursionError):
        return None
    return server_message(body)
