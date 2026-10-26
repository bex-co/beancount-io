from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_8_entry_interval import EntriesRequestEntriesItemType8EntryInterval

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_8_entry_amount import EntriesRequestEntriesItemType8EntryAmount


T = TypeVar("T", bound="EntriesRequestEntriesItemType8Entry")


@_attrs_define
class EntriesRequestEntriesItemType8Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        interval (EntriesRequestEntriesItemType8EntryInterval):
        amount (EntriesRequestEntriesItemType8EntryAmount):
    """

    date: str
    account: str
    interval: EntriesRequestEntriesItemType8EntryInterval
    amount: EntriesRequestEntriesItemType8EntryAmount

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        interval = self.interval.value

        amount = self.amount.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "interval": interval,
                "amount": amount,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_8_entry_amount import (
            EntriesRequestEntriesItemType8EntryAmount,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        interval = EntriesRequestEntriesItemType8EntryInterval(d.pop("interval"))

        amount = EntriesRequestEntriesItemType8EntryAmount.from_dict(d.pop("amount"))

        entries_request_entries_item_type_8_entry = cls(
            date=date,
            account=account,
            interval=interval,
            amount=amount,
        )

        return entries_request_entries_item_type_8_entry
