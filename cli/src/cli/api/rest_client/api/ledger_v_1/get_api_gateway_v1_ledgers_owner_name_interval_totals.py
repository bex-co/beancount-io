from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_ledgers_owner_name_interval_totals_shape import (
    GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    *,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    interval: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    account_name: str | Unset = UNSET,
    shape: GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape
    | Unset = GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["account"] = account

    params["filter"] = filter_

    params["time"] = time

    params["interval"] = interval

    params["conversion"] = conversion

    params["accountName"] = account_name

    json_shape: str | Unset = UNSET
    if not isinstance(shape, Unset):
        json_shape = shape.value

    params["shape"] = json_shape

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/interval-totals".format(
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
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    interval: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    account_name: str | Unset = UNSET,
    shape: GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape
    | Unset = GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY,
) -> Response[Any | V1Error]:
    """Get totals per interval

     Balances grouped by period — the series behind a spending-over-time view, without the view.
    `shape=summary` (the default) states one currency and drops zero accounts; `shape=fava` returns the
    raw per-currency balances.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        filter_ (str | Unset): Fava filter expression Example: #travel.
        time (str | Unset): Fava time expression Example: 2026.
        interval (str | Unset): Period grouping: day, week, month, quarter, or year Example:
            month.
        conversion (str | Unset): Convert postings to this currency before totalling Example: USD.
        account_name (str | Unset): Restrict the totals to one account
        shape (GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape | Unset): summary returns totals
            and non-zero accounts in one currency; fava returns the full chart payload. Default:
            GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY. Example: summary.

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
        filter_=filter_,
        time=time,
        interval=interval,
        conversion=conversion,
        account_name=account_name,
        shape=shape,
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
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    interval: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    account_name: str | Unset = UNSET,
    shape: GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape
    | Unset = GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY,
) -> Any | V1Error | None:
    """Get totals per interval

     Balances grouped by period — the series behind a spending-over-time view, without the view.
    `shape=summary` (the default) states one currency and drops zero accounts; `shape=fava` returns the
    raw per-currency balances.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        filter_ (str | Unset): Fava filter expression Example: #travel.
        time (str | Unset): Fava time expression Example: 2026.
        interval (str | Unset): Period grouping: day, week, month, quarter, or year Example:
            month.
        conversion (str | Unset): Convert postings to this currency before totalling Example: USD.
        account_name (str | Unset): Restrict the totals to one account
        shape (GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape | Unset): summary returns totals
            and non-zero accounts in one currency; fava returns the full chart payload. Default:
            GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY. Example: summary.

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
        filter_=filter_,
        time=time,
        interval=interval,
        conversion=conversion,
        account_name=account_name,
        shape=shape,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    interval: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    account_name: str | Unset = UNSET,
    shape: GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape
    | Unset = GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY,
) -> Response[Any | V1Error]:
    """Get totals per interval

     Balances grouped by period — the series behind a spending-over-time view, without the view.
    `shape=summary` (the default) states one currency and drops zero accounts; `shape=fava` returns the
    raw per-currency balances.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        filter_ (str | Unset): Fava filter expression Example: #travel.
        time (str | Unset): Fava time expression Example: 2026.
        interval (str | Unset): Period grouping: day, week, month, quarter, or year Example:
            month.
        conversion (str | Unset): Convert postings to this currency before totalling Example: USD.
        account_name (str | Unset): Restrict the totals to one account
        shape (GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape | Unset): summary returns totals
            and non-zero accounts in one currency; fava returns the full chart payload. Default:
            GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY. Example: summary.

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
        filter_=filter_,
        time=time,
        interval=interval,
        conversion=conversion,
        account_name=account_name,
        shape=shape,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    interval: str | Unset = UNSET,
    conversion: str | Unset = UNSET,
    account_name: str | Unset = UNSET,
    shape: GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape
    | Unset = GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY,
) -> Any | V1Error | None:
    """Get totals per interval

     Balances grouped by period — the series behind a spending-over-time view, without the view.
    `shape=summary` (the default) states one currency and drops zero accounts; `shape=fava` returns the
    raw per-currency balances.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset): Restrict to one account and its children Example:
            Assets:Bank:Checking.
        filter_ (str | Unset): Fava filter expression Example: #travel.
        time (str | Unset): Fava time expression Example: 2026.
        interval (str | Unset): Period grouping: day, week, month, quarter, or year Example:
            month.
        conversion (str | Unset): Convert postings to this currency before totalling Example: USD.
        account_name (str | Unset): Restrict the totals to one account
        shape (GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape | Unset): summary returns totals
            and non-zero accounts in one currency; fava returns the full chart payload. Default:
            GetApiGatewayV1LedgersOwnerNameIntervalTotalsShape.SUMMARY. Example: summary.

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
            filter_=filter_,
            time=time,
            interval=interval,
            conversion=conversion,
            account_name=account_name,
            shape=shape,
        )
    ).parsed
