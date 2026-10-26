from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_ledgers_owner_name_holdings_group_by import (
    GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    *,
    account: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    group_by: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy
    | Unset = GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["account"] = account

    params["conversion"] = conversion

    json_group_by: str | Unset = UNSET
    if not isinstance(group_by, Unset):
        json_group_by = group_by.value

    params["groupBy"] = json_group_by

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/holdings".format(
            owner=quote(str(owner), safe=""),
            name=quote(str(name), safe=""),
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
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    group_by: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy
    | Unset = GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT,
) -> Response[Any | V1Error]:
    """Get holdings

     Lots grouped by account or commodity — units, average cost, cost basis, market value — valued at
    today's quotes. `conversion` takes a currency or `units` (default: the operating currency when the
    ledger declares exactly one, else each group's held currency); `account` names a parent account or a
    regular expression. Costless cash and fully-sold groups are left out; groups without a quote value
    at cost and are named in `missing_prices`.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        conversion (str | Unset): Convert money columns to this currency, or `units` for each
            group's held currency (default: the operating currency when the ledger declares exactly
            one) Example: USD.
        group_by (GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy | Unset): Group lots by account
            or by commodity Default: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT. Example:
            commodity.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        account=account,
        conversion=conversion,
        group_by=group_by,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    group_by: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy
    | Unset = GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT,
) -> Any | V1Error | None:
    """Get holdings

     Lots grouped by account or commodity — units, average cost, cost basis, market value — valued at
    today's quotes. `conversion` takes a currency or `units` (default: the operating currency when the
    ledger declares exactly one, else each group's held currency); `account` names a parent account or a
    regular expression. Costless cash and fully-sold groups are left out; groups without a quote value
    at cost and are named in `missing_prices`.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        conversion (str | Unset): Convert money columns to this currency, or `units` for each
            group's held currency (default: the operating currency when the ledger declares exactly
            one) Example: USD.
        group_by (GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy | Unset): Group lots by account
            or by commodity Default: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT. Example:
            commodity.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return sync_detailed(
        owner=owner,
        name=name,
        client=client,
        account=account,
        conversion=conversion,
        group_by=group_by,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    group_by: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy
    | Unset = GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT,
) -> Response[Any | V1Error]:
    """Get holdings

     Lots grouped by account or commodity — units, average cost, cost basis, market value — valued at
    today's quotes. `conversion` takes a currency or `units` (default: the operating currency when the
    ledger declares exactly one, else each group's held currency); `account` names a parent account or a
    regular expression. Costless cash and fully-sold groups are left out; groups without a quote value
    at cost and are named in `missing_prices`.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        conversion (str | Unset): Convert money columns to this currency, or `units` for each
            group's held currency (default: the operating currency when the ledger declares exactly
            one) Example: USD.
        group_by (GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy | Unset): Group lots by account
            or by commodity Default: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT. Example:
            commodity.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        account=account,
        conversion=conversion,
        group_by=group_by,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    group_by: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy
    | Unset = GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT,
) -> Any | V1Error | None:
    """Get holdings

     Lots grouped by account or commodity — units, average cost, cost basis, market value — valued at
    today's quotes. `conversion` takes a currency or `units` (default: the operating currency when the
    ledger declares exactly one, else each group's held currency); `account` names a parent account or a
    regular expression. Costless cash and fully-sold groups are left out; groups without a quote value
    at cost and are named in `missing_prices`.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        conversion (str | Unset): Convert money columns to this currency, or `units` for each
            group's held currency (default: the operating currency when the ledger declares exactly
            one) Example: USD.
        group_by (GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy | Unset): Group lots by account
            or by commodity Default: GetApiGatewayV1LedgersOwnerNameHoldingsGroupBy.ACCOUNT. Example:
            commodity.

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
            client=client,
            account=account,
            conversion=conversion,
            group_by=group_by,
        )
    ).parsed
