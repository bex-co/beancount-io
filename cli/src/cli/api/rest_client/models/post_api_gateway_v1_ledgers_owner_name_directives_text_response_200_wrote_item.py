from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameDirectivesTextResponse200WroteItem:
    """
    Attributes:
        path (str):
        line (int):
    """

    path: str
    line: int

    def to_dict(self) -> dict[str, Any]:
        path = self.path

        line = self.line

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "path": path,
                "line": line,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        path = d.pop("path")

        line = d.pop("line")

        post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_wrote_item = cls(
            path=path,
            line=line,
        )

        return post_api_gateway_v1_ledgers_owner_name_directives_text_response_200_wrote_item
