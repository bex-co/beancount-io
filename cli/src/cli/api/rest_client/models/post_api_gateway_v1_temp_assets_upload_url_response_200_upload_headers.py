from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders")


@_attrs_define
class PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders:
    """Headers the PUT must send; present when mimeType was given, which the URL signs.

    Attributes:
        content_type (str):
    """

    content_type: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        content_type = self.content_type

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "Content-Type": content_type,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        content_type = d.pop("Content-Type")

        post_api_gateway_v1_temp_assets_upload_url_response_200_upload_headers = cls(
            content_type=content_type,
        )

        post_api_gateway_v1_temp_assets_upload_url_response_200_upload_headers.additional_properties = d
        return post_api_gateway_v1_temp_assets_upload_url_response_200_upload_headers

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
