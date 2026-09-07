from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1SocialProfileResponse200ActivitiesItem")


@_attrs_define
class GetApiGatewayV1SocialProfileResponse200ActivitiesItem:
    """
    Attributes:
        id (str):
        type_ (str):
        content (str):
        created_at (datetime.datetime):
        repo_name (None | str | Unset):
        repo_full_name (None | str | Unset):
    """

    id: str
    type_: str
    content: str
    created_at: datetime.datetime
    repo_name: None | str | Unset = UNSET
    repo_full_name: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_ = self.type_

        content = self.content

        created_at = self.created_at.isoformat()

        repo_name: None | str | Unset
        if isinstance(self.repo_name, Unset):
            repo_name = UNSET
        else:
            repo_name = self.repo_name

        repo_full_name: None | str | Unset
        if isinstance(self.repo_full_name, Unset):
            repo_full_name = UNSET
        else:
            repo_full_name = self.repo_full_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "type": type_,
                "content": content,
                "createdAt": created_at,
            }
        )
        if repo_name is not UNSET:
            field_dict["repoName"] = repo_name
        if repo_full_name is not UNSET:
            field_dict["repoFullName"] = repo_full_name

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        type_ = d.pop("type")

        content = d.pop("content")

        created_at = datetime.datetime.fromisoformat(d.pop("createdAt"))

        def _parse_repo_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        repo_name = _parse_repo_name(d.pop("repoName", UNSET))

        def _parse_repo_full_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        repo_full_name = _parse_repo_full_name(d.pop("repoFullName", UNSET))

        get_api_gateway_v1_social_profile_response_200_activities_item = cls(
            id=id,
            type_=type_,
            content=content,
            created_at=created_at,
            repo_name=repo_name,
            repo_full_name=repo_full_name,
        )

        get_api_gateway_v1_social_profile_response_200_activities_item.additional_properties = d
        return get_api_gateway_v1_social_profile_response_200_activities_item

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
