from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input import (
        PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBody:
    """
    Attributes:
        receipt_object_key (str): Caller-owned temporary object key (starts with tmp/)
        input_ (PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput):
    """

    receipt_object_key: str
    input_: PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput

    def to_dict(self) -> dict[str, Any]:
        receipt_object_key = self.receipt_object_key

        input_ = self.input_.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "receiptObjectKey": receipt_object_key,
                "input": input_,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input import (
            PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput,  # noqa: PLC0415
        )

        d = dict(src_dict)
        receipt_object_key = d.pop("receiptObjectKey")

        input_ = PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput.from_dict(d.pop("input"))

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body = cls(
            receipt_object_key=receipt_object_key,
            input_=input_,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body
