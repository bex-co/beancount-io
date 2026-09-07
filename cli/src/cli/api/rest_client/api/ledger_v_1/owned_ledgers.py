from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.owned_ledgers_response_200_item import OwnedLedgersResponse200Item
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_page: float | None | Unset
    if isinstance(page, Unset):
        json_page = UNSET
    else:
        json_page = page
    params["page"] = json_page

    json_limit: float | None | Unset
    if isinstance(limit, Unset):
        json_limit = UNSET
    else:
        json_limit = limit
    params["limit"] = json_limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/owned",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> V1Error | list[OwnedLedgersResponse200Item] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = OwnedLedgersResponse200Item.from_dict(response_200_item_data)

            response_200.append(response_200_item)

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
) -> Response[V1Error | list[OwnedLedgersResponse200Item]]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
) -> Response[V1Error | list[OwnedLedgersResponse200Item]]:
    """List the caller's owned ledgers

     List the caller's owned ledgers

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[V1Error | list[OwnedLedgersResponse200Item]]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
) -> V1Error | list[OwnedLedgersResponse200Item] | None:
    """List the caller's owned ledgers

     List the caller's owned ledgers

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        V1Error | list[OwnedLedgersResponse200Item]
    """

    return sync_detailed(
        client=client,
        page=page,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
) -> Response[V1Error | list[OwnedLedgersResponse200Item]]:
    """List the caller's owned ledgers

     List the caller's owned ledgers

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[V1Error | list[OwnedLedgersResponse200Item]]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
) -> V1Error | list[OwnedLedgersResponse200Item] | None:
    """List the caller's owned ledgers

     List the caller's owned ledgers

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        V1Error | list[OwnedLedgersResponse200Item]
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            limit=limit,
        )
    ).parsed
