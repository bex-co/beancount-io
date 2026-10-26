from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200_preview_item import (
        PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200PreviewItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        entry_hash (str):
        preview (list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200PreviewItem]): Per-file affected text;
            populated on dry runs only.
    """

    message: str
    dry_run: bool
    entry_hash: str
    preview: list[PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200PreviewItem]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        entry_hash = self.entry_hash

        preview = []
        for preview_item_data in self.preview:
            preview_item = preview_item_data.to_dict()
            preview.append(preview_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "entryHash": entry_hash,
                "preview": preview,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200_preview_item import (
            PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        entry_hash = d.pop("entryHash")

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PostApiGatewayV1LedgersOwnerNameEntrySourceDeleteResponse200PreviewItem.from_dict(
                preview_item_data
            )

            preview.append(preview_item)

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200 = cls(
            message=message,
            dry_run=dry_run,
            entry_hash=entry_hash,
            preview=preview,
        )

        post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_entry_source_delete_response_200

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
