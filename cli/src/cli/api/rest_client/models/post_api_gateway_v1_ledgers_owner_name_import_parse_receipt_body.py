from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportParseReceiptBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportParseReceiptBody:
    """
    Attributes:
        s_3_object_key (str):
    """

    s_3_object_key: str

    def to_dict(self) -> dict[str, Any]:
        s_3_object_key = self.s_3_object_key

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "s3ObjectKey": s_3_object_key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        s_3_object_key = d.pop("s3ObjectKey")

        post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_body = cls(
            s_3_object_key=s_3_object_key,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_body
