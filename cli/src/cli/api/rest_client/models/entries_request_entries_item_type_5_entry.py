from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType5Entry")


@_attrs_define
class EntriesRequestEntriesItemType5Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        currency (str):
    """

    date: str
    currency: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        currency = self.currency

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "currency": currency,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        currency = d.pop("currency")

        entries_request_entries_item_type_5_entry = cls(
            date=date,
            currency=currency,
        )

        return entries_request_entries_item_type_5_entry
