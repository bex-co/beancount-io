from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_social_following_response_200_users_item import (
        GetApiGatewayV1SocialFollowingResponse200UsersItem,
    )


T = TypeVar("T", bound="GetApiGatewayV1SocialFollowingResponse200")


@_attrs_define
class GetApiGatewayV1SocialFollowingResponse200:
    """
    Attributes:
        users (list[GetApiGatewayV1SocialFollowingResponse200UsersItem]):
        total (float):
    """

    users: list[GetApiGatewayV1SocialFollowingResponse200UsersItem]
    total: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        users = []
        for users_item_data in self.users:
            users_item = users_item_data.to_dict()
            users.append(users_item)

        total = self.total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "users": users,
                "total": total,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_social_following_response_200_users_item import (
            GetApiGatewayV1SocialFollowingResponse200UsersItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        users = []
        _users = d.pop("users")
        for users_item_data in _users:
            users_item = GetApiGatewayV1SocialFollowingResponse200UsersItem.from_dict(users_item_data)

            users.append(users_item)

        total = d.pop("total")

        get_api_gateway_v1_social_following_response_200 = cls(
            users=users,
            total=total,
        )

        get_api_gateway_v1_social_following_response_200.additional_properties = d
        return get_api_gateway_v1_social_following_response_200

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
