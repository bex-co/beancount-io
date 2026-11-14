from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.post_api_gateway_v1_ledgers_owner_name_entries_move_body import (
    PostApiGatewayV1LedgersOwnerNameEntriesMoveBody,
)
from ...models.post_api_gateway_v1_ledgers_owner_name_entries_move_response_200 import (
    PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    *,
    body: PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/entries/move".format(
            owner=quote(str(owner), safe=""),
            name=quote(str(name), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error | None:
    if response.status_code == 200:
        response_200 = PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200.from_dict(response.json())

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
) -> Response[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error]:
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
    body: PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset = UNSET,
) -> Response[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error]:
    """Move entries into another file

     Move entries into another ledger file in one commit: each entry's source text leaves its file byte
    for byte and is appended to toPath in ledger order. listLedgerEntries with include_source returns
    each entry's hash and sha256sum. Refused, writing nothing: a toPath the ledger does not load unless
    includeFrom is given, a stale sha256sum (CONFLICT), an entry already in toPath, and a move that adds
    a bean-check error (VALIDATION_FAILED, unless allowInvalid). `dryRun` previews without committing:
    each moved entry's text and file. POST …/revert-commit undoes the commit.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        body (PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        body=body,
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
    body: PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset = UNSET,
) -> PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error | None:
    """Move entries into another file

     Move entries into another ledger file in one commit: each entry's source text leaves its file byte
    for byte and is appended to toPath in ledger order. listLedgerEntries with include_source returns
    each entry's hash and sha256sum. Refused, writing nothing: a toPath the ledger does not load unless
    includeFrom is given, a stale sha256sum (CONFLICT), an entry already in toPath, and a move that adds
    a bean-check error (VALIDATION_FAILED, unless allowInvalid). `dryRun` previews without committing:
    each moved entry's text and file. POST …/revert-commit undoes the commit.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        body (PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error
    """

    return sync_detailed(
        owner=owner,
        name=name,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset = UNSET,
) -> Response[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error]:
    """Move entries into another file

     Move entries into another ledger file in one commit: each entry's source text leaves its file byte
    for byte and is appended to toPath in ledger order. listLedgerEntries with include_source returns
    each entry's hash and sha256sum. Refused, writing nothing: a toPath the ledger does not load unless
    includeFrom is given, a stale sha256sum (CONFLICT), an entry already in toPath, and a move that adds
    a bean-check error (VALIDATION_FAILED, unless allowInvalid). `dryRun` previews without committing:
    each moved entry's text and file. POST …/revert-commit undoes the commit.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        body (PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    *,
    client: AuthenticatedClient,
    body: PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset = UNSET,
) -> PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error | None:
    """Move entries into another file

     Move entries into another ledger file in one commit: each entry's source text leaves its file byte
    for byte and is appended to toPath in ledger order. listLedgerEntries with include_source returns
    each entry's hash and sha256sum. Refused, writing nothing: a toPath the ledger does not load unless
    includeFrom is given, a stale sha256sum (CONFLICT), an entry already in toPath, and a move that adds
    a bean-check error (VALIDATION_FAILED, unless allowInvalid). `dryRun` previews without committing:
    each moved entry's text and file. POST …/revert-commit undoes the commit.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        body (PostApiGatewayV1LedgersOwnerNameEntriesMoveBody | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200 | V1Error
    """

    return (
        await asyncio_detailed(
            owner=owner,
            name=name,
            client=client,
            body=body,
        )
    ).parsed
