from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_5_entry_amount import EntriesRequestEntriesItemType5EntryAmount
    from ..models.entries_request_entries_item_type_5_entry_meta_type_0 import (
        EntriesRequestEntriesItemType5EntryMetaType0,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType5Entry")


@_attrs_define
class EntriesRequestEntriesItemType5Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        currency (str):
        amount (EntriesRequestEntriesItemType5EntryAmount):
        meta (EntriesRequestEntriesItemType5EntryMetaType0 | None | Unset): Metadata written beneath the directive;
            every value is a string, written quoted as given
    """

    date: str
    currency: str
    amount: EntriesRequestEntriesItemType5EntryAmount
    meta: EntriesRequestEntriesItemType5EntryMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_5_entry_meta_type_0 import (
            EntriesRequestEntriesItemType5EntryMetaType0,  # noqa: PLC0415
        )

        date = self.date

        currency = self.currency

        amount = self.amount.to_dict()

        meta: dict[str, Any] | None | Unset
        if isinstance(self.meta, Unset):
            meta = UNSET
        elif isinstance(self.meta, EntriesRequestEntriesItemType5EntryMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "currency": currency,
                "amount": amount,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_5_entry_amount import (
            EntriesRequestEntriesItemType5EntryAmount,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_5_entry_meta_type_0 import (
            EntriesRequestEntriesItemType5EntryMetaType0,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        currency = d.pop("currency")

        amount = EntriesRequestEntriesItemType5EntryAmount.from_dict(d.pop("amount"))

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType5EntryMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType5EntryMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType5EntryMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_5_entry = cls(
            date=date,
            currency=currency,
            amount=amount,
            meta=meta,
        )

        return entries_request_entries_item_type_5_entry
