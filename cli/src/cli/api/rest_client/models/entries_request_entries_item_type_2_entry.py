from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType2Entry")


@_attrs_define
class EntriesRequestEntriesItemType2Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
    """

    date: str
    account: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        entries_request_entries_item_type_2_entry = cls(
            date=date,
            account=account,
        )

        return entries_request_entries_item_type_2_entry
