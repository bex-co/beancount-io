from http import HTTPStatus
from typing import Any, cast

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_user_profile_response_200_type_0 import GetUserProfileResponse200Type0
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    user_id: None | str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_user_id: None | str | Unset
    if isinstance(user_id, Unset):
        json_user_id = UNSET
    else:
        json_user_id = user_id
    params["userId"] = json_user_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api-gateway/v1/user-profile",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> GetUserProfileResponse200Type0 | None | V1Error | None:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> GetUserProfileResponse200Type0 | None:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                response_200_type_0 = GetUserProfileResponse200Type0.from_dict(data)

                return response_200_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GetUserProfileResponse200Type0 | None, data)

        response_200 = _parse_response_200(response.json())

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
) -> Response[GetUserProfileResponse200Type0 | None | V1Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    user_id: None | str | Unset = UNSET,
) -> Response[GetUserProfileResponse200Type0 | None | V1Error]:
    """Read the current user's profile

     Returns null without an authenticated identity or when the user no longer exists. A supplied userId
    must identify the caller; the shared account service enforces scope and exact-self authority.

    Args:
        user_id (None | str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetUserProfileResponse200Type0 | None | V1Error]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    user_id: None | str | Unset = UNSET,
) -> GetUserProfileResponse200Type0 | None | V1Error | None:
    """Read the current user's profile

     Returns null without an authenticated identity or when the user no longer exists. A supplied userId
    must identify the caller; the shared account service enforces scope and exact-self authority.

    Args:
        user_id (None | str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetUserProfileResponse200Type0 | None | V1Error
    """

    return sync_detailed(
        client=client,
        user_id=user_id,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    user_id: None | str | Unset = UNSET,
) -> Response[GetUserProfileResponse200Type0 | None | V1Error]:
    """Read the current user's profile

     Returns null without an authenticated identity or when the user no longer exists. A supplied userId
    must identify the caller; the shared account service enforces scope and exact-self authority.

    Args:
        user_id (None | str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[GetUserProfileResponse200Type0 | None | V1Error]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    user_id: None | str | Unset = UNSET,
) -> GetUserProfileResponse200Type0 | None | V1Error | None:
    """Read the current user's profile

     Returns null without an authenticated identity or when the user no longer exists. A supplied userId
    must identify the caller; the shared account service enforces scope and exact-self authority.

    Args:
        user_id (None | str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetUserProfileResponse200Type0 | None | V1Error
    """

    return (
        await asyncio_detailed(
            client=client,
            user_id=user_id,
        )
    ).parsed
