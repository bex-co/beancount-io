from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.ledger_dir_entry_type import LedgerDirEntryType

T = TypeVar("T", bound="LedgerDirEntry")


@_attrs_define
class LedgerDirEntry:
    """One file or directory at a level of the repository

    Attributes:
        path (str):
        name (str):
        type_ (LedgerDirEntryType):
        size (int): Size in bytes
        sha (str): Blob SHA: send it back as the optimistic lock of a delete or update
        last_commit_sha (None | str): The commit that last touched the entry, when known
    """

    path: str
    name: str
    type_: LedgerDirEntryType
    size: int
    sha: str
    last_commit_sha: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        name = self.name

        type_ = self.type_.value

        size = self.size

        sha = self.sha

        last_commit_sha: None | str
        last_commit_sha = self.last_commit_sha

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "path": path,
                "name": name,
                "type": type_,
                "size": size,
                "sha": sha,
                "lastCommitSha": last_commit_sha,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        name = d.pop("name")

        type_ = LedgerDirEntryType(d.pop("type"))

        size = d.pop("size")

        sha = d.pop("sha")

        def _parse_last_commit_sha(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        last_commit_sha = _parse_last_commit_sha(d.pop("lastCommitSha"))

        ledger_dir_entry = cls(
            path=path,
            name=name,
            type_=type_,
            size=size,
            sha=sha,
            last_commit_sha=last_commit_sha,
        )

        ledger_dir_entry.additional_properties = d
        return ledger_dir_entry

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
