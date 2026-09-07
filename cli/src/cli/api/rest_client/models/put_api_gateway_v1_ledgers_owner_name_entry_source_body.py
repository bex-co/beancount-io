from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PutApiGatewayV1LedgersOwnerNameEntrySourceBody")


@_attrs_define
class PutApiGatewayV1LedgersOwnerNameEntrySourceBody:
    """
    Attributes:
        entry_hash (str):
        sha256sum (str):
        new_content (str):
    """

    entry_hash: str
    sha256sum: str
    new_content: str

    def to_dict(self) -> dict[str, Any]:
        entry_hash = self.entry_hash

        sha256sum = self.sha256sum

        new_content = self.new_content

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entryHash": entry_hash,
                "sha256sum": sha256sum,
                "newContent": new_content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        entry_hash = d.pop("entryHash")

        sha256sum = d.pop("sha256sum")

        new_content = d.pop("newContent")

        put_api_gateway_v1_ledgers_owner_name_entry_source_body = cls(
            entry_hash=entry_hash,
            sha256sum=sha256sum,
            new_content=new_content,
        )

        return put_api_gateway_v1_ledgers_owner_name_entry_source_body
