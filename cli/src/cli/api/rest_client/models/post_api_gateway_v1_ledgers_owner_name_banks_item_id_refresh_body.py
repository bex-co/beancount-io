from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameBanksItemIdRefreshBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameBanksItemIdRefreshBody:
    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        post_api_gateway_v1_ledgers_owner_name_banks_item_id_refresh_body = cls()

        return post_api_gateway_v1_ledgers_owner_name_banks_item_id_refresh_body
