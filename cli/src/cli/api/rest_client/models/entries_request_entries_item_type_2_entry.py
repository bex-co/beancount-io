from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_2_entry_meta_type_0 import (
        EntriesRequestEntriesItemType2EntryMetaType0,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType2Entry")


@_attrs_define
class EntriesRequestEntriesItemType2Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        meta (EntriesRequestEntriesItemType2EntryMetaType0 | None | Unset): Metadata written beneath the directive;
            every value is a string, written quoted as given
    """

    date: str
    account: str
    meta: EntriesRequestEntriesItemType2EntryMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_2_entry_meta_type_0 import (
            EntriesRequestEntriesItemType2EntryMetaType0,  # noqa: PLC0415
        )

        date = self.date

        account = self.account

        meta: dict[str, Any] | None | Unset
        if isinstance(self.meta, Unset):
            meta = UNSET
        elif isinstance(self.meta, EntriesRequestEntriesItemType2EntryMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_2_entry_meta_type_0 import (
            EntriesRequestEntriesItemType2EntryMetaType0,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType2EntryMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType2EntryMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType2EntryMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_2_entry = cls(
            date=date,
            account=account,
            meta=meta,
        )

        return entries_request_entries_item_type_2_entry
