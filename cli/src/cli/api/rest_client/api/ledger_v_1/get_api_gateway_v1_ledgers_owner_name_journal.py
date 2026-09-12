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
    limit: int | Unset = UNSET,
    offset: int | None | Unset = UNSET,
    directive_types: str | Unset = UNSET,
    transaction_subtypes: str | Unset = UNSET,
    document_subtypes: str | Unset = UNSET,
    custom_subtypes: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["account"] = account

    params["filter"] = filter_

    params["time"] = time

    params["limit"] = limit

    json_offset: int | None | Unset
    if isinstance(offset, Unset):
        json_offset = UNSET
    else:
        json_offset = offset
    params["offset"] = json_offset

    params["directiveTypes"] = directive_types

    params["transactionSubtypes"] = transaction_subtypes

    params["documentSubtypes"] = document_subtypes

    params["customSubtypes"] = custom_subtypes

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/journal".format(
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
    limit: int | Unset = UNSET,
    offset: int | None | Unset = UNSET,
    directive_types: str | Unset = UNSET,
    transaction_subtypes: str | Unset = UNSET,
    document_subtypes: str | Unset = UNSET,
    custom_subtypes: str | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Read the journal with pagination and all subtype filters

     Read the journal with pagination and all subtype filters

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Fava time expression: a day (2026-09-05), month (2026-09), year, or
            range. It bounds transactions only — undated structural directives such as `open` and
            `close` carry the epoch date and appear in every window, so a single-day journal still
            lists them. Use directiveTypes to ask for transactions alone.
        limit (int | Unset):
        offset (int | None | Unset):
        directive_types (str | Unset): JSON-encoded directive kinds to include, e.g.
            ["Transaction"]. Omitted, every kind is returned — including the epoch-dated
            `open`/`close` directives that fall inside any time window.
        transaction_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        document_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        custom_subtypes (str | Unset): JSON-encoded string array, including [] for an empty filter
            list

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
        limit=limit,
        offset=offset,
        directive_types=directive_types,
        transaction_subtypes=transaction_subtypes,
        document_subtypes=document_subtypes,
        custom_subtypes=custom_subtypes,
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
    limit: int | Unset = UNSET,
    offset: int | None | Unset = UNSET,
    directive_types: str | Unset = UNSET,
    transaction_subtypes: str | Unset = UNSET,
    document_subtypes: str | Unset = UNSET,
    custom_subtypes: str | Unset = UNSET,
) -> Any | V1Error | None:
    """Read the journal with pagination and all subtype filters

     Read the journal with pagination and all subtype filters

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Fava time expression: a day (2026-09-05), month (2026-09), year, or
            range. It bounds transactions only — undated structural directives such as `open` and
            `close` carry the epoch date and appear in every window, so a single-day journal still
            lists them. Use directiveTypes to ask for transactions alone.
        limit (int | Unset):
        offset (int | None | Unset):
        directive_types (str | Unset): JSON-encoded directive kinds to include, e.g.
            ["Transaction"]. Omitted, every kind is returned — including the epoch-dated
            `open`/`close` directives that fall inside any time window.
        transaction_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        document_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        custom_subtypes (str | Unset): JSON-encoded string array, including [] for an empty filter
            list

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
        limit=limit,
        offset=offset,
        directive_types=directive_types,
        transaction_subtypes=transaction_subtypes,
        document_subtypes=document_subtypes,
        custom_subtypes=custom_subtypes,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    account: str | Unset = UNSET,
    filter_: str | Unset = UNSET,
    time: str | Unset = UNSET,
    limit: int | Unset = UNSET,
    offset: int | None | Unset = UNSET,
    directive_types: str | Unset = UNSET,
    transaction_subtypes: str | Unset = UNSET,
    document_subtypes: str | Unset = UNSET,
    custom_subtypes: str | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Read the journal with pagination and all subtype filters

     Read the journal with pagination and all subtype filters

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Fava time expression: a day (2026-09-05), month (2026-09), year, or
            range. It bounds transactions only — undated structural directives such as `open` and
            `close` carry the epoch date and appear in every window, so a single-day journal still
            lists them. Use directiveTypes to ask for transactions alone.
        limit (int | Unset):
        offset (int | None | Unset):
        directive_types (str | Unset): JSON-encoded directive kinds to include, e.g.
            ["Transaction"]. Omitted, every kind is returned — including the epoch-dated
            `open`/`close` directives that fall inside any time window.
        transaction_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        document_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        custom_subtypes (str | Unset): JSON-encoded string array, including [] for an empty filter
            list

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
        limit=limit,
        offset=offset,
        directive_types=directive_types,
        transaction_subtypes=transaction_subtypes,
        document_subtypes=document_subtypes,
        custom_subtypes=custom_subtypes,
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
    limit: int | Unset = UNSET,
    offset: int | None | Unset = UNSET,
    directive_types: str | Unset = UNSET,
    transaction_subtypes: str | Unset = UNSET,
    document_subtypes: str | Unset = UNSET,
    custom_subtypes: str | Unset = UNSET,
) -> Any | V1Error | None:
    """Read the journal with pagination and all subtype filters

     Read the journal with pagination and all subtype filters

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account (str | Unset):
        filter_ (str | Unset):
        time (str | Unset): Fava time expression: a day (2026-09-05), month (2026-09), year, or
            range. It bounds transactions only — undated structural directives such as `open` and
            `close` carry the epoch date and appear in every window, so a single-day journal still
            lists them. Use directiveTypes to ask for transactions alone.
        limit (int | Unset):
        offset (int | None | Unset):
        directive_types (str | Unset): JSON-encoded directive kinds to include, e.g.
            ["Transaction"]. Omitted, every kind is returned — including the epoch-dated
            `open`/`close` directives that fall inside any time window.
        transaction_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        document_subtypes (str | Unset): JSON-encoded string array, including [] for an empty
            filter list
        custom_subtypes (str | Unset): JSON-encoded string array, including [] for an empty filter
            list

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
            limit=limit,
            offset=offset,
            directive_types=directive_types,
            transaction_subtypes=transaction_subtypes,
            document_subtypes=document_subtypes,
            custom_subtypes=custom_subtypes,
        )
    ).parsed
