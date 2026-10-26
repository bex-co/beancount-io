from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportParseReceiptBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportParseReceiptBody:
    """
    Attributes:
        s_3_object_key (str | Unset):
        object_key (str | Unset): Alias of s3ObjectKey, as the upload URL spells it.
        receipt_object_key (str | Unset): Alias of s3ObjectKey, as the insert path spells it.
    """

    s_3_object_key: str | Unset = UNSET
    object_key: str | Unset = UNSET
    receipt_object_key: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        s_3_object_key = self.s_3_object_key

        object_key = self.object_key

        receipt_object_key = self.receipt_object_key

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if s_3_object_key is not UNSET:
            field_dict["s3ObjectKey"] = s_3_object_key
        if object_key is not UNSET:
            field_dict["objectKey"] = object_key
        if receipt_object_key is not UNSET:
            field_dict["receiptObjectKey"] = receipt_object_key

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        s_3_object_key = d.pop("s3ObjectKey", UNSET)

        object_key = d.pop("objectKey", UNSET)

        receipt_object_key = d.pop("receiptObjectKey", UNSET)

        post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_body = cls(
            s_3_object_key=s_3_object_key,
            object_key=object_key,
            receipt_object_key=receipt_object_key,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_body
