from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

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
    """

    path: str
    name: str
    type_: LedgerDirEntryType
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        name = self.name

        type_ = self.type_.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "path": path,
                "name": name,
                "type": type_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        name = d.pop("name")

        type_ = LedgerDirEntryType(d.pop("type"))

        ledger_dir_entry = cls(
            path=path,
            name=name,
            type_=type_,
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
