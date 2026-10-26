from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PutApiGatewayV1LedgersOwnerNameEntrySourceBody")


@_attrs_define
class PutApiGatewayV1LedgersOwnerNameEntrySourceBody:
    """
    Attributes:
        sha256sum (str):
        new_content (str):
        entryHash (str | Unset): The entry's hash.
        entry_hash (str | Unset): Alias of entryHash, as list output spells it.
        allow_invalid (bool | Unset): Commit even when the write would add bean-check errors (VALIDATION_FAILED with
            newLedgerErrors), instead of refusing it.
    """

    sha256sum: str
    new_content: str
    entryHash: str | Unset = UNSET
    entry_hash: str | Unset = UNSET
    allow_invalid: bool | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        sha256sum = self.sha256sum

        new_content = self.new_content

        entryHash = self.entryHash

        entry_hash = self.entry_hash

        allow_invalid = self.allow_invalid

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "sha256sum": sha256sum,
                "newContent": new_content,
            }
        )
        if entryHash is not UNSET:
            field_dict["entryHash"] = entryHash
        if entry_hash is not UNSET:
            field_dict["entry_hash"] = entry_hash
        if allow_invalid is not UNSET:
            field_dict["allowInvalid"] = allow_invalid

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        sha256sum = d.pop("sha256sum")

        new_content = d.pop("newContent")

        entryHash = d.pop("entryHash", UNSET)

        entry_hash = d.pop("entry_hash", UNSET)

        allow_invalid = d.pop("allowInvalid", UNSET)

        put_api_gateway_v1_ledgers_owner_name_entry_source_body = cls(
            sha256sum=sha256sum,
            new_content=new_content,
            entryHash=entryHash,
            entry_hash=entry_hash,
            allow_invalid=allow_invalid,
        )

        return put_api_gateway_v1_ledgers_owner_name_entry_source_body
