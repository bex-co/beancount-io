from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0")


@_attrs_define
class EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0:
    """Posting amount; omit on at most one posting per transaction to elide it

    Attributes:
        number (str): Decimal amount Example: 42.50.
        currency (str):  Example: USD.
    """

    number: str
    currency: str

    def to_dict(self) -> dict[str, Any]:
        number = self.number

        currency = self.currency

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "number": number,
                "currency": currency,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        number = d.pop("number")

        currency = d.pop("currency")

        entries_request_entries_item_type_0_entry_postings_item_units_type_0 = cls(
            number=number,
            currency=currency,
        )

        return entries_request_entries_item_type_0_entry_postings_item_units_type_0
