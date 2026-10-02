from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_account_feed_response_200 import GetApiGatewayV1AccountFeedResponse200
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    offset: float | None | Unset = 0.0,
    limit: float | None | Unset = 10.0,
    source: str | Unset = UNSET,
    locale: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_offset: float | None | Unset
    if isinstance(offset, Unset):
        json_offset = UNSET
    else:
        json_offset = offset
    params["offset"] = json_offset

    json_limit: float | None | Unset
    if isinstance(limit, Unset):
        json_limit = UNSET
    else:
        json_limit = limit
    params["limit"] = json_limit

    params["source"] = source

    params["locale"] = locale

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/account/feed",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> GetApiGatewayV1AccountFeedResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = GetApiGatewayV1AccountFeedResponse200.from_dict(response.json())

        return response_200

    if response.status_code == 400:
        response_400 = V1Error.from_dict(response.json())

        return response_400

    if response.status_code == 401:
        response_401 = V1Error.from_dict(response.json())

        return response_401

    if response.status_code == 402:
        response_402 = V1Error.from_dict(response.json())

        return response_402

    if response.status_code == 403:
        response_403 = V1Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = V1Error.from_dict(response.json())

        return response_404

    if response.status_code == 409:
        response_409 = V1Error.from_dict(response.json())

        return response_409

    if response.status_code == 429:
        response_429 = V1Error.from_dict(response.json())

        return response_429

    if response.status_code == 500:
        response_500 = V1Error.from_dict(response.json())

        return response_500

    if response.status_code == 503:
        response_503 = V1Error.from_dict(response.json())

        return response_503

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[GetApiGatewayV1AccountFeedResponse200 | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    offset: float | None | Unset = 0.0,
    limit: float | None | Unset = 10.0,
    source: str | Unset = UNSET,
    locale: str | Unset = UNSET,
) -> Response[GetApiGatewayV1AccountFeedResponse200 | V1Error]:
    """Read your activity feed

     Merged blog, release, and ledger activity, newest first. Requires a session or account-wide OAuth
    credential with ledger.read. Source accepts BLOG, CHANGELOG, or LEDGER_RSS case-insensitively;
    omitted or empty means all sources. Locale defaults to the caller's profile then English. Offset
    defaults to 0 and limit to 10.

    Args:
        offset (float | None | Unset):  Default: 0.0.
        limit (float | None | Unset):  Default: 10.0.
        source (str | Unset):
        locale (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1AccountFeedResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        offset=offset,
        limit=limit,
        source=source,
        locale=locale,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    offset: float | None | Unset = 0.0,
    limit: float | None | Unset = 10.0,
    source: str | Unset = UNSET,
    locale: str | Unset = UNSET,
) -> GetApiGatewayV1AccountFeedResponse200 | V1Error | None:
    """Read your activity feed

     Merged blog, release, and ledger activity, newest first. Requires a session or account-wide OAuth
    credential with ledger.read. Source accepts BLOG, CHANGELOG, or LEDGER_RSS case-insensitively;
    omitted or empty means all sources. Locale defaults to the caller's profile then English. Offset
    defaults to 0 and limit to 10.

    Args:
        offset (float | None | Unset):  Default: 0.0.
        limit (float | None | Unset):  Default: 10.0.
        source (str | Unset):
        locale (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1AccountFeedResponse200 | V1Error
    """

    return sync_detailed(
        client=client,
        offset=offset,
        limit=limit,
        source=source,
        locale=locale,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    offset: float | None | Unset = 0.0,
    limit: float | None | Unset = 10.0,
    source: str | Unset = UNSET,
    locale: str | Unset = UNSET,
) -> Response[GetApiGatewayV1AccountFeedResponse200 | V1Error]:
    """Read your activity feed

     Merged blog, release, and ledger activity, newest first. Requires a session or account-wide OAuth
    credential with ledger.read. Source accepts BLOG, CHANGELOG, or LEDGER_RSS case-insensitively;
    omitted or empty means all sources. Locale defaults to the caller's profile then English. Offset
    defaults to 0 and limit to 10.

    Args:
        offset (float | None | Unset):  Default: 0.0.
        limit (float | None | Unset):  Default: 10.0.
        source (str | Unset):
        locale (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1AccountFeedResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        offset=offset,
        limit=limit,
        source=source,
        locale=locale,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    offset: float | None | Unset = 0.0,
    limit: float | None | Unset = 10.0,
    source: str | Unset = UNSET,
    locale: str | Unset = UNSET,
) -> GetApiGatewayV1AccountFeedResponse200 | V1Error | None:
    """Read your activity feed

     Merged blog, release, and ledger activity, newest first. Requires a session or account-wide OAuth
    credential with ledger.read. Source accepts BLOG, CHANGELOG, or LEDGER_RSS case-insensitively;
    omitted or empty means all sources. Locale defaults to the caller's profile then English. Offset
    defaults to 0 and limit to 10.

    Args:
        offset (float | None | Unset):  Default: 0.0.
        limit (float | None | Unset):  Default: 10.0.
        source (str | Unset):
        locale (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1AccountFeedResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            offset=offset,
            limit=limit,
            source=source,
            locale=locale,
        )
    ).parsed
