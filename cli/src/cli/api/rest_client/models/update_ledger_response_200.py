from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.update_ledger_response_200_permissions import UpdateLedgerResponse200Permissions


T = TypeVar("T", bound="UpdateLedgerResponse200")


@_attrs_define
class UpdateLedgerResponse200:
    """
    Attributes:
        id (str):
        name (str):
        full_name (str):
        ssh_url (str):
        http_url (str):
        empty (bool):
        private (bool):
        created_at (str):
        updated_at (str):
        size (float):
        description (None | str | Unset):
        permissions (UpdateLedgerResponse200Permissions | Unset):
        is_starred (bool | Unset):
    """

    id: str
    name: str
    full_name: str
    ssh_url: str
    http_url: str
    empty: bool
    private: bool
    created_at: str
    updated_at: str
    size: float
    description: None | str | Unset = UNSET
    permissions: UpdateLedgerResponse200Permissions | Unset = UNSET
    is_starred: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        full_name = self.full_name

        ssh_url = self.ssh_url

        http_url = self.http_url

        empty = self.empty

        private = self.private

        created_at = self.created_at

        updated_at = self.updated_at

        size = self.size

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        permissions: dict[str, Any] | Unset = UNSET
        if not isinstance(self.permissions, Unset):
            permissions = self.permissions.to_dict()

        is_starred = self.is_starred

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "fullName": full_name,
                "sshUrl": ssh_url,
                "httpUrl": http_url,
                "empty": empty,
                "private": private,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "size": size,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if permissions is not UNSET:
            field_dict["permissions"] = permissions
        if is_starred is not UNSET:
            field_dict["isStarred"] = is_starred

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.update_ledger_response_200_permissions import UpdateLedgerResponse200Permissions  # noqa: PLC0415

        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        full_name = d.pop("fullName")

        ssh_url = d.pop("sshUrl")

        http_url = d.pop("httpUrl")

        empty = d.pop("empty")

        private = d.pop("private")

        created_at = d.pop("createdAt")

        updated_at = d.pop("updatedAt")

        size = d.pop("size")

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _permissions = d.pop("permissions", UNSET)
        permissions: UpdateLedgerResponse200Permissions | Unset
        if isinstance(_permissions, Unset):
            permissions = UNSET
        else:
            permissions = UpdateLedgerResponse200Permissions.from_dict(_permissions)

        is_starred = d.pop("isStarred", UNSET)

        update_ledger_response_200 = cls(
            id=id,
            name=name,
            full_name=full_name,
            ssh_url=ssh_url,
            http_url=http_url,
            empty=empty,
            private=private,
            created_at=created_at,
            updated_at=updated_at,
            size=size,
            description=description,
            permissions=permissions,
            is_starred=is_starred,
        )

        update_ledger_response_200.additional_properties = d
        return update_ledger_response_200

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
