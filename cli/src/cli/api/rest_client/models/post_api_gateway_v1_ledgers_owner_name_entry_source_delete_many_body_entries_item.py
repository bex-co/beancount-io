from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem:
    """
    Attributes:
        entry_hash (str):
        sha256sum (str):
    """

    entry_hash: str
    sha256sum: str

    def to_dict(self) -> dict[str, Any]:
        entry_hash = self.entry_hash

        sha256sum = self.sha256sum

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entryHash": entry_hash,
                "sha256sum": sha256sum,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        entry_hash = d.pop("entryHash")

        sha256sum = d.pop("sha256sum")

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item = cls(
            entry_hash=entry_hash,
            sha256sum=sha256sum,
        )

        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item
