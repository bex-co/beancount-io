from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200:
    """
    Attributes:
        message (str):
        entry_hash (str):
    """

    message: str
    entry_hash: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        entry_hash = self.entry_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "entryHash": entry_hash,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        message = d.pop("message")

        entry_hash = d.pop("entryHash")

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200 = cls(
            message=message,
            entry_hash=entry_hash,
        )

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
