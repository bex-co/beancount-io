from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetApiGatewayV1LedgersOwnerNameArchiveDownloadUrlResponse200")


@_attrs_define
class GetApiGatewayV1LedgersOwnerNameArchiveDownloadUrlResponse200:
    """
    Attributes:
        download_url (str):
    """

    download_url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        download_url = self.download_url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "downloadUrl": download_url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        download_url = d.pop("downloadUrl")

        get_api_gateway_v1_ledgers_owner_name_archive_download_url_response_200 = cls(
            download_url=download_url,
        )

        get_api_gateway_v1_ledgers_owner_name_archive_download_url_response_200.additional_properties = d
        return get_api_gateway_v1_ledgers_owner_name_archive_download_url_response_200

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
