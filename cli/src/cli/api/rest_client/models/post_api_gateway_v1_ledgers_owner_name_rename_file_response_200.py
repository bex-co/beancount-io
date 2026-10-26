from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_file_response_200_preview_item import (
        PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameFileResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameFileResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        old_path (str):
        new_path (str):
        updated_includes (list[str]):
        preview (list[PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem]): Per-file rewritten include
            lines; populated on dry runs only.
    """

    message: str
    dry_run: bool
    old_path: str
    new_path: str
    updated_includes: list[str]
    preview: list[PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        old_path = self.old_path

        new_path = self.new_path

        updated_includes = self.updated_includes

        preview = []
        for preview_item_data in self.preview:
            preview_item = preview_item_data.to_dict()
            preview.append(preview_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "oldPath": old_path,
                "newPath": new_path,
                "updatedIncludes": updated_includes,
                "preview": preview,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_file_response_200_preview_item import (
            PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        old_path = d.pop("oldPath")

        new_path = d.pop("newPath")

        updated_includes = cast(list[str], d.pop("updatedIncludes"))

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem.from_dict(preview_item_data)

            preview.append(preview_item)

        post_api_gateway_v1_ledgers_owner_name_rename_file_response_200 = cls(
            message=message,
            dry_run=dry_run,
            old_path=old_path,
            new_path=new_path,
            updated_includes=updated_includes,
            preview=preview,
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
