from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.bank_transaction_submission_transactions_item import BankTransactionSubmissionTransactionsItem


T = TypeVar("T", bound="BankTransactionSubmission")


@_attrs_define
class BankTransactionSubmission:
    """
    Attributes:
        transactions (list[BankTransactionSubmissionTransactionsItem]):
        filename (str | Unset): Which ledger file to append to; must already exist
    """

    transactions: list[BankTransactionSubmissionTransactionsItem]
    filename: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        transactions = []
        for transactions_item_data in self.transactions:
            transactions_item = transactions_item_data.to_dict()
            transactions.append(transactions_item)

        filename = self.filename

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "transactions": transactions,
            }
        )
        if filename is not UNSET:
            field_dict["filename"] = filename

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bank_transaction_submission_transactions_item import (
            BankTransactionSubmissionTransactionsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        transactions = []
        _transactions = d.pop("transactions")
        for transactions_item_data in _transactions:
            transactions_item = BankTransactionSubmissionTransactionsItem.from_dict(transactions_item_data)

            transactions.append(transactions_item)

        filename = d.pop("filename", UNSET)

        bank_transaction_submission = cls(
            transactions=transactions,
            filename=filename,
        )

        bank_transaction_submission.additional_properties = d
        return bank_transaction_submission

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
