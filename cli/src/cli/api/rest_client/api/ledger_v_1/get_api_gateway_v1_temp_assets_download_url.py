from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_temp_assets_download_url_response_200 import (
    GetApiGatewayV1TempAssetsDownloadUrlResponse200,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response


def _get_kwargs(
    *,
    object_key: str,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["objectKey"] = object_key

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/temp-assets/download-url",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = GetApiGatewayV1TempAssetsDownloadUrlResponse200.from_dict(response.json())

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
) -> Response[GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    object_key: str,
) -> Response[GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error]:
    """Create a download URL for the caller's temporary asset

     Authorize ownership of objectKey and presign a GET using the configured download lifetime. No ledger
    selector is required.

    Args:
        object_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        object_key=object_key,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    object_key: str,
) -> GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error | None:
    """Create a download URL for the caller's temporary asset

     Authorize ownership of objectKey and presign a GET using the configured download lifetime. No ledger
    selector is required.

    Args:
        object_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error
    """

    return sync_detailed(
        client=client,
        object_key=object_key,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    object_key: str,
) -> Response[GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error]:
    """Create a download URL for the caller's temporary asset

     Authorize ownership of objectKey and presign a GET using the configured download lifetime. No ledger
    selector is required.

    Args:
        object_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        object_key=object_key,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    object_key: str,
) -> GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error | None:
    """Create a download URL for the caller's temporary asset

     Authorize ownership of objectKey and presign a GET using the configured download lifetime. No ledger
    selector is required.

    Args:
        object_key (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetApiGatewayV1TempAssetsDownloadUrlResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            object_key=object_key,
        )
    ).parsed
