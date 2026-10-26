from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item import (
        PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBody:
    """
    Attributes:
        entries (list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem]):
        allowInvalid (bool | Unset): Commit even when the write would add bean-check errors (VALIDATION_FAILED with
            newLedgerErrors), instead of refusing it.
        allow_invalid (bool | Unset): Alias of allowInvalid.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
    """

    entries: list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem]
    allowInvalid: bool | Unset = UNSET
    allow_invalid: bool | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        entries = []
        for entries_item_data in self.entries:
            entries_item = entries_item_data.to_dict()
            entries.append(entries_item)

        allowInvalid = self.allowInvalid

        allow_invalid = self.allow_invalid

        dryRun = self.dryRun

        dry_run = self.dry_run

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entries": entries,
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

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body_entries_item import (
            PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        entries = []
        _entries = d.pop("entries")
        for entries_item_data in _entries:
            entries_item = PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyBodyEntriesItem.from_dict(
                entries_item_data
            )

            entries.append(entries_item)

        allowInvalid = d.pop("allowInvalid", UNSET)

        allow_invalid = d.pop("allow_invalid", UNSET)

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body = cls(
            entries=entries,
            allowInvalid=allowInvalid,
            allow_invalid=allow_invalid,
            dryRun=dryRun,
            dry_run=dry_run,
        )

        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_body
