from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1TempAssetsUploadUrlBody")


@_attrs_define
class PostApiGatewayV1TempAssetsUploadUrlBody:
    """
    Attributes:
        filename (None | str | Unset):
        mime_type (None | str | Unset):
    """

    filename: None | str | Unset = UNSET
    mime_type: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        filename: None | str | Unset
        if isinstance(self.filename, Unset):
            filename = UNSET
        else:
            filename = self.filename

        mime_type: None | str | Unset
        if isinstance(self.mime_type, Unset):
            mime_type = UNSET
        else:
            mime_type = self.mime_type

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if filename is not UNSET:
            field_dict["filename"] = filename
        if mime_type is not UNSET:
            field_dict["mimeType"] = mime_type

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_filename(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        filename = _parse_filename(d.pop("filename", UNSET))

        def _parse_mime_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        mime_type = _parse_mime_type(d.pop("mimeType", UNSET))

        post_api_gateway_v1_temp_assets_upload_url_body = cls(
            filename=filename,
            mime_type=mime_type,
        )

        return post_api_gateway_v1_temp_assets_upload_url_body
