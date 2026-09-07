from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="CreateCliAuthSessionResponse200")


@_attrs_define
class CreateCliAuthSessionResponse200:
    """
    Attributes:
        device_code (str): The CLI's private verifier. Keep it in the process; never put it in a URL, a log, or the
            browser.
        user_code (str): Short code to display so the person can enter it in the browser.
        expires_at (str):
        poll_interval_seconds (int): Seconds the CLI should wait between status polls.
    """

    device_code: str
    user_code: str
    expires_at: str
    poll_interval_seconds: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        device_code = self.device_code

        user_code = self.user_code

        expires_at = self.expires_at

        poll_interval_seconds = self.poll_interval_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "deviceCode": device_code,
                "userCode": user_code,
                "expiresAt": expires_at,
                "pollIntervalSeconds": poll_interval_seconds,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        device_code = d.pop("deviceCode")

        user_code = d.pop("userCode")

        expires_at = d.pop("expiresAt")

        poll_interval_seconds = d.pop("pollIntervalSeconds")

        create_cli_auth_session_response_200 = cls(
            device_code=device_code,
            user_code=user_code,
            expires_at=expires_at,
            poll_interval_seconds=poll_interval_seconds,
        )

        create_cli_auth_session_response_200.additional_properties = d
        return create_cli_auth_session_response_200

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
