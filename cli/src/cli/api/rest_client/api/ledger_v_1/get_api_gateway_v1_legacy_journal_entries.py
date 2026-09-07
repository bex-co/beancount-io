from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_api_gateway_v1_legacy_journal_entries_detailed import GetApiGatewayV1LegacyJournalEntriesDetailed
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    first: int | None | Unset = UNSET,
    after: str | Unset = UNSET,
    last: int | None | Unset = UNSET,
    before: str | Unset = UNSET,
    detailed: GetApiGatewayV1LegacyJournalEntriesDetailed | Unset = UNSET,
    search_query: str | Unset = UNSET,
    account_filter: str | Unset = UNSET,
    amount_min: float | None | Unset = UNSET,
    amount_max: float | None | Unset = UNSET,
    entry_types: str | Unset = UNSET,
    sort_by: str | Unset = UNSET,
    sort_order: str | Unset = UNSET,
    group_by: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_first: int | None | Unset
    if isinstance(first, Unset):
        json_first = UNSET
    else:
        json_first = first
    params["first"] = json_first

    params["after"] = after

    json_last: int | None | Unset
    if isinstance(last, Unset):
        json_last = UNSET
    else:
        json_last = last
    params["last"] = json_last

    params["before"] = before

    json_detailed: str | Unset = UNSET
    if not isinstance(detailed, Unset):
        json_detailed = detailed.value

    params["detailed"] = json_detailed

    params["searchQuery"] = search_query

    params["accountFilter"] = account_filter

    json_amount_min: float | None | Unset
    if isinstance(amount_min, Unset):
        json_amount_min = UNSET
    else:
        json_amount_min = amount_min
    params["amountMin"] = json_amount_min

    json_amount_max: float | None | Unset
    if isinstance(amount_max, Unset):
        json_amount_max = UNSET
    else:
        json_amount_max = amount_max
    params["amountMax"] = json_amount_max

    params["entryTypes"] = entry_types

    params["sortBy"] = sort_by

    params["sortOrder"] = sort_order

    params["groupBy"] = group_by

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/legacy/journal-entries",
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
    *,
    client: AuthenticatedClient,
    first: int | None | Unset = UNSET,
    after: str | Unset = UNSET,
    last: int | None | Unset = UNSET,
    before: str | Unset = UNSET,
    detailed: GetApiGatewayV1LegacyJournalEntriesDetailed | Unset = UNSET,
    search_query: str | Unset = UNSET,
    account_filter: str | Unset = UNSET,
    amount_min: float | None | Unset = UNSET,
    amount_max: float | None | Unset = UNSET,
    entry_types: str | Unset = UNSET,
    sort_by: str | Unset = UNSET,
    sort_order: str | Unset = UNSET,
    group_by: str | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Read legacy journal entries

     The journalEntries compatibility contract, including enhanced postings, computed entry fields, and
    cursor metadata. Uses the credential pin or caller's first ledger, as in GraphQL. entryTypes is a
    JSON-encoded string array.

    Args:
        first (int | None | Unset):
        after (str | Unset):
        last (int | None | Unset):
        before (str | Unset):
        detailed (GetApiGatewayV1LegacyJournalEntriesDetailed | Unset):
        search_query (str | Unset):
        account_filter (str | Unset):
        amount_min (float | None | Unset):
        amount_max (float | None | Unset):
        entry_types (str | Unset): JSON-encoded string array, including [] for an empty filter
            list
        sort_by (str | Unset):
        sort_order (str | Unset):
        group_by (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        first=first,
        after=after,
        last=last,
        before=before,
        detailed=detailed,
        search_query=search_query,
        account_filter=account_filter,
        amount_min=amount_min,
        amount_max=amount_max,
        entry_types=entry_types,
        sort_by=sort_by,
        sort_order=sort_order,
        group_by=group_by,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    first: int | None | Unset = UNSET,
    after: str | Unset = UNSET,
    last: int | None | Unset = UNSET,
    before: str | Unset = UNSET,
    detailed: GetApiGatewayV1LegacyJournalEntriesDetailed | Unset = UNSET,
    search_query: str | Unset = UNSET,
    account_filter: str | Unset = UNSET,
    amount_min: float | None | Unset = UNSET,
    amount_max: float | None | Unset = UNSET,
    entry_types: str | Unset = UNSET,
    sort_by: str | Unset = UNSET,
    sort_order: str | Unset = UNSET,
    group_by: str | Unset = UNSET,
) -> Any | V1Error | None:
    """Read legacy journal entries

     The journalEntries compatibility contract, including enhanced postings, computed entry fields, and
    cursor metadata. Uses the credential pin or caller's first ledger, as in GraphQL. entryTypes is a
    JSON-encoded string array.

    Args:
        first (int | None | Unset):
        after (str | Unset):
        last (int | None | Unset):
        before (str | Unset):
        detailed (GetApiGatewayV1LegacyJournalEntriesDetailed | Unset):
        search_query (str | Unset):
        account_filter (str | Unset):
        amount_min (float | None | Unset):
        amount_max (float | None | Unset):
        entry_types (str | Unset): JSON-encoded string array, including [] for an empty filter
            list
        sort_by (str | Unset):
        sort_order (str | Unset):
        group_by (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return sync_detailed(
        client=client,
        first=first,
        after=after,
        last=last,
        before=before,
        detailed=detailed,
        search_query=search_query,
        account_filter=account_filter,
        amount_min=amount_min,
        amount_max=amount_max,
        entry_types=entry_types,
        sort_by=sort_by,
        sort_order=sort_order,
        group_by=group_by,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    first: int | None | Unset = UNSET,
    after: str | Unset = UNSET,
    last: int | None | Unset = UNSET,
    before: str | Unset = UNSET,
    detailed: GetApiGatewayV1LegacyJournalEntriesDetailed | Unset = UNSET,
    search_query: str | Unset = UNSET,
    account_filter: str | Unset = UNSET,
    amount_min: float | None | Unset = UNSET,
    amount_max: float | None | Unset = UNSET,
    entry_types: str | Unset = UNSET,
    sort_by: str | Unset = UNSET,
    sort_order: str | Unset = UNSET,
    group_by: str | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Read legacy journal entries

     The journalEntries compatibility contract, including enhanced postings, computed entry fields, and
    cursor metadata. Uses the credential pin or caller's first ledger, as in GraphQL. entryTypes is a
    JSON-encoded string array.

    Args:
        first (int | None | Unset):
        after (str | Unset):
        last (int | None | Unset):
        before (str | Unset):
        detailed (GetApiGatewayV1LegacyJournalEntriesDetailed | Unset):
        search_query (str | Unset):
        account_filter (str | Unset):
        amount_min (float | None | Unset):
        amount_max (float | None | Unset):
        entry_types (str | Unset): JSON-encoded string array, including [] for an empty filter
            list
        sort_by (str | Unset):
        sort_order (str | Unset):
        group_by (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        first=first,
        after=after,
        last=last,
        before=before,
        detailed=detailed,
        search_query=search_query,
        account_filter=account_filter,
        amount_min=amount_min,
        amount_max=amount_max,
        entry_types=entry_types,
        sort_by=sort_by,
        sort_order=sort_order,
        group_by=group_by,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    first: int | None | Unset = UNSET,
    after: str | Unset = UNSET,
    last: int | None | Unset = UNSET,
    before: str | Unset = UNSET,
    detailed: GetApiGatewayV1LegacyJournalEntriesDetailed | Unset = UNSET,
    search_query: str | Unset = UNSET,
    account_filter: str | Unset = UNSET,
    amount_min: float | None | Unset = UNSET,
    amount_max: float | None | Unset = UNSET,
    entry_types: str | Unset = UNSET,
    sort_by: str | Unset = UNSET,
    sort_order: str | Unset = UNSET,
    group_by: str | Unset = UNSET,
) -> Any | V1Error | None:
    """Read legacy journal entries

     The journalEntries compatibility contract, including enhanced postings, computed entry fields, and
    cursor metadata. Uses the credential pin or caller's first ledger, as in GraphQL. entryTypes is a
    JSON-encoded string array.

    Args:
        first (int | None | Unset):
        after (str | Unset):
        last (int | None | Unset):
        before (str | Unset):
        detailed (GetApiGatewayV1LegacyJournalEntriesDetailed | Unset):
        search_query (str | Unset):
        account_filter (str | Unset):
        amount_min (float | None | Unset):
        amount_max (float | None | Unset):
        entry_types (str | Unset): JSON-encoded string array, including [] for an empty filter
            list
        sort_by (str | Unset):
        sort_order (str | Unset):
        group_by (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            first=first,
            after=after,
            last=last,
            before=before,
            detailed=detailed,
            search_query=search_query,
            account_filter=account_filter,
            amount_min=amount_min,
            amount_max=amount_max,
            entry_types=entry_types,
            sort_by=sort_by,
            sort_order=sort_order,
            group_by=group_by,
        )
    ).parsed
