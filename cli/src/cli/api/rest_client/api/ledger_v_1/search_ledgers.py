from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.search_ledgers_archived import SearchLedgersArchived
from ...models.search_ledgers_exclusive import SearchLedgersExclusive
from ...models.search_ledgers_include_desc import SearchLedgersIncludeDesc
from ...models.search_ledgers_is_private import SearchLedgersIsPrivate
from ...models.search_ledgers_private import SearchLedgersPrivate
from ...models.search_ledgers_response_200_item import SearchLedgersResponse200Item
from ...models.search_ledgers_template import SearchLedgersTemplate
from ...models.search_ledgers_topic import SearchLedgersTopic
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
    q: str | Unset = UNSET,
    topic: SearchLedgersTopic | Unset = UNSET,
    include_desc: SearchLedgersIncludeDesc | Unset = UNSET,
    uid: float | None | Unset = UNSET,
    priority_owner_id: float | None | Unset = UNSET,
    team_id: float | None | Unset = UNSET,
    starred_by: float | None | Unset = UNSET,
    private: SearchLedgersPrivate | Unset = UNSET,
    is_private: SearchLedgersIsPrivate | Unset = UNSET,
    template: SearchLedgersTemplate | Unset = UNSET,
    archived: SearchLedgersArchived | Unset = UNSET,
    mode: str | Unset = UNSET,
    exclusive: SearchLedgersExclusive | Unset = UNSET,
    sort: str | Unset = UNSET,
    order: str | Unset = UNSET,
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

    params["q"] = q

    json_topic: str | Unset = UNSET
    if not isinstance(topic, Unset):
        json_topic = topic.value

    params["topic"] = json_topic

    json_include_desc: str | Unset = UNSET
    if not isinstance(include_desc, Unset):
        json_include_desc = include_desc.value

    params["includeDesc"] = json_include_desc

    json_uid: float | None | Unset
    if isinstance(uid, Unset):
        json_uid = UNSET
    else:
        json_uid = uid
    params["uid"] = json_uid

    json_priority_owner_id: float | None | Unset
    if isinstance(priority_owner_id, Unset):
        json_priority_owner_id = UNSET
    else:
        json_priority_owner_id = priority_owner_id
    params["priorityOwnerId"] = json_priority_owner_id

    json_team_id: float | None | Unset
    if isinstance(team_id, Unset):
        json_team_id = UNSET
    else:
        json_team_id = team_id
    params["teamId"] = json_team_id

    json_starred_by: float | None | Unset
    if isinstance(starred_by, Unset):
        json_starred_by = UNSET
    else:
        json_starred_by = starred_by
    params["starredBy"] = json_starred_by

    json_private: str | Unset = UNSET
    if not isinstance(private, Unset):
        json_private = private.value

    params["private"] = json_private

    json_is_private: str | Unset = UNSET
    if not isinstance(is_private, Unset):
        json_is_private = is_private.value

    params["isPrivate"] = json_is_private

    json_template: str | Unset = UNSET
    if not isinstance(template, Unset):
        json_template = template.value

    params["template"] = json_template

    json_archived: str | Unset = UNSET
    if not isinstance(archived, Unset):
        json_archived = archived.value

    params["archived"] = json_archived

    params["mode"] = mode

    json_exclusive: str | Unset = UNSET
    if not isinstance(exclusive, Unset):
        json_exclusive = exclusive.value

    params["exclusive"] = json_exclusive

    params["sort"] = sort

    params["order"] = order

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/search",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> V1Error | list[SearchLedgersResponse200Item] | None:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:
            response_200_item = SearchLedgersResponse200Item.from_dict(response_200_item_data)

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
) -> Response[V1Error | list[SearchLedgersResponse200Item]]:
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
    q: str | Unset = UNSET,
    topic: SearchLedgersTopic | Unset = UNSET,
    include_desc: SearchLedgersIncludeDesc | Unset = UNSET,
    uid: float | None | Unset = UNSET,
    priority_owner_id: float | None | Unset = UNSET,
    team_id: float | None | Unset = UNSET,
    starred_by: float | None | Unset = UNSET,
    private: SearchLedgersPrivate | Unset = UNSET,
    is_private: SearchLedgersIsPrivate | Unset = UNSET,
    template: SearchLedgersTemplate | Unset = UNSET,
    archived: SearchLedgersArchived | Unset = UNSET,
    mode: str | Unset = UNSET,
    exclusive: SearchLedgersExclusive | Unset = UNSET,
    sort: str | Unset = UNSET,
    order: str | Unset = UNSET,
) -> Response[V1Error | list[SearchLedgersResponse200Item]]:
    """Search ledgers with ownership, visibility, sorting, and pagination filters

     Search ledgers with ownership, visibility, sorting, and pagination filters

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):
        q (str | Unset):
        topic (SearchLedgersTopic | Unset):
        include_desc (SearchLedgersIncludeDesc | Unset):
        uid (float | None | Unset):
        priority_owner_id (float | None | Unset):
        team_id (float | None | Unset):
        starred_by (float | None | Unset):
        private (SearchLedgersPrivate | Unset):
        is_private (SearchLedgersIsPrivate | Unset):
        template (SearchLedgersTemplate | Unset):
        archived (SearchLedgersArchived | Unset):
        mode (str | Unset):
        exclusive (SearchLedgersExclusive | Unset):
        sort (str | Unset):
        order (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[V1Error | list[SearchLedgersResponse200Item]]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
        q=q,
        topic=topic,
        include_desc=include_desc,
        uid=uid,
        priority_owner_id=priority_owner_id,
        team_id=team_id,
        starred_by=starred_by,
        private=private,
        is_private=is_private,
        template=template,
        archived=archived,
        mode=mode,
        exclusive=exclusive,
        sort=sort,
        order=order,
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
    q: str | Unset = UNSET,
    topic: SearchLedgersTopic | Unset = UNSET,
    include_desc: SearchLedgersIncludeDesc | Unset = UNSET,
    uid: float | None | Unset = UNSET,
    priority_owner_id: float | None | Unset = UNSET,
    team_id: float | None | Unset = UNSET,
    starred_by: float | None | Unset = UNSET,
    private: SearchLedgersPrivate | Unset = UNSET,
    is_private: SearchLedgersIsPrivate | Unset = UNSET,
    template: SearchLedgersTemplate | Unset = UNSET,
    archived: SearchLedgersArchived | Unset = UNSET,
    mode: str | Unset = UNSET,
    exclusive: SearchLedgersExclusive | Unset = UNSET,
    sort: str | Unset = UNSET,
    order: str | Unset = UNSET,
) -> V1Error | list[SearchLedgersResponse200Item] | None:
    """Search ledgers with ownership, visibility, sorting, and pagination filters

     Search ledgers with ownership, visibility, sorting, and pagination filters

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):
        q (str | Unset):
        topic (SearchLedgersTopic | Unset):
        include_desc (SearchLedgersIncludeDesc | Unset):
        uid (float | None | Unset):
        priority_owner_id (float | None | Unset):
        team_id (float | None | Unset):
        starred_by (float | None | Unset):
        private (SearchLedgersPrivate | Unset):
        is_private (SearchLedgersIsPrivate | Unset):
        template (SearchLedgersTemplate | Unset):
        archived (SearchLedgersArchived | Unset):
        mode (str | Unset):
        exclusive (SearchLedgersExclusive | Unset):
        sort (str | Unset):
        order (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        V1Error | list[SearchLedgersResponse200Item]
    """

    return sync_detailed(
        client=client,
        page=page,
        limit=limit,
        q=q,
        topic=topic,
        include_desc=include_desc,
        uid=uid,
        priority_owner_id=priority_owner_id,
        team_id=team_id,
        starred_by=starred_by,
        private=private,
        is_private=is_private,
        template=template,
        archived=archived,
        mode=mode,
        exclusive=exclusive,
        sort=sort,
        order=order,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
    q: str | Unset = UNSET,
    topic: SearchLedgersTopic | Unset = UNSET,
    include_desc: SearchLedgersIncludeDesc | Unset = UNSET,
    uid: float | None | Unset = UNSET,
    priority_owner_id: float | None | Unset = UNSET,
    team_id: float | None | Unset = UNSET,
    starred_by: float | None | Unset = UNSET,
    private: SearchLedgersPrivate | Unset = UNSET,
    is_private: SearchLedgersIsPrivate | Unset = UNSET,
    template: SearchLedgersTemplate | Unset = UNSET,
    archived: SearchLedgersArchived | Unset = UNSET,
    mode: str | Unset = UNSET,
    exclusive: SearchLedgersExclusive | Unset = UNSET,
    sort: str | Unset = UNSET,
    order: str | Unset = UNSET,
) -> Response[V1Error | list[SearchLedgersResponse200Item]]:
    """Search ledgers with ownership, visibility, sorting, and pagination filters

     Search ledgers with ownership, visibility, sorting, and pagination filters

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):
        q (str | Unset):
        topic (SearchLedgersTopic | Unset):
        include_desc (SearchLedgersIncludeDesc | Unset):
        uid (float | None | Unset):
        priority_owner_id (float | None | Unset):
        team_id (float | None | Unset):
        starred_by (float | None | Unset):
        private (SearchLedgersPrivate | Unset):
        is_private (SearchLedgersIsPrivate | Unset):
        template (SearchLedgersTemplate | Unset):
        archived (SearchLedgersArchived | Unset):
        mode (str | Unset):
        exclusive (SearchLedgersExclusive | Unset):
        sort (str | Unset):
        order (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[V1Error | list[SearchLedgersResponse200Item]]
    """

    kwargs = _get_kwargs(
        page=page,
        limit=limit,
        q=q,
        topic=topic,
        include_desc=include_desc,
        uid=uid,
        priority_owner_id=priority_owner_id,
        team_id=team_id,
        starred_by=starred_by,
        private=private,
        is_private=is_private,
        template=template,
        archived=archived,
        mode=mode,
        exclusive=exclusive,
        sort=sort,
        order=order,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: float | None | Unset = UNSET,
    limit: float | None | Unset = UNSET,
    q: str | Unset = UNSET,
    topic: SearchLedgersTopic | Unset = UNSET,
    include_desc: SearchLedgersIncludeDesc | Unset = UNSET,
    uid: float | None | Unset = UNSET,
    priority_owner_id: float | None | Unset = UNSET,
    team_id: float | None | Unset = UNSET,
    starred_by: float | None | Unset = UNSET,
    private: SearchLedgersPrivate | Unset = UNSET,
    is_private: SearchLedgersIsPrivate | Unset = UNSET,
    template: SearchLedgersTemplate | Unset = UNSET,
    archived: SearchLedgersArchived | Unset = UNSET,
    mode: str | Unset = UNSET,
    exclusive: SearchLedgersExclusive | Unset = UNSET,
    sort: str | Unset = UNSET,
    order: str | Unset = UNSET,
) -> V1Error | list[SearchLedgersResponse200Item] | None:
    """Search ledgers with ownership, visibility, sorting, and pagination filters

     Search ledgers with ownership, visibility, sorting, and pagination filters

    Args:
        page (float | None | Unset):
        limit (float | None | Unset):
        q (str | Unset):
        topic (SearchLedgersTopic | Unset):
        include_desc (SearchLedgersIncludeDesc | Unset):
        uid (float | None | Unset):
        priority_owner_id (float | None | Unset):
        team_id (float | None | Unset):
        starred_by (float | None | Unset):
        private (SearchLedgersPrivate | Unset):
        is_private (SearchLedgersIsPrivate | Unset):
        template (SearchLedgersTemplate | Unset):
        archived (SearchLedgersArchived | Unset):
        mode (str | Unset):
        exclusive (SearchLedgersExclusive | Unset):
        sort (str | Unset):
        order (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        V1Error | list[SearchLedgersResponse200Item]
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            limit=limit,
            q=q,
            topic=topic,
            include_desc=include_desc,
            uid=uid,
            priority_owner_id=priority_owner_id,
            team_id=team_id,
            starred_by=starred_by,
            private=private,
            is_private=is_private,
            template=template,
            archived=archived,
            mode=mode,
            exclusive=exclusive,
            sort=sort,
            order=order,
        )
    ).parsed
