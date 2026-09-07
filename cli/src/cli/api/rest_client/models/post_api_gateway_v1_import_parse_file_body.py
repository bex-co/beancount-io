from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostApiGatewayV1ImportParseFileBody")


@_attrs_define
class PostApiGatewayV1ImportParseFileBody:
    """
    Attributes:
        s_3_object_key (str):
        file_format (str):
    """

    s_3_object_key: str
    file_format: str

    def to_dict(self) -> dict[str, Any]:
        s_3_object_key = self.s_3_object_key

        file_format = self.file_format

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "s3ObjectKey": s_3_object_key,
                "fileFormat": file_format,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        s_3_object_key = d.pop("s3ObjectKey")

        file_format = d.pop("fileFormat")

        post_api_gateway_v1_import_parse_file_body = cls(
            s_3_object_key=s_3_object_key,
            file_format=file_format,
        )

        return post_api_gateway_v1_import_parse_file_body
