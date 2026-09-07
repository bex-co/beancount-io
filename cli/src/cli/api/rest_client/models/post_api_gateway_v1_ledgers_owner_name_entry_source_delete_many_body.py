from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item import (
        PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBody:
    """
    Attributes:
        entries (list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem]):
    """

    entries: list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem]

    def to_dict(self) -> dict[str, Any]:
        entries = []
        for entries_item_data in self.entries:
            entries_item = entries_item_data.to_dict()
            entries.append(entries_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entries": entries,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item import (
            PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        entries = []
        _entries = d.pop("entries")
        for entries_item_data in _entries:
            entries_item = PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem.from_dict(
                entries_item_data
            )

            entries.append(entries_item)

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body = cls(
            entries=entries,
        )

        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body
