from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_diff_item import (
        PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_new_errors_item import (
        PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200NewErrorsItem,
    )
    from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_wrote_item import (
        PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200:
    """
    Attributes:
        success (bool):
        message (str):
        dry_run (bool):
        count (int):
        wrote (list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem]):
        diff (list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem]):
        errors_before (int):
        errors_after (int):
        new_errors (list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200NewErrorsItem]):
        appended_unsorted (list[str]):
    """

    success: bool
    message: str
    dry_run: bool
    count: int
    wrote: list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem]
    diff: list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem]
    errors_before: int
    errors_after: int
    new_errors: list[PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200NewErrorsItem]
    appended_unsorted: list[str]

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        message = self.message

        dry_run = self.dry_run

        count = self.count

        wrote = []
        for wrote_item_data in self.wrote:
            wrote_item = wrote_item_data.to_dict()
            wrote.append(wrote_item)

        diff = []
        for diff_item_data in self.diff:
            diff_item = diff_item_data.to_dict()
            diff.append(diff_item)

        errors_before = self.errors_before

        errors_after = self.errors_after

        new_errors = []
        for new_errors_item_data in self.new_errors:
            new_errors_item = new_errors_item_data.to_dict()
            new_errors.append(new_errors_item)

        appended_unsorted = self.appended_unsorted

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "success": success,
                "message": message,
                "dryRun": dry_run,
                "count": count,
                "wrote": wrote,
                "diff": diff,
                "errorsBefore": errors_before,
                "errorsAfter": errors_after,
                "newErrors": new_errors,
                "appendedUnsorted": appended_unsorted,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_diff_item import (
            PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_new_errors_item import (
            PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200NewErrorsItem,  # noqa: PLC0415
        )
        from ..models.post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_wrote_item import (
            PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        success = d.pop("success")

        message = d.pop("message")

        dry_run = d.pop("dryRun")

        count = d.pop("count")

        wrote = []
        _wrote = d.pop("wrote")
        for wrote_item_data in _wrote:
            wrote_item = PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem.from_dict(wrote_item_data)

            wrote.append(wrote_item)

        diff = []
        _diff = d.pop("diff")
        for diff_item_data in _diff:
            diff_item = PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem.from_dict(diff_item_data)

            diff.append(diff_item)

        errors_before = d.pop("errorsBefore")

        errors_after = d.pop("errorsAfter")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200NewErrorsItem.from_dict(
                new_errors_item_data
            )

            new_errors.append(new_errors_item)

        appended_unsorted = cast(list[str], d.pop("appendedUnsorted"))

        post_api_gateway_v1_ledgers_owner_name_directives_text_response_200 = cls(
            success=success,
            message=message,
            dry_run=dry_run,
            count=count,
            wrote=wrote,
            diff=diff,
            errors_before=errors_before,
            errors_after=errors_after,
            new_errors=new_errors,
            appended_unsorted=appended_unsorted,
        )

        return post_api_gateway_v1_ledgers_owner_name_directives_text_response_200
