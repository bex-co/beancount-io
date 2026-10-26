from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="EntriesRequestEntriesItemType0EntryPostingsItemCostType0")


@_attrs_define
class EntriesRequestEntriesItemType0EntryPostingsItemCostType0:
    """Lot basis `{number currency [, date] [, label]}`; needs units like price

    Attributes:
        number (str): Decimal lot cost Example: 100.
        currency (str):  Example: USD.
        date (None | str | Unset):  Example: 2026-08-23.
        label (None | str | Unset):
    """

    number: str
    currency: str
    date: None | str | Unset = UNSET
    label: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        number = self.number

        currency = self.currency

        date: None | str | Unset
        if isinstance(self.date, Unset):
            date = UNSET
        else:
            date = self.date

        label: None | str | Unset
        if isinstance(self.label, Unset):
            label = UNSET
        else:
            label = self.label

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "number": number,
                "currency": currency,
            }
        )
        if date is not UNSET:
            field_dict["date"] = date
        if label is not UNSET:
            field_dict["label"] = label

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        number = d.pop("number")

        currency = d.pop("currency")

        def _parse_date(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        date = _parse_date(d.pop("date", UNSET))

        def _parse_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        label = _parse_label(d.pop("label", UNSET))

        entries_request_entries_item_type_0_entry_postings_item_cost_type_0 = cls(
            number=number,
            currency=currency,
            date=date,
            label=label,
        )

        return entries_request_entries_item_type_0_entry_postings_item_cost_type_0
