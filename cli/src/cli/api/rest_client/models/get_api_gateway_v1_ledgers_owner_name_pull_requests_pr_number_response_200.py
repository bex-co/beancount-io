from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200_files_item import (
        GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem,
    )


T = TypeVar("T", bound="GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200")


@_attrs_define
class GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200:
    """
    Attributes:
        number (int):
        title (str):
        description (str):
        state (str):
        author (str):
        head_branch (str):
        base_branch (str):
        files (list[GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem]):
        diff (str | Unset):
    """

    number: int
    title: str
    description: str
    state: str
    author: str
    head_branch: str
    base_branch: str
    files: list[GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem]
    diff: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        number = self.number

        title = self.title

        description = self.description

        state = self.state

        author = self.author

        head_branch = self.head_branch

        base_branch = self.base_branch

        files = []
        for files_item_data in self.files:
            files_item = files_item_data.to_dict()
            files.append(files_item)

        diff = self.diff

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "number": number,
                "title": title,
                "description": description,
                "state": state,
                "author": author,
                "headBranch": head_branch,
                "baseBranch": base_branch,
                "files": files,
            }
        )
        if diff is not UNSET:
            field_dict["diff"] = diff

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200_files_item import (
            GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        number = d.pop("number")

        title = d.pop("title")

        description = d.pop("description")

        state = d.pop("state")

        author = d.pop("author")

        head_branch = d.pop("headBranch")

        base_branch = d.pop("baseBranch")

        files = []
        _files = d.pop("files")
        for files_item_data in _files:
            files_item = GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem.from_dict(
                files_item_data
            )

            files.append(files_item)

        diff = d.pop("diff", UNSET)

        get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200 = cls(
            number=number,
            title=title,
            description=description,
            state=state,
            author=author,
            head_branch=head_branch,
            base_branch=base_branch,
            files=files,
            diff=diff,
        )

        get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200.additional_properties = d
        return get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200

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
