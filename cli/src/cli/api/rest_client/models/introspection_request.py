from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="IntrospectionRequest")


@_attrs_define
class IntrospectionRequest:
    """The credential whose status you want

    Attributes:
        token (str): The credential to ask about: an OAuth access token, a `bcio_` API key, or a session token. Example:
            bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN.
        token_type_hint (str | Unset): RFC 7662 hint. Accepted for spec compliance and ignored — the kind is determined
            by verification, which is cheaper than trusting a hint that can be wrong. Example: access_token.
    """

    token: str
    token_type_hint: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        token = self.token

        token_type_hint = self.token_type_hint

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "token": token,
            }
        )
        if token_type_hint is not UNSET:
            field_dict["token_type_hint"] = token_type_hint

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        token = d.pop("token")

        token_type_hint = d.pop("token_type_hint", UNSET)

        introspection_request = cls(
            token=token,
            token_type_hint=token_type_hint,
        )

        introspection_request.additional_properties = d
        return introspection_request

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
