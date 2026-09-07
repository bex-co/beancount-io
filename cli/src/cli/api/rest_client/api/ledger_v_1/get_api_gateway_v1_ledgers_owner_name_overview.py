from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    *,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    conversion: str | Unset = "USD",
    interval: str | Unset = "monthly",
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["account"] = account

    params["filter"] = filter_

    params["time"] = time

    params["conversion"] = conversion

    params["interval"] = interval

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/overview".format(
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
    conversion: str | Unset = "USD",
    interval: str | Unset = "monthly",
) -> Response[Any | V1Error]:
    """Get the ledger overview

     Net worth, account hierarchies, and income/expense series with the full reporting filters.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Reporting period as a Fava time expression Example: 2026-01-01 -
            2026-12-31.
        conversion (str | Unset): Convert amounts to this currency Default: 'USD'. Example: USD.
        interval (str | Unset): Bucket the period: day, week, month, quarter, year Default:
            'monthly'. Example: month.

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
        conversion=conversion,
        interval=interval,
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
    conversion: str | Unset = "USD",
    interval: str | Unset = "monthly",
) -> Any | V1Error | None:
    """Get the ledger overview

     Net worth, account hierarchies, and income/expense series with the full reporting filters.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Reporting period as a Fava time expression Example: 2026-01-01 -
            2026-12-31.
        conversion (str | Unset): Convert amounts to this currency Default: 'USD'. Example: USD.
        interval (str | Unset): Bucket the period: day, week, month, quarter, year Default:
            'monthly'. Example: month.

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
        conversion=conversion,
        interval=interval,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    conversion: str | Unset = "USD",
    interval: str | Unset = "monthly",
) -> Response[Any | V1Error]:
    """Get the ledger overview

     Net worth, account hierarchies, and income/expense series with the full reporting filters.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Reporting period as a Fava time expression Example: 2026-01-01 -
            2026-12-31.
        conversion (str | Unset): Convert amounts to this currency Default: 'USD'. Example: USD.
        interval (str | Unset): Bucket the period: day, week, month, quarter, year Default:
            'monthly'. Example: month.

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
        conversion=conversion,
        interval=interval,
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
    conversion: str | Unset = "USD",
    interval: str | Unset = "monthly",
) -> Any | V1Error | None:
    """Get the ledger overview

     Net worth, account hierarchies, and income/expense series with the full reporting filters.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Reporting period as a Fava time expression Example: 2026-01-01 -
            2026-12-31.
        conversion (str | Unset): Convert amounts to this currency Default: 'USD'. Example: USD.
        interval (str | Unset): Bucket the period: day, week, month, quarter, year Default:
            'monthly'. Example: month.

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
            conversion=conversion,
            interval=interval,
        )
    ).parsed
