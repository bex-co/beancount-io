from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="SearchLedgersResponse200ItemPermissions")


@_attrs_define
class SearchLedgersResponse200ItemPermissions:
    """
    Attributes:
        admin (bool):
        pull (bool):
        push (bool):
    """

    admin: bool
    pull: bool
    push: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        admin = self.admin

        pull = self.pull

        push = self.push

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "admin": admin,
                "pull": pull,
                "push": push,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        admin = d.pop("admin")

        pull = d.pop("pull")

        push = d.pop("push")

        search_ledgers_response_200_item_permissions = cls(
            admin=admin,
            pull=pull,
            push=push,
        )

        search_ledgers_response_200_item_permissions.additional_properties = d
        return search_ledgers_response_200_item_permissions

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
