from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem:
    """
    Attributes:
        file (str):
        line (int):
        target (str):
    """

    file: str
    line: int
    target: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        file = self.file

        line = self.line

        target = self.target

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "file": file,
                "line": line,
                "target": target,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        file = d.pop("file")

        line = d.pop("line")

        target = d.pop("target")

        post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_included_from_item = cls(
            file=file,
            line=line,
            target=target,
        )

        post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_included_from_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_included_from_item

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
