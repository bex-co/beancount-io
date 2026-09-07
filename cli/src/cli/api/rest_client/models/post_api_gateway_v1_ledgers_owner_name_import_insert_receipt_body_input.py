from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input_postings_item import (
        PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput:
    """
    Attributes:
        date (str):
        payee (str):
        description (str):
        postings (list[PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem]):
        document_account (str): Account the stored receipt document attaches to
    """

    date: str
    payee: str
    description: str
    postings: list[PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem]
    document_account: str

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        payee = self.payee

        description = self.description

        postings = []
        for postings_item_data in self.postings:
            postings_item = postings_item_data.to_dict()
            postings.append(postings_item)

        document_account = self.document_account

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "payee": payee,
                "description": description,
                "postings": postings,
                "documentAccount": document_account,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input_postings_item import (
            PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        payee = d.pop("payee")

        description = d.pop("description")

        postings = []
        _postings = d.pop("postings")
        for postings_item_data in _postings:
            postings_item = PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInputPostingsItem.from_dict(
                postings_item_data
            )

            postings.append(postings_item)

        document_account = d.pop("documentAccount")

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input = cls(
            date=date,
            payee=payee,
            description=description,
            postings=postings,
            document_account=document_account,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input
