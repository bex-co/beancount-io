from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body_transactions_item import (
        PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBody:
    """
    Attributes:
        transactions (list[PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem]):
    """

    transactions: list[PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem]

    def to_dict(self) -> dict[str, Any]:
        transactions = []
        for transactions_item_data in self.transactions:
            transactions_item = transactions_item_data.to_dict()
            transactions.append(transactions_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "transactions": transactions,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body_transactions_item import (
            PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        transactions = []
        _transactions = d.pop("transactions")
        for transactions_item_data in _transactions:
            transactions_item = PostApiGatewayV1LedgersOwnerNameImportSuggestCategoriesBodyTransactionsItem.from_dict(
                transactions_item_data
            )

            transactions.append(transactions_item)

        post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body = cls(
            transactions=transactions,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_suggest_categories_body
