from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_temp_assets_upload_url_response_200_upload_headers import (
        PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders,
    )


T = TypeVar("T", bound="PostApiGatewayV1TempAssetsUploadUrlResponse200")


@_attrs_define
class PostApiGatewayV1TempAssetsUploadUrlResponse200:
    """
    Attributes:
        upload_url (str):
        object_key (str):
        expires_in (float):
        upload_headers (PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders | Unset): Headers the PUT must send;
            present when mimeType was given, which the URL signs.
    """

    upload_url: str
    object_key: str
    expires_in: float
    upload_headers: PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        upload_url = self.upload_url

        object_key = self.object_key

        expires_in = self.expires_in

        upload_headers: dict[str, Any] | Unset = UNSET
        if not isinstance(self.upload_headers, Unset):
            upload_headers = self.upload_headers.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "uploadUrl": upload_url,
                "objectKey": object_key,
                "expiresIn": expires_in,
            }
        )
        if upload_headers is not UNSET:
            field_dict["uploadHeaders"] = upload_headers

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_temp_assets_upload_url_response_200_upload_headers import (
            PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders,  # noqa: PLC0415
        )

        d = dict(src_dict)
        upload_url = d.pop("uploadUrl")

        object_key = d.pop("objectKey")

        expires_in = d.pop("expiresIn")

        _upload_headers = d.pop("uploadHeaders", UNSET)
        upload_headers: PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders | Unset
        if isinstance(_upload_headers, Unset):
            upload_headers = UNSET
        else:
            upload_headers = PostApiGatewayV1TempAssetsUploadUrlResponse200UploadHeaders.from_dict(_upload_headers)

        post_api_gateway_v1_temp_assets_upload_url_response_200 = cls(
            upload_url=upload_url,
            object_key=object_key,
            expires_in=expires_in,
            upload_headers=upload_headers,
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
