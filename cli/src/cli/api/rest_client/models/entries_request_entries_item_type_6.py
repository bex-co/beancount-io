from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_6_type import EntriesRequestEntriesItemType6Type

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_6_entry import EntriesRequestEntriesItemType6Entry


T = TypeVar("T", bound="EntriesRequestEntriesItemType6")


@_attrs_define
class EntriesRequestEntriesItemType6:
    """
    Attributes:
        type_ (EntriesRequestEntriesItemType6Type):
        entry (EntriesRequestEntriesItemType6Entry):
    """

    type_: EntriesRequestEntriesItemType6Type
    entry: EntriesRequestEntriesItemType6Entry

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
        from ..models.entries_request_entries_item_type_6_entry import (
            EntriesRequestEntriesItemType6Entry,  # noqa: PLC0415
        )

        d = dict(src_dict)
        type_ = EntriesRequestEntriesItemType6Type(d.pop("type"))

        entry = EntriesRequestEntriesItemType6Entry.from_dict(d.pop("entry"))

        entries_request_entries_item_type_6 = cls(
            type_=type_,
            entry=entry,
        )

        return entries_request_entries_item_type_6
