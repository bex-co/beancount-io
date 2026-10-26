from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_5_entry_amount import EntriesRequestEntriesItemType5EntryAmount


T = TypeVar("T", bound="EntriesRequestEntriesItemType5Entry")


@_attrs_define
class EntriesRequestEntriesItemType5Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        currency (str):
        amount (EntriesRequestEntriesItemType5EntryAmount):
    """

    date: str
    currency: str
    amount: EntriesRequestEntriesItemType5EntryAmount

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        currency = self.currency

        amount = self.amount.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "currency": currency,
                "amount": amount,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_5_entry_amount import (
            EntriesRequestEntriesItemType5EntryAmount,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        currency = d.pop("currency")

        amount = EntriesRequestEntriesItemType5EntryAmount.from_dict(d.pop("amount"))

        entries_request_entries_item_type_5_entry = cls(
            date=date,
            currency=currency,
            amount=amount,
        )

        return entries_request_entries_item_type_5_entry
