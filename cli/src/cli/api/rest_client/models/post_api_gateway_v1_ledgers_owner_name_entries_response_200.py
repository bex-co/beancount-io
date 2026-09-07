from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntriesResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntriesResponse200:
    """
    Attributes:
        success (bool):
        message (None | str | Unset):
    """

    success: bool
    message: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "success": success,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        success = d.pop("success")

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        post_api_gateway_v1_ledgers_owner_name_entries_response_200 = cls(
            success=success,
            message=message,
        )

        return post_api_gateway_v1_ledgers_owner_name_entries_response_200
