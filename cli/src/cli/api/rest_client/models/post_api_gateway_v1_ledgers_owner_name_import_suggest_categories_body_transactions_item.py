from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem:
    """
    Attributes:
        row_index (int):
        date (str):
        payee (str):
        description (str):
        amount (float):
    """

    row_index: int
    date: str
    payee: str
    description: str
    amount: float

    def to_dict(self) -> dict[str, Any]:
        row_index = self.row_index

        date = self.date

        payee = self.payee

        description = self.description

        amount = self.amount

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "rowIndex": row_index,
                "date": date,
                "payee": payee,
                "description": description,
                "amount": amount,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        row_index = d.pop("rowIndex")

        date = d.pop("date")

        payee = d.pop("payee")

        description = d.pop("description")

        amount = d.pop("amount")

        post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body_transactions_item = cls(
            row_index=row_index,
            date=date,
            payee=payee,
            description=description,
            amount=amount,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body_transactions_item
