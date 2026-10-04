from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_public_keys_key_id_response_200 import GetApiGatewayV1PublicKeysKeyIdResponse200
from ...models.v1_error import V1Error
from ...types import Response


def _get_kwargs(
    key_id: int,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/public-keys/{key_id}".format(
            key_id=quote(str(key_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = GetApiGatewayV1PublicKeysKeyIdResponse200.from_dict(response.json())

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
) -> Response[GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    key_id: int,
    *,
    client: AuthenticatedClient,
) -> Response[GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error]:
    """Read the caller's SSH public key

     Administrative account operation. The key is fetched using the authenticated user's key API.

    Args:
        key_id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        key_id=key_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    key_id: int,
    *,
    client: AuthenticatedClient,
) -> GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error | None:
    """Read the caller's SSH public key

     Administrative account operation. The key is fetched using the authenticated user's key API.

    Args:
        key_id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error
    """

    return sync_detailed(
        key_id=key_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    key_id: int,
    *,
    client: AuthenticatedClient,
) -> Response[GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error]:
    """Read the caller's SSH public key

     Administrative account operation. The key is fetched using the authenticated user's key API.

    Args:
        key_id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        key_id=key_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    key_id: int,
    *,
    client: AuthenticatedClient,
) -> GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error | None:
    """Read the caller's SSH public key

     Administrative account operation. The key is fetched using the authenticated user's key API.

    Args:
        key_id (int):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1PublicKeysKeyIdResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            key_id=key_id,
            client=client,
        )
    ).parsed
