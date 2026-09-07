from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesResponse200Item")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesResponse200Item:
    """
    Attributes:
        row_index (int):
        target_account (str):
        confidence (float):
        source (str):
        reasoning (str | Unset):
    """

    row_index: int
    target_account: str
    confidence: float
    source: str
    reasoning: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        row_index = self.row_index

        target_account = self.target_account

        confidence = self.confidence

        source = self.source

        reasoning = self.reasoning

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "rowIndex": row_index,
                "targetAccount": target_account,
                "confidence": confidence,
                "source": source,
            }
        )
        if reasoning is not UNSET:
            field_dict["reasoning"] = reasoning

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        row_index = d.pop("rowIndex")

        target_account = d.pop("targetAccount")

        confidence = d.pop("confidence")

        source = d.pop("source")

        reasoning = d.pop("reasoning", UNSET)

        post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_response_200_item = cls(
            row_index=row_index,
            target_account=target_account,
            confidence=confidence,
            source=source,
            reasoning=reasoning,
        )

        post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_response_200_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_response_200_item

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
