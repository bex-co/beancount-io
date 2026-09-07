from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.create_api_key_scopes_item import CreateApiKeyScopesItem
from ..types import UNSET, Unset

T = TypeVar("T", bound="CreateApiKey")


@_attrs_define
class CreateApiKey:
    """A new API key to mint

    Attributes:
        name (str): What this key is for — shown in the key list Example: CI: nightly ledger export.
        scopes (list[CreateApiKeyScopesItem]): What the key may do. A key can never hold more than its creator did.
            Example: ['ledger.read'].
        ledger_scope (str | Unset): Confine the key to one ledger, as `owner/name`. Omit to inherit the caller's own
            confinement (all its ledgers, or the one its credential is pinned to). A credential pinned to one ledger cannot
            name a different one. Example: alice/main-ledger.
        expires_at (datetime.datetime | None | Unset): When the key stops working (ISO 8601). Omit for no expiry.
    """

    name: str
    scopes: list[CreateApiKeyScopesItem]
    ledger_scope: str | Unset = UNSET
    expires_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name = self.name

        scopes = []
        for scopes_item_data in self.scopes:
            scopes_item = scopes_item_data.value
            scopes.append(scopes_item)

        ledger_scope = self.ledger_scope

        expires_at: None | str | Unset
        if isinstance(self.expires_at, Unset):
            expires_at = UNSET
        elif isinstance(self.expires_at, datetime.datetime):
            expires_at = self.expires_at.isoformat()
        else:
            expires_at = self.expires_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "scopes": scopes,
            }
        )
        if ledger_scope is not UNSET:
            field_dict["ledgerScope"] = ledger_scope
        if expires_at is not UNSET:
            field_dict["expiresAt"] = expires_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        name = d.pop("name")

        scopes = []
        _scopes = d.pop("scopes")
        for scopes_item_data in _scopes:
            scopes_item = CreateApiKeyScopesItem(scopes_item_data)

            scopes.append(scopes_item)

        ledger_scope = d.pop("ledgerScope", UNSET)

        def _parse_expires_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                expires_at_type_0 = datetime.datetime.fromisoformat(data)

                return expires_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        expires_at = _parse_expires_at(d.pop("expiresAt", UNSET))

        create_api_key = cls(
            name=name,
            scopes=scopes,
            ledger_scope=ledger_scope,
            expires_at=expires_at,
        )

        create_api_key.additional_properties = d
        return create_api_key

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
