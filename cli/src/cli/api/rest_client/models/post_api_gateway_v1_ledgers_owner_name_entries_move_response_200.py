from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200NewErrorsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_response_200_preview_item import (
        PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200PreviewItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200:
    """
    Attributes:
        message (str):
        dry_run (bool):
        moved_hashes (list[str]): The moved entries' hashes, each once, in ledger order.
        to_path (str):
        include_added (bool): Whether includeFrom gained toPath's include line (on a preview, would gain it).
        preview (list[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200PreviewItem]): Each moved entry's text at
            the file it leaves.
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200NewErrorsItem]):
        valid (bool): True only when the write adds no bean-check error. A dry run returns the new errors instead of
            refusing, so gate on this, not on the status.
        commit (str | Unset): The sha of the commit this write made; absent on a preview or a read.
    """

    message: str
    dry_run: bool
    moved_hashes: list[str]
    to_path: str
    include_added: bool
    preview: list[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200PreviewItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200NewErrorsItem]
    valid: bool
    commit: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        dry_run = self.dry_run

        moved_hashes = self.moved_hashes

        to_path = self.to_path

        include_added = self.include_added

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

        valid = self.valid

        commit = self.commit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "message": message,
                "dryRun": dry_run,
                "movedHashes": moved_hashes,
                "toPath": to_path,
                "includeAdded": include_added,
                "preview": preview,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
                "valid": valid,
            }
        )
        if commit is not UNSET:
            field_dict["commit"] = commit

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200NewErrorsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_entries_move_response_200_preview_item import (
            PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200PreviewItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        message = d.pop("message")

        dry_run = d.pop("dryRun")

        moved_hashes = cast(list[str], d.pop("movedHashes"))

        to_path = d.pop("toPath")

        include_added = d.pop("includeAdded")

        preview = []
        _preview = d.pop("preview")
        for preview_item_data in _preview:
            preview_item = PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200PreviewItem.from_dict(
                preview_item_data
            )

            preview.append(preview_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameEntriesMoveResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        valid = d.pop("valid")

        commit = d.pop("commit", UNSET)

        post_api_gateway_v1_ledgers_owner_name_entries_move_response_200 = cls(
            message=message,
            dry_run=dry_run,
            moved_hashes=moved_hashes,
            to_path=to_path,
            include_added=include_added,
            preview=preview,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            valid=valid,
            commit=commit,
        )

        post_api_gateway_v1_ledgers_owner_name_entries_move_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_entries_move_response_200

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
