from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="FileWrite")


@_attrs_define
class FileWrite:
    """New content for one ledger file, at most 1 MiB of UTF-8 bytes

    Attributes:
        content (str): The file's full new content, as UTF-8 text; at most 1 MiB (1,048,576 UTF-8 bytes). Example:
            2026-01-01 open Assets:Bank:Checking USD
            .
        message (str | Unset): Commit message; "Create <path>" or "Update <path>" when omitted or empty Example: Add
            January transactions.
        description (str | Unset): Alias of message, as the MCP file tools spell it.
        sha (str | Unset): Blob SHA the edit is based on. Send the SHA from a prior GET to update an existing file; omit
            it to create a new one.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
    """

    content: str
    message: str | Unset = UNSET
    description: str | Unset = UNSET
    sha: str | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        content = self.content

        message = self.message

        description = self.description

        sha = self.sha

        dryRun = self.dryRun

        dry_run = self.dry_run

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "content": content,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message
        if description is not UNSET:
            field_dict["description"] = description
        if sha is not UNSET:
            field_dict["sha"] = sha
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        content = d.pop("content")

        message = d.pop("message", UNSET)

        description = d.pop("description", UNSET)

        sha = d.pop("sha", UNSET)

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        file_write = cls(
            content=content,
            message=message,
            description=description,
            sha=sha,
            dryRun=dryRun,
            dry_run=dry_run,
        )

        file_write.additional_properties = d
        return file_write

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
