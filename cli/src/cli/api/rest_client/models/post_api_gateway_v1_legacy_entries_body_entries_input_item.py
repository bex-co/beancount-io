from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item_meta import (
        PostApiGatewayV1LegacyEntriesBodyEntriesInputItemMeta,
    )
    from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item_postings_item import (
        PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LegacyEntriesBodyEntriesInputItem")


@_attrs_define
class PostApiGatewayV1LegacyEntriesBodyEntriesInputItem:
    """
    Attributes:
        type_ (str):
        date (str):
        flag (str):
        meta (PostApiGatewayV1LegacyEntriesBodyEntriesInputItemMeta):
        narration (str):
        payee (str):
        postings (list[PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem]):
    """

    type_: str
    date: str
    flag: str
    meta: PostApiGatewayV1LegacyEntriesBodyEntriesInputItemMeta
    narration: str
    payee: str
    postings: list[PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem]

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_

        date = self.date

        flag = self.flag

        meta = self.meta.to_dict()

        narration = self.narration

        payee = self.payee

        postings = []
        for postings_item_data in self.postings:
            postings_item = postings_item_data.to_dict()
            postings.append(postings_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "type": type_,
                "date": date,
                "flag": flag,
                "meta": meta,
                "narration": narration,
                "payee": payee,
                "postings": postings,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item_meta import (
            PostApiGatewayV1LegacyEntriesBodyEntriesInputItemMeta,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item_postings_item import (
            PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        type_ = d.pop("type")

        date = d.pop("date")

        flag = d.pop("flag")

        meta = PostApiGatewayV1LegacyEntriesBodyEntriesInputItemMeta.from_dict(d.pop("meta"))

        narration = d.pop("narration")

        payee = d.pop("payee")

        postings = []
        _postings = d.pop("postings")
        for postings_item_data in _postings:
            postings_item = PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem.from_dict(postings_item_data)

            postings.append(postings_item)

        post_api_gateway_v1_legacy_entries_body_entries_input_item = cls(
            type_=type_,
            date=date,
            flag=flag,
            meta=meta,
            narration=narration,
            payee=payee,
            postings=postings,
        )

        return post_api_gateway_v1_legacy_entries_body_entries_input_item
