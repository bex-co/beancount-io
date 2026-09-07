from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_7_entry_interval import EntriesRequestEntriesItemType7EntryInterval

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_7_entry_amount import EntriesRequestEntriesItemType7EntryAmount


T = TypeVar("T", bound="EntriesRequestEntriesItemType7Entry")


@_attrs_define
class EntriesRequestEntriesItemType7Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        interval (EntriesRequestEntriesItemType7EntryInterval):
        amount (EntriesRequestEntriesItemType7EntryAmount):
    """

    date: str
    account: str
    interval: EntriesRequestEntriesItemType7EntryInterval
    amount: EntriesRequestEntriesItemType7EntryAmount

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
        from ..models.entries_request_entries_item_type_7_entry_amount import (
            EntriesRequestEntriesItemType7EntryAmount,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        interval = EntriesRequestEntriesItemType7EntryInterval(d.pop("interval"))

        amount = EntriesRequestEntriesItemType7EntryAmount.from_dict(d.pop("amount"))

        entries_request_entries_item_type_7_entry = cls(
            date=date,
            account=account,
            interval=interval,
            amount=amount,
        )

        return entries_request_entries_item_type_7_entry
