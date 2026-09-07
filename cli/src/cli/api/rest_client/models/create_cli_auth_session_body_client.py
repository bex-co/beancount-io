from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateCliAuthSessionBodyClient")


@_attrs_define
class CreateCliAuthSessionBodyClient:
    """How the requesting device describes itself. Self-reported and unverified: shown so a person can recognize their own
    terminal, never treated as evidence.

        Attributes:
            name (str | Unset): Client name, e.g. `bea`.
            version (str | Unset):
            device_label (str | Unset): Machine name the client runs on.
            platform (str | Unset):
    """

    name: str | Unset = UNSET
    version: str | Unset = UNSET
    device_label: str | Unset = UNSET
    platform: str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        version = self.version

        device_label = self.device_label

        platform = self.platform

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if version is not UNSET:
            field_dict["version"] = version
        if device_label is not UNSET:
            field_dict["deviceLabel"] = device_label
        if platform is not UNSET:
            field_dict["platform"] = platform

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name", UNSET)

        version = d.pop("version", UNSET)

        device_label = d.pop("deviceLabel", UNSET)

        platform = d.pop("platform", UNSET)

        create_cli_auth_session_body_client = cls(
            name=name,
            version=version,
            device_label=device_label,
            platform=platform,
        )

        return create_cli_auth_session_body_client
