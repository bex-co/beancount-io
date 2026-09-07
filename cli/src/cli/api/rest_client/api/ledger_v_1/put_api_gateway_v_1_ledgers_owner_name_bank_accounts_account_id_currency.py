from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.bank_account_currency import BankAccountCurrency
from ...models.put_api_gateway_v1_ledgers_owner_name_bank_accounts_account_id_currency_dry_run import (
    PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun,
)
from ...models.v1_error import V1Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    owner: str,
    name: str,
    account_id: str,
    *,
    body: BankAccountCurrency | Unset = UNSET,
    dry_run: PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    json_dry_run: str | Unset = UNSET
    if not isinstance(dry_run, Unset):
        json_dry_run = dry_run.value

    params["dry_run"] = json_dry_run

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/api-gateway/v1/ledgers/{owner}/{name}/bank-accounts/{account_id}/currency".format(
            owner=quote(str(owner), safe=""),
            name=quote(str(name), safe=""),
            account_id=quote(str(account_id), safe=""),
        ),
        "params": params,
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
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
    account_id: str,
    *,
    client: AuthenticatedClient,
    body: BankAccountCurrency | Unset = UNSET,
    dry_run: PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Set a bank account's currency

     Sets the currency its transactions are booked in. No `dry_run`, for the same reason as the mapping
    above.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account_id (str): The bank account's id
        dry_run (PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset):
        body (BankAccountCurrency | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        account_id=account_id,
        body=body,
        dry_run=dry_run,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    owner: str,
    name: str,
    account_id: str,
    *,
    client: AuthenticatedClient,
    body: BankAccountCurrency | Unset = UNSET,
    dry_run: PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset = UNSET,
) -> Any | V1Error | None:
    """Set a bank account's currency

     Sets the currency its transactions are booked in. No `dry_run`, for the same reason as the mapping
    above.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account_id (str): The bank account's id
        dry_run (PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset):
        body (BankAccountCurrency | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | V1Error
    """

    return sync_detailed(
        owner=owner,
        name=name,
        account_id=account_id,
        client=client,
        body=body,
        dry_run=dry_run,
    ).parsed


async def asyncio_detailed(
    owner: str,
    name: str,
    account_id: str,
    *,
    client: AuthenticatedClient,
    body: BankAccountCurrency | Unset = UNSET,
    dry_run: PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset = UNSET,
) -> Response[Any | V1Error]:
    """Set a bank account's currency

     Sets the currency its transactions are booked in. No `dry_run`, for the same reason as the mapping
    above.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account_id (str): The bank account's id
        dry_run (PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset):
        body (BankAccountCurrency | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | V1Error]
    """

    kwargs = _get_kwargs(
        owner=owner,
        name=name,
        account_id=account_id,
        body=body,
        dry_run=dry_run,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    owner: str,
    name: str,
    account_id: str,
    *,
    client: AuthenticatedClient,
    body: BankAccountCurrency | Unset = UNSET,
    dry_run: PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset = UNSET,
) -> Any | V1Error | None:
    """Set a bank account's currency

     Sets the currency its transactions are booked in. No `dry_run`, for the same reason as the mapping
    above.

    Args:
        owner (str): Ledger owner's username Example: alice.
        name (str): Ledger (repository) name Example: main-ledger.
        account_id (str): The bank account's id
        dry_run (PutApiGatewayV1LedgersOwnerNameBankAccountsAccountIdCurrencyDryRun | Unset):
        body (BankAccountCurrency | Unset):

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
            account_id=account_id,
            client=client,
            body=body,
            dry_run=dry_run,
        )
    ).parsed
