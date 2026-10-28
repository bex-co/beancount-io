from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.put_api_gateway_v1_ledgers_owner_name_entry_source_response_200_new_errors_item import (
        PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200NewErrorsItem,
    )
    from ..models.put_api_gateway_v1_ledgers_owner_name_entry_source_response_200_preview_item import (
        PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200PreviewItem,
    )


T = TypeVar("T", bound="PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200")


@_attrs_define
class PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        entry_hash (str):
        preview (list[PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200PreviewItem]): Per-file affected text;
            populated on dry runs only.
        errors_before (int):
        errors_after (int):
        new_errors (list[PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200NewErrorsItem]):
        new_sha_256_sum (str):
        new_entry_hash (str): The entry's public ID after the commit, re-read post-commit — use it for the next edit,
            not the request's entryHash.
    """

    message: str
    dry_run: bool
    entry_hash: str
    preview: list[PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200PreviewItem]
    errors_before: int
    errors_after: int
    new_errors: list[PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200NewErrorsItem]
    new_sha_256_sum: str
    new_entry_hash: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        entry_hash = self.entry_hash

        preview = []
        for preview_item_data in self.preview:
            preview_item = preview_item_data.to_dict()
            preview.append(preview_item)

        errors_before = self.errors_before

        errors_after = self.errors_after

        new_errors = []
        for new_errors_item_data in self.new_errors:
            new_errors_item = new_errors_item_data.to_dict()
            new_errors.append(new_errors_item)

        new_sha_256_sum = self.new_sha_256_sum

        new_entry_hash = self.new_entry_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "entryHash": entry_hash,
                "preview": preview,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
                "newSha256sum": new_sha_256_sum,
                "newEntryHash": new_entry_hash,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.put_api_gateway_v1_ledgers_owner_name_entry_source_response_200_new_errors_item import (
            PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200NewErrorsItem,  # noqa: PLC0415
        )
        from ..models.put_api_gateway_v1_ledgers_owner_name_entry_source_response_200_preview_item import (
            PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        entry_hash = d.pop("entryHash")

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200PreviewItem.from_dict(preview_item_data)

            preview.append(preview_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PutApiGatewayV1LedgersOwnerNameEntrySourceResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        new_sha_256_sum = d.pop("newSha256sum")

        new_entry_hash = d.pop("newEntryHash")

        put_api_gateway_v1_ledgers_owner_name_entry_source_response_200 = cls(
            message=message,
            dry_run=dry_run,
            entry_hash=entry_hash,
            preview=preview,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            new_sha_256_sum=new_sha_256_sum,
            new_entry_hash=new_entry_hash,
        )

        put_api_gateway_v1_ledgers_owner_name_entry_source_response_200.additional_properties = d
        return put_api_gateway_v1_ledgers_owner_name_entry_source_response_200

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
