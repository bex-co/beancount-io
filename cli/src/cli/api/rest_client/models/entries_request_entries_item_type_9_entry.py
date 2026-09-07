from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType9Entry")


@_attrs_define
class EntriesRequestEntriesItemType9Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        type_ (str):
        description (str):
    """

    date: str
    type_: str
    description: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        type_ = self.type_

        description = self.description

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "type": type_,
                "description": description,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        type_ = d.pop("type")

        description = d.pop("description")

        entries_request_entries_item_type_9_entry = cls(
            date=date,
            type_=type_,
            description=description,
        )

        return entries_request_entries_item_type_9_entry
