from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="BankAccountMapping")


@_attrs_define
class BankAccountMapping:
    """
    Attributes:
        ledger_account (str):
    """

    ledger_account: str

    def to_dict(self) -> dict[str, Any]:
        ledger_account = self.ledger_account

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "ledgerAccount": ledger_account,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ledger_account = d.pop("ledgerAccount")

        bank_account_mapping = cls(
            ledger_account=ledger_account,
        )

        return bank_account_mapping
