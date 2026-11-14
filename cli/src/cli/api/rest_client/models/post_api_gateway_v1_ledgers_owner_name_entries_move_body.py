from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_body_entries_item import (
        PostApiGatewayV1LedgersOwnerNameEntriesMoveBodyEntriesItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntriesMoveBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntriesMoveBody:
    """
    Attributes:
        entries (list[PostApiGatewayV1LedgersOwnerNameEntriesMoveBodyEntriesItem]):
        to_path (str): Repository path of the .bean or .beancount file the entries move into; created when absent.
        allowInvalid (bool | Unset): Commit even when the write would add bean-check errors (VALIDATION_FAILED with
            newLedgerErrors), instead of refusing it.
        allow_invalid (bool | Unset): Alias of allowInvalid.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
        include_from (str | Unset): A file the ledger loads that gains include "<toPath>" (relative to it) when toPath
            is not loaded yet. Without it, an unloaded toPath is refused.
    """

    entries: list[PostApiGatewayV1LedgersOwnerNameEntriesMoveBodyEntriesItem]
    to_path: str
    allowInvalid: bool | Unset = UNSET
    allow_invalid: bool | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET
    include_from: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        entries = []
        for entries_item_data in self.entries:
            entries_item = entries_item_data.to_dict()
            entries.append(entries_item)

        to_path = self.to_path

        allowInvalid = self.allowInvalid

        allow_invalid = self.allow_invalid

        dryRun = self.dryRun

        dry_run = self.dry_run

        include_from = self.include_from

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entries": entries,
                "toPath": to_path,
            }
        )
        if allowInvalid is not UNSET:
            field_dict["allowInvalid"] = allowInvalid
        if allow_invalid is not UNSET:
            field_dict["allow_invalid"] = allow_invalid
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run
        if include_from is not UNSET:
            field_dict["includeFrom"] = include_from

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_body_entries_item import (
            PostApiGatewayV1LedgersOwnerNameEntriesMoveBodyEntriesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        entries = []
        _entries = d.pop("entries")
        for entries_item_data in _entries:
            entries_item = PostApiGatewayV1LedgersOwnerNameEntriesMoveBodyEntriesItem.from_dict(entries_item_data)

            entries.append(entries_item)

        to_path = d.pop("toPath")

        allowInvalid = d.pop("allowInvalid", UNSET)

        allow_invalid = d.pop("allow_invalid", UNSET)

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        include_from = d.pop("includeFrom", UNSET)

        post_api_gateway_v1_ledgers_owner_name_entries_move_body = cls(
            entries=entries,
            to_path=to_path,
            allowInvalid=allowInvalid,
            allow_invalid=allow_invalid,
            dryRun=dryRun,
            dry_run=dry_run,
            include_from=include_from,
        )

        return post_api_gateway_v1_ledgers_owner_name_entries_move_body
