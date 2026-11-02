from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..models.preview_ledger_setup_body_setup_modules_item_id import PreviewLedgerSetupBodySetupModulesItemId
from ..types import UNSET, Unset

T = TypeVar("T", bound="PreviewLedgerSetupBodySetupModulesItem")


@_attrs_define
class PreviewLedgerSetupBodySetupModulesItem:
    """
    Attributes:
        id (PreviewLedgerSetupBodySetupModulesItemId):
        property_name (str | Unset): rental-property@1 only; default Property1.
    """

    id: PreviewLedgerSetupBodySetupModulesItemId
    property_name: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        id = self.id.value

        property_name = self.property_name

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
            }
        )
        if property_name is not UNSET:
            field_dict["propertyName"] = property_name

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = PreviewLedgerSetupBodySetupModulesItemId(d.pop("id"))

        property_name = d.pop("propertyName", UNSET)

        preview_ledger_setup_body_setup_modules_item = cls(
            id=id,
            property_name=property_name,
        )

        return preview_ledger_setup_body_setup_modules_item
