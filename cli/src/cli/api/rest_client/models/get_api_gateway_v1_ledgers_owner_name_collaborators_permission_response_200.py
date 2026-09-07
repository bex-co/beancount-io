from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_ledgers_owner_name_collaborators_permission_response_200_user import (
        GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User,
    )


T = TypeVar("T", bound="GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200")


@_attrs_define
class GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200:
    """
    Attributes:
        permission (str | Unset):
        role_name (str | Unset):
        user (GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User | Unset):
    """

    permission: str | Unset = UNSET
    role_name: str | Unset = UNSET
    user: GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        permission = self.permission

        role_name = self.role_name

        user: dict[str, Any] | Unset = UNSET
        if not isinstance(self.user, Unset):
            user = self.user.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if permission is not UNSET:
            field_dict["permission"] = permission
        if role_name is not UNSET:
            field_dict["roleName"] = role_name
        if user is not UNSET:
            field_dict["user"] = user

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_ledgers_owner_name_collaborators_permission_response_200_user import (
            GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User,  # noqa: PLC0415
        )

        d = dict(src_dict)
        permission = d.pop("permission", UNSET)

        role_name = d.pop("roleName", UNSET)

        _user = d.pop("user", UNSET)
        user: GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User | Unset
        if isinstance(_user, Unset):
            user = UNSET
        else:
            user = GetApiGatewayV1LedgersOwnerNameCollaboratorsPermissionResponse200User.from_dict(_user)

        get_api_gateway_v1_ledgers_owner_name_collaborators_permission_response_200 = cls(
            permission=permission,
            role_name=role_name,
            user=user,
        )

        get_api_gateway_v1_ledgers_owner_name_collaborators_permission_response_200.additional_properties = d
        return get_api_gateway_v1_ledgers_owner_name_collaborators_permission_response_200

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
