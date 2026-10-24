from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="LedgerFile")


@_attrs_define
class LedgerFile:
    """One ledger file and its blob SHA

    Attributes:
        path (str):
        content (str):
        sha (str):
        lossy (bool | Unset): Present when the file is not valid UTF-8: `content` shows U+FFFD for its undecodable
            bytes, so writing it back would replace them.
    """

    path: str
    content: str
    sha: str
    lossy: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        content = self.content

        sha = self.sha

        lossy = self.lossy

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "path": path,
                "content": content,
                "sha": sha,
            }
        )
        if lossy is not UNSET:
            field_dict["lossy"] = lossy

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        content = d.pop("content")

        sha = d.pop("sha")

        lossy = d.pop("lossy", UNSET)

        ledger_file = cls(
            path=path,
            content=content,
            sha=sha,
            lossy=lossy,
        )

        ledger_file.additional_properties = d
        return ledger_file

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
