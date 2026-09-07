from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_2_type import EntriesRequestEntriesItemType2Type

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_2_entry import EntriesRequestEntriesItemType2Entry


T = TypeVar("T", bound="EntriesRequestEntriesItemType2")


@_attrs_define
class EntriesRequestEntriesItemType2:
    """
    Attributes:
        type_ (EntriesRequestEntriesItemType2Type):
        entry (EntriesRequestEntriesItemType2Entry):
    """

    type_: EntriesRequestEntriesItemType2Type
    entry: EntriesRequestEntriesItemType2Entry

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        entry = self.entry.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "entry": entry,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_2_entry import (
            EntriesRequestEntriesItemType2Entry,  # noqa: PLC0415
        )

        d = dict(src_dict)
        type_ = EntriesRequestEntriesItemType2Type(d.pop("type"))

        entry = EntriesRequestEntriesItemType2Entry.from_dict(d.pop("entry"))

        entries_request_entries_item_type_2 = cls(
            type_=type_,
            entry=entry,
        )

        return entries_request_entries_item_type_2
