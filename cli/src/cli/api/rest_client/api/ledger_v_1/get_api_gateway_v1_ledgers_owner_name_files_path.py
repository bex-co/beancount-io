from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.ledger_file import LedgerFile
from ...models.v1_error import V1Error
from ...types import Response


def _get_kwargs(
    owner: str,
    name: str,
    path: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/files/{path}".format(
            owner=quote(str(owner), safe=""),
            name=quote(str(name), safe=""),
            path=quote(str(path), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> LedgerFile | V1Error | None:
    if response.status_code == 200:
        response_200 = LedgerFile.from_dict(response.json())

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
) -> Response[LedgerFile | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    owner: str,
    name: str,
    path: str,
    *,
    client: AuthenticatedClient,
) -> Response[LedgerFile | V1Error]:
    """Read a file

     The file's content as UTF-8 text, with the blob SHA to pass back when updating it.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        path (str): Path of the file within the ledger repository. May contain slashes. Example:
            2026/january.bean.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[LedgerFile | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        path=path,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    owner: str,
    name: str,
    path: str,
    *,
    client: AuthenticatedClient,
) -> LedgerFile | V1Error | None:
    """Read a file

     The file's content as UTF-8 text, with the blob SHA to pass back when updating it.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        path (str): Path of the file within the ledger repository. May contain slashes. Example:
            2026/january.bean.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        LedgerFile | V1Error
    """

    return sync_detailed(
        owner=owner,
        name=name,
        path=path,
        client=client,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    path: str,
    *,
    client: AuthenticatedClient,
) -> Response[LedgerFile | V1Error]:
    """Read a file

     The file's content as UTF-8 text, with the blob SHA to pass back when updating it.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        path (str): Path of the file within the ledger repository. May contain slashes. Example:
            2026/january.bean.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[LedgerFile | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        path=path,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    path: str,
    *,
    client: AuthenticatedClient,
) -> LedgerFile | V1Error | None:
    """Read a file

     The file's content as UTF-8 text, with the blob SHA to pass back when updating it.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        path (str): Path of the file within the ledger repository. May contain slashes. Example:
            2026/january.bean.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        LedgerFile | V1Error
    """

    return (
        await asyncio_detailed(
            owner=owner,
            name=name,
            path=path,
            client=client,
        )
    ).parsed
