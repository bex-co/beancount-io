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

from cli import context
from cli.api.rest_client.client import AuthenticatedClient, Client
from cli.api.rest_client.models.v1_error import V1Error
from cli.api.rest_client.types import Response

# Bound every cloud HTTP call so unattended agents fail instead of hanging when
# a server accepts the TCP connection and stops responding. Device-flow polling
# issues many short requests; each still respects this deadline.
DEFAULT_TIMEOUT = httpx.Timeout(30.0)


def _install_transport_guards(client: httpx.Client) -> httpx.Client:
    """Keep proxy setup failures and non-JSON error bodies identifiable.

    openapi-python-client parses documented error statuses with `response.json()`
    before our `unwrap` runs; without this, an HTML 403 becomes a JSON decoder
    validation error and loses the HTTP status and request id.
    """
    original_request = client.request
    original_json = httpx.Response.json

    def request(method: str, url: httpx.URL | str, **kwargs: Any) -> httpx.Response:
        extensions = dict(kwargs.get("extensions") or {})
        previous_trace = extensions.get("trace")
        connecting_proxy = False
        origin_started = False

        def trace(name: str, info: dict[str, Any]) -> Any:
            nonlocal connecting_proxy, origin_started
            if name in {"http11.send_request_headers.started", "http2.send_request_headers.started"}:
                if getattr(info.get("request"), "method", None) == b"CONNECT":
                    connecting_proxy = True
                else:
                    # This is sticky: a later redirect/auth attempt can open
                    # another tunnel after the original API request went out.
                    origin_started = True
            if previous_trace is not None:
                return previous_trace(name, info)
            return None

        extensions["trace"] = trace
        kwargs["extensions"] = extensions
        try:
            response = original_request(method, url, **kwargs)
        except httpx.TransportError as exc:
            # httpcore uses ReadTimeout/RemoteProtocolError when CONNECT is
            # unanswered or dropped. No API request has started at that point,
            # unlike the same errors after sending a POST/DELETE (w5/702).
            # Observe the public trace extension rather than proxy env vars:
            # bypassed proxies and reused tunnels must keep normal semantics.
            if connecting_proxy and not origin_started:
                raise httpx.ProxyError("Proxy tunnel setup failed", request=exc.request) from exc
            raise

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
    context.current().require_network("cloud")
    from cli.config import settings

    client = cast(
        AuthenticatedClient,
        Client(base_url=settings().api_url, timeout=DEFAULT_TIMEOUT),
    )
    _install_transport_guards(_httpx_client(client))
    return client


def _httpx_client(client: Any) -> Any:
    """The generated transport, with unusable proxy settings refused in bea's words."""
    from cli.errors import proxy_refusal

    try:
        return client.get_httpx_client()
    except (ImportError, ValueError, httpx.InvalidURL) as exc:
        refusal = proxy_refusal(exc)
        if refusal is None:
            raise
        raise refusal from None


def bearer_client(token: str) -> AuthenticatedClient:
    context.current().require_network("cloud")
    from cli.config import settings

    client = AuthenticatedClient(
        base_url=settings().api_url,
        token=token,
        timeout=DEFAULT_TIMEOUT,
    )
    _install_transport_guards(_httpx_client(client))
    return client


def authenticated_client() -> AuthenticatedClient:
    """The client every hosted command needs: the stored or environment credential, attached."""
    # After Click has parsed eager help, before even reading credentials.
    # A raw argv help-token check confused option values with actual help.
    context.current().require_network("cloud")
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
    from cli.errors import UnreadableSuccess, UsageError, request_id_from

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

            error = error_from_status(
                response.status_code,
                _error_message(None, response.content),
                request_id=request_id_from(response.headers),
                code=_error_code(None, response.content),
                owner=_limit_owner(response.content),
            )
            error.http_status = response.status_code
            raise error from exc
        raise UnreadableSuccess(
            f"Unexpected server response (HTTP {response.status_code}).",
            status=response.status_code,
            request_id=request_id_from(response.headers),
        ) from exc
    finally:
        hooks.remove(capture)


def unwrap[T](response: Response[T | V1Error]) -> T:
    """The success payload, or the documented error category — nothing else."""
    result = unwrap_or_none(response)
    if result is None:
        from cli.errors import UnreadableSuccess, request_id_from

        raise UnreadableSuccess(
            f"Empty response (HTTP {response.status_code}).",
            status=response.status_code,
            request_id=request_id_from(response.headers),
        )
    return result


def unwrap_or_none[T](response: Response[T | V1Error], *, model: type | None = None) -> T | None:
    """`unwrap` for operations whose success body is legitimately null.

    `model` is the generated class a success must parse into. A union-typed
    generated parser that cannot read the body returns the raw JSON instead
    of raising, so `call` never sees a parser failure; without this check the
    command then read an attribute off a dict (w5/366).
    """
    from cli.errors import UnreadableSuccess, error_from_status, redirect_error, request_id_from

    parsed = response.parsed
    if 300 <= response.status_code < 400:
        raise redirect_error(response.status_code, response.headers)
    if response.status_code < 400 and not isinstance(parsed, V1Error):
        if model is not None and parsed is not None and not isinstance(parsed, model):
            raise UnreadableSuccess(
                f"Unexpected server response (HTTP {response.status_code}).",
                status=response.status_code,
                request_id=request_id_from(response.headers),
            )
        return parsed
    raise error_from_status(
        response.status_code,
        _error_message(parsed, response.content),
        request_id=request_id_from(response.headers),
        code=_error_code(parsed, response.content),
        owner=_limit_owner(response.content),
    )


def _error_code(parsed: object, content: bytes) -> str | None:
    """The v1 error code, from the parsed envelope or the raw body."""
    from cli.errors import error_code

    if isinstance(parsed, V1Error):
        return parsed.error.code
    try:
        return error_code(json.loads(content))
    except (ValueError, RecursionError):
        return None


def _limit_owner(content: bytes) -> str | None:
    """Whose plan set a limit; a refusal that names none, or no JSON, has none."""
    from cli.errors import limit_owner

    try:
        return limit_owner(json.loads(content))
    except (ValueError, RecursionError):
        return None


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
