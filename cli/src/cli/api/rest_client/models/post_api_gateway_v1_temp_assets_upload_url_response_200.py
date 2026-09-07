from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1TempAssetsUploadUrlResponse200")


@_attrs_define
class PostApiGatewayV1TempAssetsUploadUrlResponse200:
    """
    Attributes:
        upload_url (str):
        object_key (str):
        expires_in (float):
    """

    upload_url: str
    object_key: str
    expires_in: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        upload_url = self.upload_url

        object_key = self.object_key

        expires_in = self.expires_in

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "uploadUrl": upload_url,
                "objectKey": object_key,
                "expiresIn": expires_in,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        upload_url = d.pop("uploadUrl")

        object_key = d.pop("objectKey")

        expires_in = d.pop("expiresIn")

        post_api_gateway_v1_temp_assets_upload_url_response_200 = cls(
            upload_url=upload_url,
            object_key=object_key,
            expires_in=expires_in,
        )

        post_api_gateway_v1_temp_assets_upload_url_response_200.additional_properties = d
        return post_api_gateway_v1_temp_assets_upload_url_response_200

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
