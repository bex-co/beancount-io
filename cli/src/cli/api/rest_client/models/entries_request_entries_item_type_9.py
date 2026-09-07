from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_9_type import EntriesRequestEntriesItemType9Type

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_9_entry import EntriesRequestEntriesItemType9Entry


T = TypeVar("T", bound="EntriesRequestEntriesItemType9")


@_attrs_define
class EntriesRequestEntriesItemType9:
    """
    Attributes:
        type_ (EntriesRequestEntriesItemType9Type):
        entry (EntriesRequestEntriesItemType9Entry):
    """

    type_: EntriesRequestEntriesItemType9Type
    entry: EntriesRequestEntriesItemType9Entry

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
        from ..models.entries_request_entries_item_type_9_entry import (
            EntriesRequestEntriesItemType9Entry,  # noqa: PLC0415
        )

        d = dict(src_dict)
        type_ = EntriesRequestEntriesItemType9Type(d.pop("type"))

        entry = EntriesRequestEntriesItemType9Entry.from_dict(d.pop("entry"))

        entries_request_entries_item_type_9 = cls(
            type_=type_,
            entry=entry,
        )

        return entries_request_entries_item_type_9
