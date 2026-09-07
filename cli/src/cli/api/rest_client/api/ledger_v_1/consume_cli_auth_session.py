from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.consume_cli_auth_session_response_200 import ConsumeCliAuthSessionResponse200
from ...models.v1_error import V1Error
from ...types import Response


def _get_kwargs(
    device_code: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api-gateway/v1/cli-sessions/{device_code}/consume".format(
            device_code=quote(str(device_code), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> ConsumeCliAuthSessionResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = ConsumeCliAuthSessionResponse200.from_dict(response.json())

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
) -> Response[ConsumeCliAuthSessionResponse200 | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    device_code: str,
    *,
    client: AuthenticatedClient,
) -> Response[ConsumeCliAuthSessionResponse200 | V1Error]:
    """Retrieve and consume the token from an authorized CLI session

     Single-use, and only redeemable by the device code the session was created with. The returned token
    is a 30-day CLI session credential; store it with owner-only file permissions.

    Args:
        device_code (str): The private verifier returned when the session was created.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ConsumeCliAuthSessionResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        device_code=device_code,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    device_code: str,
    *,
    client: AuthenticatedClient,
) -> ConsumeCliAuthSessionResponse200 | V1Error | None:
    """Retrieve and consume the token from an authorized CLI session

     Single-use, and only redeemable by the device code the session was created with. The returned token
    is a 30-day CLI session credential; store it with owner-only file permissions.

    Args:
        device_code (str): The private verifier returned when the session was created.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ConsumeCliAuthSessionResponse200 | V1Error
    """

    return sync_detailed(
        device_code=device_code,
        client=client,
    ).parsed


async def asyncio_detailed(
    device_code: str,
    *,
    client: AuthenticatedClient,
) -> Response[ConsumeCliAuthSessionResponse200 | V1Error]:
    """Retrieve and consume the token from an authorized CLI session

     Single-use, and only redeemable by the device code the session was created with. The returned token
    is a 30-day CLI session credential; store it with owner-only file permissions.

    Args:
        device_code (str): The private verifier returned when the session was created.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[ConsumeCliAuthSessionResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        device_code=device_code,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    device_code: str,
    *,
    client: AuthenticatedClient,
) -> ConsumeCliAuthSessionResponse200 | V1Error | None:
    """Retrieve and consume the token from an authorized CLI session

     Single-use, and only redeemable by the device code the session was created with. The returned token
    is a 30-day CLI session credential; store it with owner-only file permissions.

    Args:
        device_code (str): The private verifier returned when the session was created.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ConsumeCliAuthSessionResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            device_code=device_code,
            client=client,
        )
    ).parsed
