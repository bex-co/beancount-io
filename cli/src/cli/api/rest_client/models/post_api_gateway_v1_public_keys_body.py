from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1PublicKeysBody")


@_attrs_define
class PostApiGatewayV1PublicKeysBody:
    """
    Attributes:
        key (str):
        title (str):
        read_only (bool | None | Unset):  Default: False.
    """

    key: str
    title: str
    read_only: bool | None | Unset = False

    def to_dict(self) -> dict[str, Any]:
        key = self.key

        title = self.title

        read_only: bool | None | Unset
        if isinstance(self.read_only, Unset):
            read_only = UNSET
        else:
            read_only = self.read_only

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "key": key,
                "title": title,
            }
        )
        if read_only is not UNSET:
            field_dict["readOnly"] = read_only

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        key = d.pop("key")

        title = d.pop("title")

        def _parse_read_only(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        read_only = _parse_read_only(d.pop("readOnly", UNSET))

        post_api_gateway_v1_public_keys_body = cls(
            key=key,
            title=title,
            read_only=read_only,
        )

        return post_api_gateway_v1_public_keys_body
