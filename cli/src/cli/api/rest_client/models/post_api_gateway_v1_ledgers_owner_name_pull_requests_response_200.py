from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNamePullRequestsResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNamePullRequestsResponse200:
    """
    Attributes:
        success (bool):
        message (str | Unset):
        pr_number (int | Unset):
        pr_url (str | Unset):
        base_branch (str | Unset): The created PR's actual base ref, read back — never a default
        head_branch (str | Unset): The created PR's actual head ref, read back — never a default
    """

    success: bool
    message: str | Unset = UNSET
    pr_number: int | Unset = UNSET
    pr_url: str | Unset = UNSET
    base_branch: str | Unset = UNSET
    head_branch: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        message = self.message

        pr_number = self.pr_number

        pr_url = self.pr_url

        base_branch = self.base_branch

        head_branch = self.head_branch

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message
        if pr_number is not UNSET:
            field_dict["prNumber"] = pr_number
        if pr_url is not UNSET:
            field_dict["prUrl"] = pr_url
        if base_branch is not UNSET:
            field_dict["baseBranch"] = base_branch
        if head_branch is not UNSET:
            field_dict["headBranch"] = head_branch

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        success = d.pop("success")

        message = d.pop("message", UNSET)

        pr_number = d.pop("prNumber", UNSET)

        pr_url = d.pop("prUrl", UNSET)

        base_branch = d.pop("baseBranch", UNSET)

        head_branch = d.pop("headBranch", UNSET)

        post_api_gateway_v1_ledgers_owner_name_pull_requests_response_200 = cls(
            success=success,
            message=message,
            pr_number=pr_number,
            pr_url=pr_url,
            base_branch=base_branch,
            head_branch=head_branch,
        )

        post_api_gateway_v1_ledgers_owner_name_pull_requests_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_pull_requests_response_200

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
