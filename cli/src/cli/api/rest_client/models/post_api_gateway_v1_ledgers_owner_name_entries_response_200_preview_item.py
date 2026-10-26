from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem:
    """
    Attributes:
        path (str):
        text (str):
    """

    path: str
    text: str

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        text = self.text

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "path": path,
                "text": text,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        text = d.pop("text")

        post_api_gateway_v1_ledgers_owner_name_entries_response_200_preview_item = cls(
            path=path,
            text=text,
        )

        return post_api_gateway_v1_ledgers_owner_name_entries_response_200_preview_item
