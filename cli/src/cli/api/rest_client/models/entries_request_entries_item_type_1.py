from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_1_type import EntriesRequestEntriesItemType1Type

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_1_entry import EntriesRequestEntriesItemType1Entry


T = TypeVar("T", bound="EntriesRequestEntriesItemType1")


@_attrs_define
class EntriesRequestEntriesItemType1:
    """
    Attributes:
        type_ (EntriesRequestEntriesItemType1Type):
        entry (EntriesRequestEntriesItemType1Entry):
    """

    type_: EntriesRequestEntriesItemType1Type
    entry: EntriesRequestEntriesItemType1Entry

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
        from ..models.entries_request_entries_item_type_1_entry import (
            EntriesRequestEntriesItemType1Entry,  # noqa: PLC0415
        )

        d = dict(src_dict)
        type_ = EntriesRequestEntriesItemType1Type(d.pop("type"))

        entry = EntriesRequestEntriesItemType1Entry.from_dict(d.pop("entry"))

        entries_request_entries_item_type_1 = cls(
            type_=type_,
            entry=entry,
        )

        return entries_request_entries_item_type_1
