from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem:
    """
    Attributes:
        account (str):
        amount_number (str): Decimal amount string, e.g. '25.50'
        amount_currency (str):
    """

    account: str
    amount_number: str
    amount_currency: str

    def to_dict(self) -> dict[str, Any]:
        account = self.account

        amount_number = self.amount_number

        amount_currency = self.amount_currency

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "account": account,
                "amountNumber": amount_number,
                "amountCurrency": amount_currency,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        account = d.pop("account")

        amount_number = d.pop("amountNumber")

        amount_currency = d.pop("amountCurrency")

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input_postings_item = cls(
            account=account,
            amount_number=amount_number,
            amount_currency=amount_currency,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input_postings_item
