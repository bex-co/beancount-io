from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ledger_update_preview_description import LedgerUpdatePreviewDescription
    from ..models.ledger_update_preview_name import LedgerUpdatePreviewName
    from ..models.ledger_update_preview_private import LedgerUpdatePreviewPrivate


T = TypeVar("T", bound="LedgerUpdatePreview")


@_attrs_define
class LedgerUpdatePreview:
    """The rendered current→new diff; present only on updateLedger previews.

    Attributes:
        warnings (list[str]): What deserves a second look — a rename's URL change, a flip to public.
        name (LedgerUpdatePreviewName | Unset): Current and new name, when renaming.
        description (LedgerUpdatePreviewDescription | Unset): Current and new description, when changing it.
        private (LedgerUpdatePreviewPrivate | Unset): Current and new visibility, when changing it.
    """

    warnings: list[str]
    name: LedgerUpdatePreviewName | Unset = UNSET
    description: LedgerUpdatePreviewDescription | Unset = UNSET
    private: LedgerUpdatePreviewPrivate | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        warnings = self.warnings

        name: dict[str, Any] | Unset = UNSET
        if not isinstance(self.name, Unset):
            name = self.name.to_dict()

        description: dict[str, Any] | Unset = UNSET
        if not isinstance(self.description, Unset):
            description = self.description.to_dict()

        private: dict[str, Any] | Unset = UNSET
        if not isinstance(self.private, Unset):
            private = self.private.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "warnings": warnings,
            }
        )
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if private is not UNSET:
            field_dict["private"] = private

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ledger_update_preview_description import LedgerUpdatePreviewDescription  # noqa: PLC0415
        from ..models.ledger_update_preview_name import LedgerUpdatePreviewName  # noqa: PLC0415
        from ..models.ledger_update_preview_private import LedgerUpdatePreviewPrivate  # noqa: PLC0415

        d = dict(src_dict)
        warnings = cast(list[str], d.pop("warnings"))

        _name = d.pop("name", UNSET)
        name: LedgerUpdatePreviewName | Unset
        if isinstance(_name, Unset):
            name = UNSET
        else:
            name = LedgerUpdatePreviewName.from_dict(_name)

        _description = d.pop("description", UNSET)
        description: LedgerUpdatePreviewDescription | Unset
        if isinstance(_description, Unset):
            description = UNSET
        else:
            description = LedgerUpdatePreviewDescription.from_dict(_description)

        _private = d.pop("private", UNSET)
        private: LedgerUpdatePreviewPrivate | Unset
        if isinstance(_private, Unset):
            private = UNSET
        else:
            private = LedgerUpdatePreviewPrivate.from_dict(_private)

        ledger_update_preview = cls(
            warnings=warnings,
            name=name,
            description=description,
            private=private,
        )

        ledger_update_preview.additional_properties = d
        return ledger_update_preview

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
