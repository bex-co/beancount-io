from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.api_key import ApiKey


T = TypeVar("T", bound="MintedApiKey")


@_attrs_define
class MintedApiKey:
    """A newly minted key, including its one and only plaintext

    Attributes:
        key (ApiKey): An API key as it can be shown — never the key itself
        plaintext (str): The key. Returned exactly once, by this response, and never recoverable afterwards — store it
            now. Example: bcio_7wXzK9mNpQrSt2VxYaBcDeF3gH4jK5mN.
    """

    key: ApiKey
    plaintext: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        key = self.key.to_dict()

        plaintext = self.plaintext

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "key": key,
                "plaintext": plaintext,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.api_key import ApiKey  # noqa: PLC0415

        d = dict(src_dict)
        key = ApiKey.from_dict(d.pop("key"))

        plaintext = d.pop("plaintext")

        minted_api_key = cls(
            key=key,
            plaintext=plaintext,
        )

        minted_api_key.additional_properties = d
        return minted_api_key

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
