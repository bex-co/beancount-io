from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item import (
        PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200NewErrorsItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200:
    """
    Attributes:
        sha (str): The full sha of the commit the revert undoes.
        subject (str): The first line of that commit's message.
        message (str): The revert's own commit message.
        files (list[PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem]): Each file the commit touched,
            and what the revert does to it.
        dry_run (bool):
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200NewErrorsItem]):
        valid (bool): True only when the write adds no bean-check error. A dry run returns the new errors instead of
            refusing, so gate on this, not on the status.
        commit (str | Unset): The sha of the revert commit; absent on a preview, and when another commit landed in
            between.
        checked (bool | Unset): Present, as false, when bean-check could not run, so the other fields say nothing;
            `checkError` says why.
        check_error (str | Unset):
    """

    sha: str
    subject: str
    message: str
    files: list[PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem]
    dry_run: bool
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200NewErrorsItem]
    valid: bool
    commit: str | Unset = UNSET
    checked: bool | Unset = UNSET
    check_error: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        sha = self.sha

        subject = self.subject

        message = self.message

        files = []
        for files_item_data in self.files:
            files_item = files_item_data.to_dict()
            files.append(files_item)

        dry_run = self.dry_run

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
                "sha": sha,
                "subject": subject,
                "message": message,
                "files": files,
                "dryRun": dry_run,
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
        from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item import (
            PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200NewErrorsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        sha = d.pop("sha")

        subject = d.pop("subject")

        message = d.pop("message")

        files = []
        _files = d.pop("files")
        for files_item_data in _files:
            files_item = PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem.from_dict(files_item_data)

            files.append(files_item)

        dry_run = d.pop("dryRun")

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        valid = d.pop("valid")

        commit = d.pop("commit", UNSET)

        checked = d.pop("checked", UNSET)

        check_error = d.pop("checkError", UNSET)

        post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200 = cls(
            sha=sha,
            subject=subject,
            message=message,
            files=files,
            dry_run=dry_run,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            valid=valid,
            commit=commit,
            checked=checked,
            check_error=check_error,
        )

        post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200

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
