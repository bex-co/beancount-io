from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..models.preview_ledger_setup_body_setup_accounts_item_opening_state import (
    PreviewLedgerSetupBodySetupAccountsItemOpeningState,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="PreviewLedgerSetupBodySetupAccountsItem")


@_attrs_define
class PreviewLedgerSetupBodySetupAccountsItem:
    """
    Attributes:
        name (str):
        currency (str | Unset):
        opening_state (PreviewLedgerSetupBodySetupAccountsItemOpeningState | Unset): unknown (default): no opening
            balance; zero: confirmed zero start; known: opening transaction the day before historyStart, from amount.
        amount (str | Unset): Only with openingState known; unsigned on a liability means owed.
    """

    name: str
    currency: str | Unset = UNSET
    opening_state: PreviewLedgerSetupBodySetupAccountsItemOpeningState | Unset = UNSET
    amount: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        currency = self.currency

        opening_state: str | Unset = UNSET
        if not isinstance(self.opening_state, Unset):
            opening_state = self.opening_state.value

        amount = self.amount

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "name": name,
            }
        )
        if currency is not UNSET:
            field_dict["currency"] = currency
        if opening_state is not UNSET:
            field_dict["openingState"] = opening_state
        if amount is not UNSET:
            field_dict["amount"] = amount

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        currency = d.pop("currency", UNSET)

        _opening_state = d.pop("openingState", UNSET)
        opening_state: PreviewLedgerSetupBodySetupAccountsItemOpeningState | Unset
        if isinstance(_opening_state, Unset):
            opening_state = UNSET
        else:
            opening_state = PreviewLedgerSetupBodySetupAccountsItemOpeningState(_opening_state)

        amount = d.pop("amount", UNSET)

        preview_ledger_setup_body_setup_accounts_item = cls(
            name=name,
            currency=currency,
            opening_state=opening_state,
            amount=amount,
        )

        return preview_ledger_setup_body_setup_accounts_item
