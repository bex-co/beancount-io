from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem")


@_attrs_define
class GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem:
    """
    Attributes:
        name (str):
        full_name (str):
        is_private (bool):
        updated_at (datetime.datetime):
        description (str | Unset):
        stars_count (float | Unset):
    """

    name: str
    full_name: str
    is_private: bool
    updated_at: datetime.datetime
    description: str | Unset = UNSET
    stars_count: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        full_name = self.full_name

        is_private = self.is_private

        updated_at = self.updated_at.isoformat()

        description = self.description

        stars_count = self.stars_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "fullName": full_name,
                "isPrivate": is_private,
                "updatedAt": updated_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if stars_count is not UNSET:
            field_dict["starsCount"] = stars_count

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        full_name = d.pop("fullName")

        is_private = d.pop("isPrivate")

        updated_at = datetime.datetime.fromisoformat(d.pop("updatedAt"))

        description = d.pop("description", UNSET)

        stars_count = d.pop("starsCount", UNSET)

        get_api_gateway_v1_social_starred_repositories_response_200_repositories_item = cls(
            name=name,
            full_name=full_name,
            is_private=is_private,
            updated_at=updated_at,
            description=description,
            stars_count=stars_count,
        )

        get_api_gateway_v1_social_starred_repositories_response_200_repositories_item.additional_properties = d
        return get_api_gateway_v1_social_starred_repositories_response_200_repositories_item

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
