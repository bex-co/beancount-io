from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="BankTransactionSubmissionTransactionsItem")


@_attrs_define
class BankTransactionSubmissionTransactionsItem:
    """
    Attributes:
        transaction_id (str):
        target_account (str): The ledger account to book this against Example: Expenses:Groceries.
        source_account (str | Unset):
    """

    transaction_id: str
    target_account: str
    source_account: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        transaction_id = self.transaction_id

        target_account = self.target_account

        source_account = self.source_account

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "transactionId": transaction_id,
                "targetAccount": target_account,
            }
        )
        if source_account is not UNSET:
            field_dict["sourceAccount"] = source_account

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        transaction_id = d.pop("transactionId")

        target_account = d.pop("targetAccount")

        source_account = d.pop("sourceAccount", UNSET)

        bank_transaction_submission_transactions_item = cls(
            transaction_id=transaction_id,
            target_account=target_account,
            source_account=source_account,
        )

        bank_transaction_submission_transactions_item.additional_properties = d
        return bank_transaction_submission_transactions_item

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
