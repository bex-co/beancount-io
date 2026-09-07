from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_social_profile_response_200_activities_item import (
        GetApiGatewayV1SocialProfileResponse200ActivitiesItem,
    )
    from ..models.get_api_gateway_v1_social_profile_response_200_profile import (
        GetApiGatewayV1SocialProfileResponse200Profile,
    )
    from ..models.get_api_gateway_v1_social_profile_response_200_repositories_item import (
        GetApiGatewayV1SocialProfileResponse200RepositoriesItem,
    )


T = TypeVar("T", bound="GetApiGatewayV1SocialProfileResponse200")


@_attrs_define
class GetApiGatewayV1SocialProfileResponse200:
    """
    Attributes:
        profile (GetApiGatewayV1SocialProfileResponse200Profile):
        activities (list[GetApiGatewayV1SocialProfileResponse200ActivitiesItem]):
        repositories (list[GetApiGatewayV1SocialProfileResponse200RepositoriesItem]):
        is_following (bool | None | Unset):
    """

    profile: GetApiGatewayV1SocialProfileResponse200Profile
    activities: list[GetApiGatewayV1SocialProfileResponse200ActivitiesItem]
    repositories: list[GetApiGatewayV1SocialProfileResponse200RepositoriesItem]
    is_following: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        profile = self.profile.to_dict()

        activities = []
        for activities_item_data in self.activities:
            activities_item = activities_item_data.to_dict()
            activities.append(activities_item)

        repositories = []
        for repositories_item_data in self.repositories:
            repositories_item = repositories_item_data.to_dict()
            repositories.append(repositories_item)

        is_following: bool | None | Unset
        if isinstance(self.is_following, Unset):
            is_following = UNSET
        else:
            is_following = self.is_following

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "profile": profile,
                "activities": activities,
                "repositories": repositories,
            }
        )
        if is_following is not UNSET:
            field_dict["isFollowing"] = is_following

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_social_profile_response_200_activities_item import (
            GetApiGatewayV1SocialProfileResponse200ActivitiesItem,  # noqa: PLC0415
        )
        from ..models.get_api_gateway_v1_social_profile_response_200_profile import (
            GetApiGatewayV1SocialProfileResponse200Profile,  # noqa: PLC0415
        )
        from ..models.get_api_gateway_v1_social_profile_response_200_repositories_item import (
            GetApiGatewayV1SocialProfileResponse200RepositoriesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        profile = GetApiGatewayV1SocialProfileResponse200Profile.from_dict(d.pop("profile"))

        activities = []
        _activities = d.pop("activities")
        for activities_item_data in _activities:
            activities_item = GetApiGatewayV1SocialProfileResponse200ActivitiesItem.from_dict(activities_item_data)

            activities.append(activities_item)

        repositories = []
        _repositories = d.pop("repositories")
        for repositories_item_data in _repositories:
            repositories_item = GetApiGatewayV1SocialProfileResponse200RepositoriesItem.from_dict(
                repositories_item_data
            )

            repositories.append(repositories_item)

        def _parse_is_following(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        is_following = _parse_is_following(d.pop("isFollowing", UNSET))

        get_api_gateway_v1_social_profile_response_200 = cls(
            profile=profile,
            activities=activities,
            repositories=repositories,
            is_following=is_following,
        )

        get_api_gateway_v1_social_profile_response_200.additional_properties = d
        return get_api_gateway_v1_social_profile_response_200

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
