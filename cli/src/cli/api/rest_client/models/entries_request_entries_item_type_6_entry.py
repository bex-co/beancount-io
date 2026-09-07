from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType6Entry")


@_attrs_define
class EntriesRequestEntriesItemType6Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        content (str):
    """

    date: str
    account: str
    content: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        content = self.content

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        content = d.pop("content")

        entries_request_entries_item_type_6_entry = cls(
            date=date,
            account=account,
            content=content,
        )

        return entries_request_entries_item_type_6_entry
