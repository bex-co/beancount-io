from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_pull_requests_body_changes_item import (
        PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNamePullRequestsBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNamePullRequestsBody:
    """
    Attributes:
        title (str):
        changes (list[PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem]):
        description (None | str | Unset):
        base_branch (str | Unset):  Default: 'main'.
    """

    title: str
    changes: list[PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem]
    description: None | str | Unset = UNSET
    base_branch: str | Unset = "main"

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        changes = []
        for changes_item_data in self.changes:
            changes_item = changes_item_data.to_dict()
            changes.append(changes_item)

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        base_branch = self.base_branch

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "title": title,
                "changes": changes,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if base_branch is not UNSET:
            field_dict["baseBranch"] = base_branch

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_pull_requests_body_changes_item import (
            PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        title = d.pop("title")

        changes = []
        _changes = d.pop("changes")
        for changes_item_data in _changes:
            changes_item = PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem.from_dict(changes_item_data)

            changes.append(changes_item)

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        base_branch = d.pop("baseBranch", UNSET)

        post_api_gateway_v1_ledgers_owner_name_pull_requests_body = cls(
            title=title,
            changes=changes,
            description=description,
            base_branch=base_branch,
        )

        return post_api_gateway_v1_ledgers_owner_name_pull_requests_body
