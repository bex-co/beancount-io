from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteBody:
    """
    Attributes:
        sha256sum (str):
        entryHash (str | Unset): The entry's hash.
        entry_hash (str | Unset): Alias of entryHash, as list output spells it.
        allowInvalid (bool | Unset): Commit even when the write would add bean-check errors (VALIDATION_FAILED with
            newLedgerErrors), instead of refusing it.
        allow_invalid (bool | Unset): Alias of allowInvalid.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
    """

    sha256sum: str
    entryHash: str | Unset = UNSET
    entry_hash: str | Unset = UNSET
    allowInvalid: bool | Unset = UNSET
    allow_invalid: bool | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        sha256sum = self.sha256sum

        entryHash = self.entryHash

        entry_hash = self.entry_hash

        allowInvalid = self.allowInvalid

        allow_invalid = self.allow_invalid

        dryRun = self.dryRun

        dry_run = self.dry_run

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "sha256sum": sha256sum,
            }
        )
        if entryHash is not UNSET:
            field_dict["entryHash"] = entryHash
        if entry_hash is not UNSET:
            field_dict["entry_hash"] = entry_hash
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
        d = dict(src_dict)
        sha256sum = d.pop("sha256sum")

        entryHash = d.pop("entryHash", UNSET)

        entry_hash = d.pop("entry_hash", UNSET)

        allowInvalid = d.pop("allowInvalid", UNSET)

        allow_invalid = d.pop("allow_invalid", UNSET)

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_body = cls(
            sha256sum=sha256sum,
            entryHash=entryHash,
            entry_hash=entry_hash,
            allowInvalid=allowInvalid,
            allow_invalid=allow_invalid,
            dryRun=dryRun,
            dry_run=dry_run,
        )

        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_body
