from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

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
        request_id (None | str | Unset): Client-generated retry key, 1-200 characters. Send a new one per write and
            reuse it only to retry the same write: within 24 hours the same id and request return the first result without
            writing again; the same id with a different request is refused (VALIDATION_FAILED); a repeat while the first
            attempt is still writing is CONFLICT, so wait and retry with the same id. Omitted, the write is not
            deduplicated.
    """

    input_: PostApiGatewayV1LedgersOwnerNameImportInsertReceiptBodyInput
    receipt_object_key: str | Unset = UNSET
    object_key: str | Unset = UNSET
    s_3_object_key: str | Unset = UNSET
    request_id: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        input_ = self.input_.to_dict()

        receipt_object_key = self.receipt_object_key

        object_key = self.object_key

        s_3_object_key = self.s_3_object_key

        request_id: None | str | Unset
        if isinstance(self.request_id, Unset):
            request_id = UNSET
        else:
            request_id = self.request_id

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
        if request_id is not UNSET:
            field_dict["requestId"] = request_id

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

        def _parse_request_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        request_id = _parse_request_id(d.pop("requestId", UNSET))

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body = cls(
            input_=input_,
            receipt_object_key=receipt_object_key,
            object_key=object_key,
            s_3_object_key=s_3_object_key,
            request_id=request_id,
        )

        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_body
