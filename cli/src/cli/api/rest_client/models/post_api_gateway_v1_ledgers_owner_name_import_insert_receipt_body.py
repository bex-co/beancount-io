from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input import (
        PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBody:
    """
    Attributes:
        input_ (PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput):
        receipt_object_key (str | Unset): Caller-owned temporary object key (starts with tmp/)
        object_key (str | Unset): Alias of receiptObjectKey, as the upload URL spells it.
        s_3_object_key (str | Unset): Alias of receiptObjectKey, as the parse routes spell it.
    """

    input_: PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput
    receipt_object_key: str | Unset = UNSET
    object_key: str | Unset = UNSET
    s_3_object_key: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        input_ = self.input_.to_dict()

        receipt_object_key = self.receipt_object_key

        object_key = self.object_key

        s_3_object_key = self.s_3_object_key

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "input": input_,
            }
        )
        if receipt_object_key is not UNSET:
            field_dict["receiptObjectKey"] = receipt_object_key
        if object_key is not UNSET:
            field_dict["objectKey"] = object_key
        if s_3_object_key is not UNSET:
            field_dict["s3ObjectKey"] = s_3_object_key

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body_input import (
            PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput,  # noqa: PLC0415
        )

        d = dict(src_dict)
        input_ = PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput.from_dict(d.pop("input"))

        receipt_object_key = d.pop("receiptObjectKey", UNSET)

        object_key = d.pop("objectKey", UNSET)

        s_3_object_key = d.pop("s3ObjectKey", UNSET)

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body = cls(
            input_=input_,
            receipt_object_key=receipt_object_key,
            object_key=object_key,
            s_3_object_key=s_3_object_key,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body
