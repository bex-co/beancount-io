from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_ledger_body_setup_type_0_capabilities_additional_property import (
    CreateLedgerBodySetupType0CapabilitiesAdditionalProperty,
)

T = TypeVar("T", bound="CreateLedgerBodySetupType0Capabilities")


@_attrs_define
class CreateLedgerBodySetupType0Capabilities:
    """Keyed by preset question id; only enabled adds its accounts."""

    additional_properties: dict[str, CreateLedgerBodySetupType0CapabilitiesAdditionalProperty] = _attrs_field(
        init=False, factory=dict
    )

    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}
        for prop_name, prop in self.additional_properties.items():
            field_dict[prop_name] = prop.value

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        create_ledger_body_setup_type_0_capabilities = cls()

        additional_properties = {}
        for prop_name, prop_dict in d.items():
            additional_property = CreateLedgerBodySetupType0CapabilitiesAdditionalProperty(prop_dict)

            additional_properties[prop_name] = additional_property

        create_ledger_body_setup_type_0_capabilities.additional_properties = additional_properties
        return create_ledger_body_setup_type_0_capabilities

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> CreateLedgerBodySetupType0CapabilitiesAdditionalProperty:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: CreateLedgerBodySetupType0CapabilitiesAdditionalProperty) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
