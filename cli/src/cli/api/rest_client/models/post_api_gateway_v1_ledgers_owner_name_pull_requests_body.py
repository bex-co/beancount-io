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
        description (str):
        clear_commit_message (str):
        changes (list[PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem]):
        base_branch (str | Unset):  Default: 'main'.
        fast_forward (bool | None | Unset): Skip the diff-less verification and open the pull request even when the
            branch does not differ from base
    """

    title: str
    description: str
    clear_commit_message: str
    changes: list[PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem]
    base_branch: str | Unset = "main"
    fast_forward: bool | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        description = self.description

        clear_commit_message = self.clear_commit_message

        changes = []
        for changes_item_data in self.changes:
            changes_item = changes_item_data.to_dict()
            changes.append(changes_item)

        base_branch = self.base_branch

        fast_forward: bool | None | Unset
        if isinstance(self.fast_forward, Unset):
            fast_forward = UNSET
        else:
            fast_forward = self.fast_forward

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "title": title,
                "description": description,
                "clearCommitMessage": clear_commit_message,
                "changes": changes,
            }
        )
        if base_branch is not UNSET:
            field_dict["baseBranch"] = base_branch
        if fast_forward is not UNSET:
            field_dict["fastForward"] = fast_forward

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_pull_requests_body_changes_item import (
            PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        title = d.pop("title")

        description = d.pop("description")

        clear_commit_message = d.pop("clearCommitMessage")

        changes = []
        _changes = d.pop("changes")
        for changes_item_data in _changes:
            changes_item = PostApiGatewayV1LedgersOwnerNamePullRequestsBodyChangesItem.from_dict(changes_item_data)

            changes.append(changes_item)

        base_branch = d.pop("baseBranch", UNSET)

        def _parse_fast_forward(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        fast_forward = _parse_fast_forward(d.pop("fastForward", UNSET))

        post_api_gateway_v1_ledgers_owner_name_pull_requests_body = cls(
            title=title,
            description=description,
            clear_commit_message=clear_commit_message,
            changes=changes,
            base_branch=base_branch,
            fast_forward=fast_forward,
        )

        return post_api_gateway_v1_ledgers_owner_name_pull_requests_body
