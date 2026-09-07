from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorResponse200")


@_attrs_define
class PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorResponse200:
    """
    Attributes:
        success (bool):
        message (str | Unset):
    """

    success: bool
    message: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        message = self.message

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        success = d.pop("success")

        message = d.pop("message", UNSET)

        put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200 = cls(
            success=success,
            message=message,
        )

        put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200.additional_properties = d
        return put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200

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
