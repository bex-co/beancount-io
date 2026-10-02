from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_api_gateway_v1_account_feed_response_200_items_item_source import (
    GetApiGatewayV1AccountFeedResponse200ItemsItemSource,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="GetApiGatewayV1AccountFeedResponse200ItemsItem")


@_attrs_define
class GetApiGatewayV1AccountFeedResponse200ItemsItem:
    """
    Attributes:
        id (str):
        title (str):
        link (str):
        published_at (datetime.datetime):
        source (GetApiGatewayV1AccountFeedResponse200ItemsItemSource):
        summary (str | Unset):
        author (str | Unset):
        author_avatar (str | Unset):
    """

    id: str
    title: str
    link: str
    published_at: datetime.datetime
    source: GetApiGatewayV1AccountFeedResponse200ItemsItemSource
    summary: str | Unset = UNSET
    author: str | Unset = UNSET
    author_avatar: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        title = self.title

        link = self.link

        published_at = self.published_at.isoformat()

        source = self.source.value

        summary = self.summary

        author = self.author

        author_avatar = self.author_avatar

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "title": title,
                "link": link,
                "publishedAt": published_at,
                "source": source,
            }
        )
        if summary is not UNSET:
            field_dict["summary"] = summary
        if author is not UNSET:
            field_dict["author"] = author
        if author_avatar is not UNSET:
            field_dict["authorAvatar"] = author_avatar

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        title = d.pop("title")

        link = d.pop("link")

        published_at = datetime.datetime.fromisoformat(d.pop("publishedAt"))

        source = GetApiGatewayV1AccountFeedResponse200ItemsItemSource(d.pop("source"))

        summary = d.pop("summary", UNSET)

        author = d.pop("author", UNSET)

        author_avatar = d.pop("authorAvatar", UNSET)

        get_api_gateway_v1_account_feed_response_200_items_item = cls(
            id=id,
            title=title,
            link=link,
            published_at=published_at,
            source=source,
            summary=summary,
            author=author,
            author_avatar=author_avatar,
        )

        get_api_gateway_v1_account_feed_response_200_items_item.additional_properties = d
        return get_api_gateway_v1_account_feed_response_200_items_item

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
