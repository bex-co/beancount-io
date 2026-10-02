from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.get_api_gateway_v1_account_feed_response_200_items_item import (
        GetApiGatewayV1AccountFeedResponse200ItemsItem,
    )


T = TypeVar("T", bound="GetApiGatewayV1AccountFeedResponse200")


@_attrs_define
class GetApiGatewayV1AccountFeedResponse200:
    """
    Attributes:
        items (list[GetApiGatewayV1AccountFeedResponse200ItemsItem]):
        total (float):
        has_more (bool):
    """

    items: list[GetApiGatewayV1AccountFeedResponse200ItemsItem]
    total: float
    has_more: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        items = []
        for items_item_data in self.items:
            items_item = items_item_data.to_dict()
            items.append(items_item)

        total = self.total

        has_more = self.has_more

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "items": items,
                "total": total,
                "hasMore": has_more,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_api_gateway_v1_account_feed_response_200_items_item import (
            GetApiGatewayV1AccountFeedResponse200ItemsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        items = []
        _items = d.pop("items")
        for items_item_data in _items:
            items_item = GetApiGatewayV1AccountFeedResponse200ItemsItem.from_dict(items_item_data)

            items.append(items_item)

        total = d.pop("total")

        has_more = d.pop("hasMore")

        get_api_gateway_v1_account_feed_response_200 = cls(
            items=items,
            total=total,
            has_more=has_more,
        )

        get_api_gateway_v1_account_feed_response_200.additional_properties = d
        return get_api_gateway_v1_account_feed_response_200

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
