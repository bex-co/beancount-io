from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ApiKey")


@_attrs_define
class ApiKey:
    """An API key as it can be shown — never the key itself

    Attributes:
        id (str):
        name (str):
        key_prefix (str): The first characters of the key, for telling keys apart Example: bcio_7wXzK9mN.
        scopes (list[str]):
        created_at (datetime.datetime):
        ledger_scope (str | Unset):
        last_used_at (datetime.datetime | Unset):
        expires_at (datetime.datetime | Unset):
        revoked_at (datetime.datetime | Unset):
    """

    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    created_at: datetime.datetime
    ledger_scope: str | Unset = UNSET
    last_used_at: datetime.datetime | Unset = UNSET
    expires_at: datetime.datetime | Unset = UNSET
    revoked_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        key_prefix = self.key_prefix

        scopes = self.scopes

        created_at = self.created_at.isoformat()

        ledger_scope = self.ledger_scope

        last_used_at: str | Unset = UNSET
        if not isinstance(self.last_used_at, Unset):
            last_used_at = self.last_used_at.isoformat()

        expires_at: str | Unset = UNSET
        if not isinstance(self.expires_at, Unset):
            expires_at = self.expires_at.isoformat()

        revoked_at: str | Unset = UNSET
        if not isinstance(self.revoked_at, Unset):
            revoked_at = self.revoked_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "keyPrefix": key_prefix,
                "scopes": scopes,
                "createdAt": created_at,
            }
        )
        if ledger_scope is not UNSET:
            field_dict["ledgerScope"] = ledger_scope
        if last_used_at is not UNSET:
            field_dict["lastUsedAt"] = last_used_at
        if expires_at is not UNSET:
            field_dict["expiresAt"] = expires_at
        if revoked_at is not UNSET:
            field_dict["revokedAt"] = revoked_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        key_prefix = d.pop("keyPrefix")

        scopes = cast(list[str], d.pop("scopes"))

        created_at = datetime.datetime.fromisoformat(d.pop("createdAt"))

        ledger_scope = d.pop("ledgerScope", UNSET)

        _last_used_at = d.pop("lastUsedAt", UNSET)
        last_used_at: datetime.datetime | Unset
        if isinstance(_last_used_at, Unset):
            last_used_at = UNSET
        else:
            last_used_at = datetime.datetime.fromisoformat(_last_used_at)

        _expires_at = d.pop("expiresAt", UNSET)
        expires_at: datetime.datetime | Unset
        if isinstance(_expires_at, Unset):
            expires_at = UNSET
        else:
            expires_at = datetime.datetime.fromisoformat(_expires_at)

        _revoked_at = d.pop("revokedAt", UNSET)
        revoked_at: datetime.datetime | Unset
        if isinstance(_revoked_at, Unset):
            revoked_at = UNSET
        else:
            revoked_at = datetime.datetime.fromisoformat(_revoked_at)

        api_key = cls(
            id=id,
            name=name,
            key_prefix=key_prefix,
            scopes=scopes,
            created_at=created_at,
            ledger_scope=ledger_scope,
            last_used_at=last_used_at,
            expires_at=expires_at,
            revoked_at=revoked_at,
        )

        api_key.additional_properties = d
        return api_key

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
