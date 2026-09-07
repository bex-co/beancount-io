from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_api_key import CreateApiKey
from ...models.minted_api_key import MintedApiKey
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: CreateApiKey | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api-gateway/v1/api-keys",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> MintedApiKey | V1Error | None:
    if response.status_code == 200:
        response_200 = MintedApiKey.from_dict(response.json())

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
) -> Response[MintedApiKey | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    body: CreateApiKey | Unset = UNSET,
) -> Response[MintedApiKey | V1Error]:
    """Mint an API key

     Creates a key and returns its plaintext, which is shown here and never again. Requires a paid plan,
    and cannot be called with an API key — sign in, or use an OAuth grant.

    Args:
        body (CreateApiKey | Unset): A new API key to mint

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[MintedApiKey | V1Error]
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
    body: CreateApiKey | Unset = UNSET,
) -> MintedApiKey | V1Error | None:
    """Mint an API key

     Creates a key and returns its plaintext, which is shown here and never again. Requires a paid plan,
    and cannot be called with an API key — sign in, or use an OAuth grant.

    Args:
        body (CreateApiKey | Unset): A new API key to mint

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        MintedApiKey | V1Error
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    body: CreateApiKey | Unset = UNSET,
) -> Response[MintedApiKey | V1Error]:
    """Mint an API key

     Creates a key and returns its plaintext, which is shown here and never again. Requires a paid plan,
    and cannot be called with an API key — sign in, or use an OAuth grant.

    Args:
        body (CreateApiKey | Unset): A new API key to mint

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[MintedApiKey | V1Error]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    body: CreateApiKey | Unset = UNSET,
) -> MintedApiKey | V1Error | None:
    """Mint an API key

     Creates a key and returns its plaintext, which is shown here and never again. Requires a paid plan,
    and cannot be called with an API key — sign in, or use an OAuth grant.

    Args:
        body (CreateApiKey | Unset): A new API key to mint

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        MintedApiKey | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
