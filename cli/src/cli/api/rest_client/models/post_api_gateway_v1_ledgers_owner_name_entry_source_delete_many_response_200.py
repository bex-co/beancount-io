from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200NewErrorsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200_preview_item import (
        PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200PreviewItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        deleted_count (int):
        preview (list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200PreviewItem]): Per-file affected
            text; populated on dry runs only.
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200NewErrorsItem]):
    """

    message: str
    dry_run: bool
    deleted_count: int
    preview: list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200PreviewItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200NewErrorsItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        deleted_count = self.deleted_count

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

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "deletedCount": deleted_count,
                "preview": preview,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200NewErrorsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200_preview_item import (
            PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        deleted_count = d.pop("deletedCount")

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200PreviewItem.from_dict(
                preview_item_data
            )

            preview.append(preview_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteManyResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200 = cls(
            message=message,
            dry_run=dry_run,
            deleted_count=deleted_count,
            preview=preview,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
        )

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_many_response_200

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
