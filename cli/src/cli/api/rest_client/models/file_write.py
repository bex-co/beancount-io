from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="FileWrite")


@_attrs_define
class FileWrite:
    """New content for one ledger file

    Attributes:
        content (str): The file's full new content, as UTF-8 text Example: 2026-01-01 open Assets:Bank:Checking USD
            .
        message (str | Unset): Commit message; defaults to a generated one Example: Add January transactions.
        sha (str | Unset): Blob SHA the edit is based on. Send the SHA from a prior GET to update an existing file; omit
            it to create a new one.
    """

    content: str
    message: str | Unset = UNSET
    sha: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        content = self.content

        message = self.message

        sha = self.sha

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "content": content,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message
        if sha is not UNSET:
            field_dict["sha"] = sha

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        content = d.pop("content")

        message = d.pop("message", UNSET)

        sha = d.pop("sha", UNSET)

        file_write = cls(
            content=content,
            message=message,
            sha=sha,
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
