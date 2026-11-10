from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

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

    def to_dict(self) -> dict[str, Any]:
        transactions = []
        for transactions_item_data in self.transactions:
            transactions_item = transactions_item_data.to_dict()
            transactions.append(transactions_item)

        filename = self.filename

        field_dict: dict[str, Any] = {}

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

        return bank_transaction_submission
