from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="BankTransactionDiscard")


@_attrs_define
class BankTransactionDiscard:
    """
    Attributes:
        transaction_ids (list[str]):
    """

    transaction_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        transaction_ids = self.transaction_ids

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "transactionIds": transaction_ids,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        transaction_ids = cast(list[str], d.pop("transactionIds"))

        bank_transaction_discard = cls(
            transaction_ids=transaction_ids,
        )

        return bank_transaction_discard
