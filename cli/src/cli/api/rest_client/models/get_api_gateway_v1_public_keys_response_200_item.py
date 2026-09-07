from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1PublicKeysResponse200Item")


@_attrs_define
class GetApiGatewayV1PublicKeysResponse200Item:
    """
    Attributes:
        id (float):
        fingerprint (str):
        key (str):
        title (str):
        created_at (str):
        last_used_at (str | Unset):
    """

    id: float
    fingerprint: str
    key: str
    title: str
    created_at: str
    last_used_at: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        fingerprint = self.fingerprint

        key = self.key

        title = self.title

        created_at = self.created_at

        last_used_at = self.last_used_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "fingerprint": fingerprint,
                "key": key,
                "title": title,
                "createdAt": created_at,
            }
        )
        if last_used_at is not UNSET:
            field_dict["lastUsedAt"] = last_used_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        fingerprint = d.pop("fingerprint")

        key = d.pop("key")

        title = d.pop("title")

        created_at = d.pop("createdAt")

        last_used_at = d.pop("lastUsedAt", UNSET)

        get_api_gateway_v1_public_keys_response_200_item = cls(
            id=id,
            fingerprint=fingerprint,
            key=key,
            title=title,
            created_at=created_at,
            last_used_at=last_used_at,
        )

        get_api_gateway_v1_public_keys_response_200_item.additional_properties = d
        return get_api_gateway_v1_public_keys_response_200_item

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
