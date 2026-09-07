from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetApiGatewayV1AccountAiCfoUsageResponse200")


@_attrs_define
class GetApiGatewayV1AccountAiCfoUsageResponse200:
    """
    Attributes:
        ai_cfo_tokens_used (float):
        ai_cfo_tokens_max (float):
    """

    ai_cfo_tokens_used: float
    ai_cfo_tokens_max: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ai_cfo_tokens_used = self.ai_cfo_tokens_used

        ai_cfo_tokens_max = self.ai_cfo_tokens_max

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "aiCfoTokensUsed": ai_cfo_tokens_used,
                "aiCfoTokensMax": ai_cfo_tokens_max,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ai_cfo_tokens_used = d.pop("aiCfoTokensUsed")

        ai_cfo_tokens_max = d.pop("aiCfoTokensMax")

        get_api_gateway_v1_account_ai_cfo_usage_response_200 = cls(
            ai_cfo_tokens_used=ai_cfo_tokens_used,
            ai_cfo_tokens_max=ai_cfo_tokens_max,
        )

        get_api_gateway_v1_account_ai_cfo_usage_response_200.additional_properties = d
        return get_api_gateway_v1_account_ai_cfo_usage_response_200

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
