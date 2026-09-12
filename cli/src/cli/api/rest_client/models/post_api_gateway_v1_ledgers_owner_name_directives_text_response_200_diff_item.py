from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200DiffItem:
    """
    Attributes:
        path (str):
        diff (str):
    """

    path: str
    diff: str

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        diff = self.diff

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "path": path,
                "diff": diff,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        diff = d.pop("diff")

        post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_diff_item = cls(
            path=path,
            diff=diff,
        )

        return post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_diff_item
