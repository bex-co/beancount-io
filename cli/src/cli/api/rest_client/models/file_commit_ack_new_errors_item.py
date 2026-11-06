from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="FileCommitAckNewErrorsItem")


@_attrs_define
class FileCommitAckNewErrorsItem:
    """
    Attributes:
        message (str):
        source (str | Unset):
    """

    message: str
    source: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        source = self.source

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "message": message,
            }
        )
        if source is not UNSET:
            field_dict["source"] = source

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        message = d.pop("message")

        source = d.pop("source", UNSET)

        file_commit_ack_new_errors_item = cls(
            message=message,
            source=source,
        )

        return file_commit_ack_new_errors_item
