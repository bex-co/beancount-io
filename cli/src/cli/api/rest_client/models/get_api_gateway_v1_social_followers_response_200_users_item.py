from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1SocialFollowersResponse200UsersItem")


@_attrs_define
class GetApiGatewayV1SocialFollowersResponse200UsersItem:
    """
    Attributes:
        username (str):
        full_name (str | Unset):
        avatar_url (str | Unset):
        bio (str | Unset):
    """

    username: str
    full_name: str | Unset = UNSET
    avatar_url: str | Unset = UNSET
    bio: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        username = self.username

        full_name = self.full_name

        avatar_url = self.avatar_url

        bio = self.bio

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "username": username,
            }
        )
        if full_name is not UNSET:
            field_dict["fullName"] = full_name
        if avatar_url is not UNSET:
            field_dict["avatarUrl"] = avatar_url
        if bio is not UNSET:
            field_dict["bio"] = bio

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        username = d.pop("username")

        full_name = d.pop("fullName", UNSET)

        avatar_url = d.pop("avatarUrl", UNSET)

        bio = d.pop("bio", UNSET)

        get_api_gateway_v1_social_followers_response_200_users_item = cls(
            username=username,
            full_name=full_name,
            avatar_url=avatar_url,
            bio=bio,
        )

        get_api_gateway_v1_social_followers_response_200_users_item.additional_properties = d
        return get_api_gateway_v1_social_followers_response_200_users_item

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
