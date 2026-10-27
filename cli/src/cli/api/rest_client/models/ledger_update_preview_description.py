from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="LedgerUpdatePreviewDescription")


@_attrs_define
class LedgerUpdatePreviewDescription:
    """Current and new description, when changing it.

    Attributes:
        from_ (None | str):
        to (str):
    """

    from_: None | str
    to: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from_: None | str
        from_ = self.from_

        to = self.to

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "from": from_,
                "to": to,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_from_(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        from_ = _parse_from_(d.pop("from"))

        to = d.pop("to")

        ledger_update_preview_description = cls(
            from_=from_,
            to=to,
        )

        ledger_update_preview_description.additional_properties = d
        return ledger_update_preview_description

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
