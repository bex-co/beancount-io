from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem")


@_attrs_define
class PostApiGatewayV1LegacyEntriesBodyEntriesInputItemPostingsItem:
    """
    Attributes:
        account (str):
        amount (str):
    """

    account: str
    amount: str

    def to_dict(self) -> dict[str, Any]:
        account = self.account

        amount = self.amount

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "account": account,
                "amount": amount,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        account = d.pop("account")

        amount = d.pop("amount")

        post_api_gateway_v1_legacy_entries_body_entries_input_item_postings_item = cls(
            account=account,
            amount=amount,
        )

        return post_api_gateway_v1_legacy_entries_body_entries_input_item_postings_item
