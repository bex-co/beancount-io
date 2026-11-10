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
        commit (str | Unset): The sha of the revert commit; absent on a preview, and when another commit landed in
            between.
    """

    sha: str
    subject: str
    message: str
    files: list[PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem]
    dry_run: bool
    commit: str | Unset = UNSET
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

        commit = self.commit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "sha": sha,
                "subject": subject,
                "message": message,
                "files": files,
                "dryRun": dry_run,
            }
        )
        if commit is not UNSET:
            field_dict["commit"] = commit

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200_files_item import (
            PostApiGatewayV1LedgersOwnerNameRevertCommitResponse200FilesItem,  # noqa: PLC0415
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

        commit = d.pop("commit", UNSET)

        post_api_gateway_v1_ledgers_owner_name_revert_commit_response_200 = cls(
            sha=sha,
            subject=subject,
            message=message,
            files=files,
            dry_run=dry_run,
            commit=commit,
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
