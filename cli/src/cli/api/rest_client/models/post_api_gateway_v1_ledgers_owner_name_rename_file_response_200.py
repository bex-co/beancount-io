from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameFileResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameFileResponse200:
    """
    Attributes:
        old_path (str):
        new_path (str):
    """

    old_path: str
    new_path: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        old_path = self.old_path

        new_path = self.new_path

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "oldPath": old_path,
                "newPath": new_path,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        old_path = d.pop("oldPath")

        new_path = d.pop("newPath")

        post_api_gateway_v1_ledgers_owner_name_rename_file_response_200 = cls(
            old_path=old_path,
            new_path=new_path,
        )

        post_api_gateway_v1_ledgers_owner_name_rename_file_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_rename_file_response_200

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
