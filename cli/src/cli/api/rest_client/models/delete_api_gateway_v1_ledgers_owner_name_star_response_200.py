from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="DeleteApiGatewayV1LedgersOwnerNameStarResponse200")


@_attrs_define
class DeleteApiGatewayV1LedgersOwnerNameStarResponse200:
    """
    Attributes:
        success (bool):
        is_starred (bool):
        message (str | Unset):
    """

    success: bool
    is_starred: bool
    message: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        is_starred = self.is_starred

        message = self.message

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
                "isStarred": is_starred,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        success = d.pop("success")

        is_starred = d.pop("isStarred")

        message = d.pop("message", UNSET)

        delete_api_gateway_v1_ledgers_owner_name_star_response_200 = cls(
            success=success,
            is_starred=is_starred,
            message=message,
        )

        delete_api_gateway_v1_ledgers_owner_name_star_response_200.additional_properties = d
        return delete_api_gateway_v1_ledgers_owner_name_star_response_200

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
