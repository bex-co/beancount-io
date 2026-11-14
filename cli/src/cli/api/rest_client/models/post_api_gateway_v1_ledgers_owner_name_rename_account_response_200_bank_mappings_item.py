from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameAccountResponse200BankMappingsItem:
    """
    Attributes:
        plaid_account (None | str): The caller's own bank account; null for another member's.
        from_ (str):
        to (str):
        updated (bool): False on a preview, and when the update after the commit failed.
    """

    plaid_account: None | str
    from_: str
    to: str
    updated: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        plaid_account: None | str
        plaid_account = self.plaid_account

        from_ = self.from_

        to = self.to

        updated = self.updated

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "plaidAccount": plaid_account,
                "from": from_,
                "to": to,
                "updated": updated,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_plaid_account(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        plaid_account = _parse_plaid_account(d.pop("plaidAccount"))

        from_ = d.pop("from")

        to = d.pop("to")

        updated = d.pop("updated")

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_bank_mappings_item = cls(
            plaid_account=plaid_account,
            from_=from_,
            to=to,
            updated=updated,
        )

        post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_bank_mappings_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_rename_account_response_200_bank_mappings_item

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
