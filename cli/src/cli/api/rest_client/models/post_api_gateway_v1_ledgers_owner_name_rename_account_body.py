from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameAccountBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameAccountBody:
    """
    Attributes:
        from_ (str): The account to rename; every account under it is renamed too.
        to (str): The new name; it must stay under the same root.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
        allowInvalid (bool | Unset): Commit even when the rename adds bean-check errors the ledger did not have.
        allow_invalid (bool | Unset): Alias of allowInvalid.
    """

    from_: str
    to: str
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET
    allowInvalid: bool | Unset = UNSET
    allow_invalid: bool | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from_ = self.from_

        to = self.to

        dryRun = self.dryRun

        dry_run = self.dry_run

        allowInvalid = self.allowInvalid

        allow_invalid = self.allow_invalid

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "from": from_,
                "to": to,
            }
        )
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run
        if allowInvalid is not UNSET:
            field_dict["allowInvalid"] = allowInvalid
        if allow_invalid is not UNSET:
            field_dict["allow_invalid"] = allow_invalid

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        from_ = d.pop("from")

        to = d.pop("to")

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        allowInvalid = d.pop("allowInvalid", UNSET)

        allow_invalid = d.pop("allow_invalid", UNSET)

        post_api_gateway_v1_ledgers_owner_name_rename_account_body = cls(
            from_=from_,
            to=to,
            dryRun=dryRun,
            dry_run=dry_run,
            allowInvalid=allowInvalid,
            allow_invalid=allow_invalid,
        )

        return post_api_gateway_v1_ledgers_owner_name_rename_account_body
