from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_social_starred_repositories_response_200_repositories_item import (
        GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem,
    )


T = TypeVar("T", bound="GetApiGatewayV1SocialStarredRepositoriesResponse200")


@_attrs_define
class GetApiGatewayV1SocialStarredRepositoriesResponse200:
    """
    Attributes:
        repositories (list[GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem]):
        total (float):
    """

    repositories: list[GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem]
    total: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        repositories = []
        for repositories_item_data in self.repositories:
            repositories_item = repositories_item_data.to_dict()
            repositories.append(repositories_item)

        total = self.total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "repositories": repositories,
                "total": total,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_social_starred_repositories_response_200_repositories_item import (
            GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        repositories = []
        _repositories = d.pop("repositories")
        for repositories_item_data in _repositories:
            repositories_item = GetApiGatewayV1SocialStarredRepositoriesResponse200RepositoriesItem.from_dict(
                repositories_item_data
            )

            repositories.append(repositories_item)

        total = d.pop("total")

        get_api_gateway_v1_social_starred_repositories_response_200 = cls(
            repositories=repositories,
            total=total,
        )

        get_api_gateway_v1_social_starred_repositories_response_200.additional_properties = d
        return get_api_gateway_v1_social_starred_repositories_response_200

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
