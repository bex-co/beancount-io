from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

T = TypeVar("T", bound="EntriesRequestEntriesItemType1Entry")


@_attrs_define
class EntriesRequestEntriesItemType1Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        currencies (list[str]):
    """

    date: str
    account: str
    currencies: list[str]

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        currencies = self.currencies

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "currencies": currencies,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        currencies = cast(list[str], d.pop("currencies"))

        entries_request_entries_item_type_1_entry = cls(
            date=date,
            account=account,
            currencies=currencies,
        )

        return entries_request_entries_item_type_1_entry
