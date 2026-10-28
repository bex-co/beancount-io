from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entries_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameEntriesResponse200NewErrorsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_entries_response_200_preview_item import (
        PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntriesResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntriesResponse200:
    """
    Attributes:
        success (bool):
        entry_hashes (list[str]): The hash each committed entry now carries, in request order — what getEntryContext,
            the source-slice update and delete take. Empty on a dry run, or when the hashes could not be resolved after the
            commit.
        dry_run (bool):
        preview (list[PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem]):
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameEntriesResponse200NewErrorsItem]):
        message (None | str | Unset):
    """

    success: bool
    entry_hashes: list[str]
    dry_run: bool
    preview: list[PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameEntriesResponse200NewErrorsItem]
    message: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        entry_hashes = self.entry_hashes

        dry_run = self.dry_run

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

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "success": success,
                "entryHashes": entry_hashes,
                "dryRun": dry_run,
                "preview": preview,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entries_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameEntriesResponse200NewErrorsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_entries_response_200_preview_item import (
            PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        success = d.pop("success")

        entry_hashes = cast(list[str], d.pop("entryHashes"))

        dry_run = d.pop("dryRun")

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PostApiGatewayV1LedgersOwnerNameEntriesResponse200PreviewItem.from_dict(preview_item_data)

            preview.append(preview_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameEntriesResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        post_api_gateway_v1_ledgers_owner_name_entries_response_200 = cls(
            success=success,
            entry_hashes=entry_hashes,
            dry_run=dry_run,
            preview=preview,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            message=message,
        )

        return post_api_gateway_v1_ledgers_owner_name_entries_response_200
