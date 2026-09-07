from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem:
    """
    Attributes:
        path (str):
        content (str):
    """

    path: str
    content: str

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        content = self.content

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "path": path,
                "content": content,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        content = d.pop("content")

        post_api_gateway_v1_ledgers_owner_name_pull_requests_body_changes_item = cls(
            path=path,
            content=content,
        )

        return post_api_gateway_v1_ledgers_owner_name_pull_requests_body_changes_item
