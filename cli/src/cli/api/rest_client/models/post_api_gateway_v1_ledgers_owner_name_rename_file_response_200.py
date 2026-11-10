from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_rename_file_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameRenameFileResponse200NewErrorsItem,
    )
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
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameRenameFileResponse200NewErrorsItem]):
        valid (bool): True only when the write adds no bean-check error. A dry run returns the new errors instead of
            refusing, so gate on this, not on the status.
        commit (str | Unset): The sha of the commit this write made; absent on a preview or a read.
        checked (bool | Unset): Present, as false, when bean-check could not run, so the other fields say nothing;
            `checkError` says why.
        check_error (str | Unset):
    """

    message: str
    dry_run: bool
    old_path: str
    new_path: str
    updated_includes: list[str]
    preview: list[PostApiGatewayV1LedgersOwnerNameRenameFileResponse200PreviewItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameRenameFileResponse200NewErrorsItem]
    valid: bool
    commit: str | Unset = UNSET
    checked: bool | Unset = UNSET
    check_error: str | Unset = UNSET
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

        errors_before = self.errors_before

        errors_after = self.errors_after

        new_errors = []
        for new_errors_item_data in self.new_errors:
            new_errors_item = new_errors_item_data.to_dict()
            new_errors.append(new_errors_item)

        valid = self.valid

        commit = self.commit

        checked = self.checked

        check_error = self.check_error

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
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
                "valid": valid,
            }
        )
        if commit is not UNSET:
            field_dict["commit"] = commit
        if checked is not UNSET:
            field_dict["checked"] = checked
        if check_error is not UNSET:
            field_dict["checkError"] = check_error

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_rename_file_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameRenameFileResponse200NewErrorsItem,  # noqa: PLC0415
        )
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

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameRenameFileResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        valid = d.pop("valid")

        commit = d.pop("commit", UNSET)

        checked = d.pop("checked", UNSET)

        check_error = d.pop("checkError", UNSET)

        post_api_gateway_v1_ledgers_owner_name_rename_file_response_200 = cls(
            message=message,
            dry_run=dry_run,
            old_path=old_path,
            new_path=new_path,
            updated_includes=updated_includes,
            preview=preview,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            valid=valid,
            commit=commit,
            checked=checked,
            check_error=check_error,
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
