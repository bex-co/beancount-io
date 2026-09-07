from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.post_api_gateway_v1_ledgers_owner_name_banks_item_id_sync_dry_run import (
    PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    item_id: str,
    *,
    dry_run: PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_dry_run: str | Unset = UNSET
    if not isinstance(dry_run, Unset):
        json_dry_run = dry_run.value

    params["dry_run"] = json_dry_run

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/banks/{item_id}/sync".format(
            owner=quote(str(owner), safe=""),
            name=quote(str(name), safe=""),
            item_id=quote(str(item_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | V1Error | None:
    if response.status_code == 200:
        response_200 = response.json()
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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    owner: str,
    name: str,
    item_id: str,
    *,
    client: AuthenticatedClient,
    dry_run: PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Pull new transactions from the bank

     Fetches transactions from the bank into the staging area. `dry_run=true` reports what would arrive
    without storing it or advancing the sync cursor, so the real sync that follows returns the same
    thing.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        item_id (str): The linked bank's item id
        dry_run (PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset): Validate and
            report what would change, without changing anything.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        item_id=item_id,
        dry_run=dry_run,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    owner: str,
    name: str,
    item_id: str,
    *,
    client: AuthenticatedClient,
    dry_run: PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset = UNSET,
) -> Any | V1Error | None:
    """Pull new transactions from the bank

     Fetches transactions from the bank into the staging area. `dry_run=true` reports what would arrive
    without storing it or advancing the sync cursor, so the real sync that follows returns the same
    thing.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        item_id (str): The linked bank's item id
        dry_run (PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset): Validate and
            report what would change, without changing anything.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return sync_detailed(
        owner=owner,
        name=name,
        item_id=item_id,
        client=client,
        dry_run=dry_run,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    item_id: str,
    *,
    client: AuthenticatedClient,
    dry_run: PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Pull new transactions from the bank

     Fetches transactions from the bank into the staging area. `dry_run=true` reports what would arrive
    without storing it or advancing the sync cursor, so the real sync that follows returns the same
    thing.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        item_id (str): The linked bank's item id
        dry_run (PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset): Validate and
            report what would change, without changing anything.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        item_id=item_id,
        dry_run=dry_run,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    item_id: str,
    *,
    client: AuthenticatedClient,
    dry_run: PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset = UNSET,
) -> Any | V1Error | None:
    """Pull new transactions from the bank

     Fetches transactions from the bank into the staging area. `dry_run=true` reports what would arrive
    without storing it or advancing the sync cursor, so the real sync that follows returns the same
    thing.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        item_id (str): The linked bank's item id
        dry_run (PostApiGatewayV1LedgersOwnerNameBanksItemIdSyncDryRun | Unset): Validate and
            report what would change, without changing anything.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return (
        await asyncio_detailed(
            owner=owner,
            name=name,
            item_id=item_id,
            client=client,
            dry_run=dry_run,
        )
    ).parsed
