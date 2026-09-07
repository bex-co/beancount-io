from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_3_entry_amount import EntriesRequestEntriesItemType3EntryAmount


T = TypeVar("T", bound="EntriesRequestEntriesItemType3Entry")


@_attrs_define
class EntriesRequestEntriesItemType3Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        amount (EntriesRequestEntriesItemType3EntryAmount):
    """

    date: str
    account: str
    amount: EntriesRequestEntriesItemType3EntryAmount

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        amount = self.amount.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "amount": amount,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_3_entry_amount import (
            EntriesRequestEntriesItemType3EntryAmount,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        amount = EntriesRequestEntriesItemType3EntryAmount.from_dict(d.pop("amount"))

        entries_request_entries_item_type_3_entry = cls(
            date=date,
            account=account,
            amount=amount,
        )

        return entries_request_entries_item_type_3_entry
