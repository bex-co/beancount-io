from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem:
    """
    Attributes:
        line (int):
        before (str):
        after (str):
    """

    line: int
    before: str
    after: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        line = self.line

        before = self.before

        after = self.after

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "line": line,
                "before": before,
                "after": after,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        line = d.pop("line")

        before = d.pop("before")

        after = d.pop("after")

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item_changes_item = cls(
            line=line,
            before=before,
            after=after,
        )

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item_changes_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item_changes_item

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
