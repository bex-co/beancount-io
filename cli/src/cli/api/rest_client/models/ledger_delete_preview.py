from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="LedgerDeletePreview")


@_attrs_define
class LedgerDeletePreview:
    """The destroy summary; present only on deleteLedger previews.

    Attributes:
        ledger_id (str): The ledger that would be destroyed.
        name (str): Its current name.
        description (None | str): Its current description, null when unset.
        private (bool): Its current visibility.
        empty (bool): Whether it holds any content.
        size (float): Its current size in bytes.
        warnings (list[str]): What makes the irreversibility unmissable: permanent deletion and linked-bank cleanup.
    """

    ledger_id: str
    name: str
    description: None | str
    private: bool
    empty: bool
    size: float
    warnings: list[str]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ledger_id = self.ledger_id

        name = self.name

        description: None | str
        description = self.description

        private = self.private

        empty = self.empty

        size = self.size

        warnings = self.warnings

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ledgerId": ledger_id,
                "name": name,
                "description": description,
                "private": private,
                "empty": empty,
                "size": size,
                "warnings": warnings,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ledger_id = d.pop("ledgerId")

        name = d.pop("name")

        def _parse_description(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        description = _parse_description(d.pop("description"))

        private = d.pop("private")

        empty = d.pop("empty")

        size = d.pop("size")

        warnings = cast(list[str], d.pop("warnings"))

        ledger_delete_preview = cls(
            ledger_id=ledger_id,
            name=name,
            description=description,
            private=private,
            empty=empty,
            size=size,
            warnings=warnings,
        )

        ledger_delete_preview.additional_properties = d
        return ledger_delete_preview

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
