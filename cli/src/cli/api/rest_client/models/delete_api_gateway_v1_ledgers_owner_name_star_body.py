from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="DeleteApiGatewayV1LedgersOwnerNameStarBody")


@_attrs_define
class DeleteApiGatewayV1LedgersOwnerNameStarBody:
    def to_dict(self) -> dict[str, Any]:

        field_dict: dict[str, Any] = {}

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        delete_api_gateway_v1_ledgers_owner_name_star_body = cls()

        return delete_api_gateway_v1_ledgers_owner_name_star_body
