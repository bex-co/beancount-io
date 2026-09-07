from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameRenameFileBody")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameRenameFileBody:
    """
    Attributes:
        old_path (str):
        new_path (str):
        message (None | str | Unset):
    """

    old_path: str
    new_path: str
    message: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        old_path = self.old_path

        new_path = self.new_path

        message: None | str | Unset
        if isinstance(self.message, Unset):
            message = UNSET
        else:
            message = self.message

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "oldPath": old_path,
                "newPath": new_path,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        old_path = d.pop("oldPath")

        new_path = d.pop("newPath")

        def _parse_message(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        message = _parse_message(d.pop("message", UNSET))

        post_api_gateway_v1_ledgers_owner_name_rename_file_body = cls(
            old_path=old_path,
            new_path=new_path,
            message=message,
        )

        return post_api_gateway_v1_ledgers_owner_name_rename_file_body
