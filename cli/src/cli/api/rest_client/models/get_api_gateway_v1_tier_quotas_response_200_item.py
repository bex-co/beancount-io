from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetApiGatewayV1TierQuotasResponse200Item")


@_attrs_define
class GetApiGatewayV1TierQuotasResponse200Item:
    """
    Attributes:
        tier (str):
        ai_cfo_tokens_max (float):
        max_ledgers (float):
        max_collaborators_per_ledger (float):
        max_directives (float):
    """

    tier: str
    ai_cfo_tokens_max: float
    max_ledgers: float
    max_collaborators_per_ledger: float
    max_directives: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        tier = self.tier

        ai_cfo_tokens_max = self.ai_cfo_tokens_max

        max_ledgers = self.max_ledgers

        max_collaborators_per_ledger = self.max_collaborators_per_ledger

        max_directives = self.max_directives

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "tier": tier,
                "aiCfoTokensMax": ai_cfo_tokens_max,
                "maxLedgers": max_ledgers,
                "maxCollaboratorsPerLedger": max_collaborators_per_ledger,
                "maxDirectives": max_directives,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        tier = d.pop("tier")

        ai_cfo_tokens_max = d.pop("aiCfoTokensMax")

        max_ledgers = d.pop("maxLedgers")

        max_collaborators_per_ledger = d.pop("maxCollaboratorsPerLedger")

        max_directives = d.pop("maxDirectives")

        get_api_gateway_v1_tier_quotas_response_200_item = cls(
            tier=tier,
            ai_cfo_tokens_max=ai_cfo_tokens_max,
            max_ledgers=max_ledgers,
            max_collaborators_per_ledger=max_collaborators_per_ledger,
            max_directives=max_directives,
        )

        get_api_gateway_v1_tier_quotas_response_200_item.additional_properties = d
        return get_api_gateway_v1_tier_quotas_response_200_item

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
