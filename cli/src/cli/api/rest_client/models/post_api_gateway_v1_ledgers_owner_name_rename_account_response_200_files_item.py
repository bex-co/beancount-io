from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item_changes_item import (
        PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItem:
    """
    Attributes:
        path (str):
        changes (list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem]):
    """

    path: str
    changes: list[PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        changes = []
        for changes_item_data in self.changes:
            changes_item = changes_item_data.to_dict()
            changes.append(changes_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "path": path,
                "changes": changes,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item_changes_item import (
            PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        path = d.pop("path")

        changes = []
        _changes = d.pop("changes")
        for changes_item_data in _changes:
            changes_item = PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200FilesItemChangesItem.from_dict(
                changes_item_data
            )

            changes.append(changes_item)

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item = cls(
            path=path,
            changes=changes,
        )

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_files_item

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
