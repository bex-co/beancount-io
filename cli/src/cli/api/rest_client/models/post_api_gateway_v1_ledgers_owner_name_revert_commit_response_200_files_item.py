from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item_change import (
    PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItemChange,
)

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem:
    """
    Attributes:
        path (str):
        change (PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItemChange): What the revert does to the
            file.
    """

    path: str
    change: PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItemChange
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        change = self.change.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "path": path,
                "change": change,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        change = PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItemChange(d.pop("change"))

        post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item = cls(
            path=path,
            change=change,
        )

        post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item

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
