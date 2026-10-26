from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType3Entry")


@_attrs_define
class EntriesRequestEntriesItemType3Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        source_account (str): Account to pad from Example: Equity:Opening-Balances.
    """

    date: str
    account: str
    source_account: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        source_account = self.source_account

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "sourceAccount": source_account,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        source_account = d.pop("sourceAccount")

        entries_request_entries_item_type_3_entry = cls(
            date=date,
            account=account,
            source_account=source_account,
        )

        return entries_request_entries_item_type_3_entry
