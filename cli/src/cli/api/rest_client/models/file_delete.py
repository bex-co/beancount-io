from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="FileDelete")


@_attrs_define
class FileDelete:
    """Delete one ledger file

    Attributes:
        message (str | Unset):
        description (str | Unset): Alias of message, as the MCP file tools spell it.
        sha (str | Unset): Blob SHA of the file being deleted, from a prior GET
        removeIncludes (bool | None | Unset): Also drop the exact `include` lines of other ledger files that reach this
            file, in the same commit. Without it, deleting an included file is refused. Glob includes are left as they are.
        remove_includes (bool | None | Unset): Alias of removeIncludes, as MCP spells it.
        dryRun (bool | Unset): Run every check and return the preview without committing
        dry_run (bool | Unset): Alias of dryRun, as MCP spells it.
        allowInvalid (bool | Unset): Commit even when the change adds bean-check errors (VALIDATION_FAILED), instead of
            refusing.
        allow_invalid (bool | Unset): Alias of allowInvalid, as MCP spells it.
    """

    message: str | Unset = UNSET
    description: str | Unset = UNSET
    sha: str | Unset = UNSET
    removeIncludes: bool | None | Unset = UNSET
    remove_includes: bool | None | Unset = UNSET
    dryRun: bool | Unset = UNSET
    dry_run: bool | Unset = UNSET
    allowInvalid: bool | Unset = UNSET
    allow_invalid: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        description = self.description

        sha = self.sha

        removeIncludes: bool | None | Unset
        if isinstance(self.removeIncludes, Unset):
            removeIncludes = UNSET
        else:
            removeIncludes = self.removeIncludes

        remove_includes: bool | None | Unset
        if isinstance(self.remove_includes, Unset):
            remove_includes = UNSET
        else:
            remove_includes = self.remove_includes

        dryRun = self.dryRun

        dry_run = self.dry_run

        allowInvalid = self.allowInvalid

        allow_invalid = self.allow_invalid

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if message is not UNSET:
            field_dict["message"] = message
        if description is not UNSET:
            field_dict["description"] = description
        if sha is not UNSET:
            field_dict["sha"] = sha
        if removeIncludes is not UNSET:
            field_dict["removeIncludes"] = removeIncludes
        if remove_includes is not UNSET:
            field_dict["remove_includes"] = remove_includes
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
        message = d.pop("message", UNSET)

        description = d.pop("description", UNSET)

        sha = d.pop("sha", UNSET)

        def _parse_removeIncludes(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        removeIncludes = _parse_removeIncludes(d.pop("removeIncludes", UNSET))

        def _parse_remove_includes(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        remove_includes = _parse_remove_includes(d.pop("remove_includes", UNSET))

        dryRun = d.pop("dryRun", UNSET)

        dry_run = d.pop("dry_run", UNSET)

        allowInvalid = d.pop("allowInvalid", UNSET)

        allow_invalid = d.pop("allow_invalid", UNSET)

        file_delete = cls(
            message=message,
            description=description,
            sha=sha,
            removeIncludes=removeIncludes,
            remove_includes=remove_includes,
            dryRun=dryRun,
            dry_run=dry_run,
            allowInvalid=allowInvalid,
            allow_invalid=allow_invalid,
        )

        file_delete.additional_properties = d
        return file_delete

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
