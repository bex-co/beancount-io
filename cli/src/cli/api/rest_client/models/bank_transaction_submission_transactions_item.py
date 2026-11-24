from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="BankTransactionSubmissionTransactionsItem")


@_attrs_define
class BankTransactionSubmissionTransactionsItem:
    """
    Attributes:
        transaction_id (str): The staged row's `transactionId`. camelCase only here; the MCP bank tool also accepts
            `transaction_id`.
        target_account (str): The ledger account to book this against. camelCase only here; the MCP bank tool also
            accepts `target_account`. Example: Expenses:Groceries.
        source_account (str | Unset): Overrides the source account normally derived from the mapping. camelCase only
            here; the MCP bank tool also accepts `source_account`.
    """

    transaction_id: str
    target_account: str
    source_account: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        transaction_id = self.transaction_id

        target_account = self.target_account

        source_account = self.source_account

        field_dict: dict[str, Any] = {}

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

        return bank_transaction_submission_transactions_item
