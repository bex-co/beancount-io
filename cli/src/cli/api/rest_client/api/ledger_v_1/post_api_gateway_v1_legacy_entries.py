from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.post_api_gateway_v1_legacy_entries_body import PostApiGatewayV1LegacyEntriesBody
from ...models.post_api_gateway_v1_legacy_entries_response_200 import PostApiGatewayV1LegacyEntriesResponse200
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: PostApiGatewayV1LegacyEntriesBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api-gateway/v1/legacy/entries",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> PostApiGatewayV1LegacyEntriesResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = PostApiGatewayV1LegacyEntriesResponse200.from_dict(response.json())

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
) -> Response[PostApiGatewayV1LegacyEntriesResponse200 | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LegacyEntriesBody | Unset = UNSET,
) -> Response[PostApiGatewayV1LegacyEntriesResponse200 | V1Error]:
    """Insert entries using the legacy transaction contract

     Compatibility for GraphQL addEntries: Transaction payloads with amount strings, legacy metadata
    accepted but ignored, and explicit-ledger/pin/first-ledger fallback. Uses normal web quotas. No
    preview.

    Args:
        body (PostApiGatewayV1LegacyEntriesBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiGatewayV1LegacyEntriesResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LegacyEntriesBody | Unset = UNSET,
) -> PostApiGatewayV1LegacyEntriesResponse200 | V1Error | None:
    """Insert entries using the legacy transaction contract

     Compatibility for GraphQL addEntries: Transaction payloads with amount strings, legacy metadata
    accepted but ignored, and explicit-ledger/pin/first-ledger fallback. Uses normal web quotas. No
    preview.

    Args:
        body (PostApiGatewayV1LegacyEntriesBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiGatewayV1LegacyEntriesResponse200 | V1Error
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LegacyEntriesBody | Unset = UNSET,
) -> Response[PostApiGatewayV1LegacyEntriesResponse200 | V1Error]:
    """Insert entries using the legacy transaction contract

     Compatibility for GraphQL addEntries: Transaction payloads with amount strings, legacy metadata
    accepted but ignored, and explicit-ledger/pin/first-ledger fallback. Uses normal web quotas. No
    preview.

    Args:
        body (PostApiGatewayV1LegacyEntriesBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiGatewayV1LegacyEntriesResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LegacyEntriesBody | Unset = UNSET,
) -> PostApiGatewayV1LegacyEntriesResponse200 | V1Error | None:
    """Insert entries using the legacy transaction contract

     Compatibility for GraphQL addEntries: Transaction payloads with amount strings, legacy metadata
    accepted but ignored, and explicit-ledger/pin/first-ledger fallback. Uses normal web quotas. No
    preview.

    Args:
        body (PostApiGatewayV1LegacyEntriesBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiGatewayV1LegacyEntriesResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
