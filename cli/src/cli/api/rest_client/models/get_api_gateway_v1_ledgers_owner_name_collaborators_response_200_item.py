from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_api_gateway_v1_ledgers_owner_name_collaborators_response_200_item_permission import (
    GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200Item")


@_attrs_define
class GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200Item:
    """
    Attributes:
        id (float | Unset):
        login (str | Unset):
        full_name (str | Unset):
        email (str | Unset):
        active (bool | Unset):
        is_admin (bool | Unset):
        created (str | Unset):
        last_login (str | Unset):
        permission (GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission | Unset):
    """

    id: float | Unset = UNSET
    login: str | Unset = UNSET
    full_name: str | Unset = UNSET
    email: str | Unset = UNSET
    active: bool | Unset = UNSET
    is_admin: bool | Unset = UNSET
    created: str | Unset = UNSET
    last_login: str | Unset = UNSET
    permission: GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        login = self.login

        full_name = self.full_name

        email = self.email

        active = self.active

        is_admin = self.is_admin

        created = self.created

        last_login = self.last_login

        permission: str | Unset = UNSET
        if not isinstance(self.permission, Unset):
            permission = self.permission.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if login is not UNSET:
            field_dict["login"] = login
        if full_name is not UNSET:
            field_dict["fullName"] = full_name
        if email is not UNSET:
            field_dict["email"] = email
        if active is not UNSET:
            field_dict["active"] = active
        if is_admin is not UNSET:
            field_dict["isAdmin"] = is_admin
        if created is not UNSET:
            field_dict["created"] = created
        if last_login is not UNSET:
            field_dict["lastLogin"] = last_login
        if permission is not UNSET:
            field_dict["permission"] = permission

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        login = d.pop("login", UNSET)

        full_name = d.pop("fullName", UNSET)

        email = d.pop("email", UNSET)

        active = d.pop("active", UNSET)

        is_admin = d.pop("isAdmin", UNSET)

        created = d.pop("created", UNSET)

        last_login = d.pop("lastLogin", UNSET)

        _permission = d.pop("permission", UNSET)
        permission: GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission | Unset
        if isinstance(_permission, Unset):
            permission = UNSET
        else:
            permission = GetApiGatewayV1LedgersOwnerNameCollaboratorsResponse200ItemPermission(_permission)

        get_api_gateway_v1_ledgers_owner_name_collaborators_response_200_item = cls(
            id=id,
            login=login,
            full_name=full_name,
            email=email,
            active=active,
            is_admin=is_admin,
            created=created,
            last_login=last_login,
            permission=permission,
        )

        get_api_gateway_v1_ledgers_owner_name_collaborators_response_200_item.additional_properties = d
        return get_api_gateway_v1_ledgers_owner_name_collaborators_response_200_item

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
