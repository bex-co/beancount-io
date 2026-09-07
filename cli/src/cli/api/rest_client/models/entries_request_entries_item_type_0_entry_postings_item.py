from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
        EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,
    )
    from ..models.entries_request_entries_item_type_0_entry_postings_item_units import (
        EntriesRequestEntriesItemType0EntryPostingsItemUnits,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType0EntryPostingsItem")


@_attrs_define
class EntriesRequestEntriesItemType0EntryPostingsItem:
    """
    Attributes:
        account (str):  Example: Assets:Bank:Checking.
        units (EntriesRequestEntriesItemType0EntryPostingsItemUnits):
        price (EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset):
        flag (None | str | Unset):
    """

    account: str
    units: EntriesRequestEntriesItemType0EntryPostingsItemUnits
    price: EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset = UNSET
    flag: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,  # noqa: PLC0415
        )

        account = self.account

        units = self.units.to_dict()

        price: dict[str, Any] | None | Unset
        if isinstance(self.price, Unset):
            price = UNSET
        elif isinstance(self.price, EntriesRequestEntriesItemType0EntryPostingsItemPriceType0):
            price = self.price.to_dict()
        else:
            price = self.price

        flag: None | str | Unset
        if isinstance(self.flag, Unset):
            flag = UNSET
        else:
            flag = self.flag

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "account": account,
                "units": units,
            }
        )
        if price is not UNSET:
            field_dict["price"] = price
        if flag is not UNSET:
            field_dict["flag"] = flag

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_units import (
            EntriesRequestEntriesItemType0EntryPostingsItemUnits,  # noqa: PLC0415
        )

        d = dict(src_dict)
        account = d.pop("account")

        units = EntriesRequestEntriesItemType0EntryPostingsItemUnits.from_dict(d.pop("units"))

        def _parse_price(data: object) -> EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                price_type_0 = EntriesRequestEntriesItemType0EntryPostingsItemPriceType0.from_dict(data)

                return price_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset, data)

        price = _parse_price(d.pop("price", UNSET))

        def _parse_flag(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        flag = _parse_flag(d.pop("flag", UNSET))

        entries_request_entries_item_type_0_entry_postings_item = cls(
            account=account,
            units=units,
            price=price,
            flag=flag,
        )

        return entries_request_entries_item_type_0_entry_postings_item
