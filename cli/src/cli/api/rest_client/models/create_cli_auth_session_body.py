from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_cli_auth_session_body_client import CreateCliAuthSessionBodyClient


T = TypeVar("T", bound="CreateCliAuthSessionBody")


@_attrs_define
class CreateCliAuthSessionBody:
    """
    Attributes:
        client (CreateCliAuthSessionBodyClient | Unset): How the requesting device describes itself. Self-reported and
            unverified: shown so a person can recognize their own terminal, never treated as evidence.
    """

    client: CreateCliAuthSessionBodyClient | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        client: dict[str, Any] | Unset = UNSET
        if not isinstance(self.client, Unset):
            client = self.client.to_dict()

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if client is not UNSET:
            field_dict["client"] = client

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.create_cli_auth_session_body_client import CreateCliAuthSessionBodyClient  # noqa: PLC0415

        d = dict(src_dict)
        _client = d.pop("client", UNSET)
        client: CreateCliAuthSessionBodyClient | Unset
        if isinstance(_client, Unset):
            client = UNSET
        else:
            client = CreateCliAuthSessionBodyClient.from_dict(_client)

        create_cli_auth_session_body = cls(
            client=client,
        )

        return create_cli_auth_session_body
