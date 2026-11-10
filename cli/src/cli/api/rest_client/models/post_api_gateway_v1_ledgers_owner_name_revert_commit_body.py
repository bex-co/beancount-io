from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRevertCommitBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRevertCommitBody:
    """
    Attributes:
        sha (str): The commit to undo: a sha that a write result returned or the commits read lists, or a branch name
            for its latest commit.
        message (None | str | Unset): The revert commit's message; defaults to `Revert "<subject>"` and the sha it
            reverts.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
    """

    sha: str
    message: None | str | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        sha = self.sha

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        dryRun = self.dryRun

        dry_run = self.dry_run

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "sha": sha,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        sha = d.pop("sha")

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        post_api_gateway_v1_ledgers_owner_name_revert_commit_body = cls(
            sha=sha,
            message=message,
            dryRun=dryRun,
            dry_run=dry_run,
        )

        return post_api_gateway_v1_ledgers_owner_name_revert_commit_body
