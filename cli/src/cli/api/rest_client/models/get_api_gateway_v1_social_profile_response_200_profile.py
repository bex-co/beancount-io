from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1SocialProfileResponse200Profile")


@_attrs_define
class GetApiGatewayV1SocialProfileResponse200Profile:
    """
    Attributes:
        username (str):
        followers_count (float):
        following_count (float):
        starred_repos_count (float):
        full_name (None | str | Unset):
        avatar_url (None | str | Unset):
        bio (None | str | Unset):
        location (None | str | Unset):
        website (None | str | Unset):
        created (datetime.datetime | None | Unset):
    """

    username: str
    followers_count: float
    following_count: float
    starred_repos_count: float
    full_name: None | str | Unset = UNSET
    avatar_url: None | str | Unset = UNSET
    bio: None | str | Unset = UNSET
    location: None | str | Unset = UNSET
    website: None | str | Unset = UNSET
    created: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        username = self.username

        followers_count = self.followers_count

        following_count = self.following_count

        starred_repos_count = self.starred_repos_count

        full_name: None | str | Unset
        if isinstance(self.full_name, Unset):
            full_name = UNSET
        else:
            full_name = self.full_name

        avatar_url: None | str | Unset
        if isinstance(self.avatar_url, Unset):
            avatar_url = UNSET
        else:
            avatar_url = self.avatar_url

        bio: None | str | Unset
        if isinstance(self.bio, Unset):
            bio = UNSET
        else:
            bio = self.bio

        location: None | str | Unset
        if isinstance(self.location, Unset):
            location = UNSET
        else:
            location = self.location

        website: None | str | Unset
        if isinstance(self.website, Unset):
            website = UNSET
        else:
            website = self.website

        created: None | str | Unset
        if isinstance(self.created, Unset):
            created = UNSET
        elif isinstance(self.created, datetime.datetime):
            created = self.created.isoformat()
        else:
            created = self.created

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "username": username,
                "followersCount": followers_count,
                "followingCount": following_count,
                "starredReposCount": starred_repos_count,
            }
        )
        if full_name is not UNSET:
            field_dict["fullName"] = full_name
        if avatar_url is not UNSET:
            field_dict["avatarUrl"] = avatar_url
        if bio is not UNSET:
            field_dict["bio"] = bio
        if location is not UNSET:
            field_dict["location"] = location
        if website is not UNSET:
            field_dict["website"] = website
        if created is not UNSET:
            field_dict["created"] = created

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        username = d.pop("username")

        followers_count = d.pop("followersCount")

        following_count = d.pop("followingCount")

        starred_repos_count = d.pop("starredReposCount")

        def _parse_full_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        full_name = _parse_full_name(d.pop("fullName", UNSET))

        def _parse_avatar_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        avatar_url = _parse_avatar_url(d.pop("avatarUrl", UNSET))

        def _parse_bio(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        bio = _parse_bio(d.pop("bio", UNSET))

        def _parse_location(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        location = _parse_location(d.pop("location", UNSET))

        def _parse_website(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        website = _parse_website(d.pop("website", UNSET))

        def _parse_created(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                created_type_0 = datetime.datetime.fromisoformat(data)

                return created_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        created = _parse_created(d.pop("created", UNSET))

        get_api_gateway_v1_social_profile_response_200_profile = cls(
            username=username,
            followers_count=followers_count,
            following_count=following_count,
            starred_repos_count=starred_repos_count,
            full_name=full_name,
            avatar_url=avatar_url,
            bio=bio,
            location=location,
            website=website,
            created=created,
        )

        get_api_gateway_v1_social_profile_response_200_profile.additional_properties = d
        return get_api_gateway_v1_social_profile_response_200_profile

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
