from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.introspection_bio_assurance import IntrospectionBioAssurance
from ..models.introspection_bio_credential_kind import IntrospectionBioCredentialKind
from ..types import UNSET, Unset

T = TypeVar("T", bound="Introspection")


@_attrs_define
class Introspection:
    """A credential's current status. Fields prefixed `bio_` are ours, not RFC 7662.

    Attributes:
        active (bool): Whether the credential is usable right now. False for expired, malformed, revoked, never-issued,
            and belonging to another user — deliberately indistinguishable, and the only field present when false.
        sub (str | Unset): The user the credential acts for
        scope (str | Unset): What this credential may do, space-delimited, in the ledger scope vocabulary. This is
            effective capability, not the raw grant: a session token is not scope-constrained and reports all three.
            Example: ledger.read ledger.write ledger.admin.
        client_id (str | Unset): The OAuth client the token was issued to, if it was one
        jti (str | Unset): The credential's stable id, for audit and revocation
        iat (float | Unset): When the credential was issued (seconds since the epoch)
        exp (float | Unset): When the credential stops working (seconds since the epoch). Absent for an API key minted
            without an expiry.
        bio_credential_kind (IntrospectionBioCredentialKind | Unset): Which kind of credential this is
        bio_assurance (IntrospectionBioAssurance | Unset): How the holder authenticated: `interactive` for a signed-in
            session, `delegated` for a token acting on their behalf
        bio_ledger_scope (str | Unset): The one ledger this credential may touch, as `owner/name`. Absent when it is not
            confined. Example: alice/main-ledger.
    """

    active: bool
    sub: str | Unset = UNSET
    scope: str | Unset = UNSET
    client_id: str | Unset = UNSET
    jti: str | Unset = UNSET
    iat: float | Unset = UNSET
    exp: float | Unset = UNSET
    bio_credential_kind: IntrospectionBioCredentialKind | Unset = UNSET
    bio_assurance: IntrospectionBioAssurance | Unset = UNSET
    bio_ledger_scope: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        active = self.active

        sub = self.sub

        scope = self.scope

        client_id = self.client_id

        jti = self.jti

        iat = self.iat

        exp = self.exp

        bio_credential_kind: str | Unset = UNSET
        if not isinstance(self.bio_credential_kind, Unset):
            bio_credential_kind = self.bio_credential_kind.value

        bio_assurance: str | Unset = UNSET
        if not isinstance(self.bio_assurance, Unset):
            bio_assurance = self.bio_assurance.value

        bio_ledger_scope = self.bio_ledger_scope

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "active": active,
            }
        )
        if sub is not UNSET:
            field_dict["sub"] = sub
        if scope is not UNSET:
            field_dict["scope"] = scope
        if client_id is not UNSET:
            field_dict["client_id"] = client_id
        if jti is not UNSET:
            field_dict["jti"] = jti
        if iat is not UNSET:
            field_dict["iat"] = iat
        if exp is not UNSET:
            field_dict["exp"] = exp
        if bio_credential_kind is not UNSET:
            field_dict["bio_credential_kind"] = bio_credential_kind
        if bio_assurance is not UNSET:
            field_dict["bio_assurance"] = bio_assurance
        if bio_ledger_scope is not UNSET:
            field_dict["bio_ledger_scope"] = bio_ledger_scope

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        active = d.pop("active")

        sub = d.pop("sub", UNSET)

        scope = d.pop("scope", UNSET)

        client_id = d.pop("client_id", UNSET)

        jti = d.pop("jti", UNSET)

        iat = d.pop("iat", UNSET)

        exp = d.pop("exp", UNSET)

        _bio_credential_kind = d.pop("bio_credential_kind", UNSET)
        bio_credential_kind: IntrospectionBioCredentialKind | Unset
        if isinstance(_bio_credential_kind, Unset):
            bio_credential_kind = UNSET
        else:
            bio_credential_kind = IntrospectionBioCredentialKind(_bio_credential_kind)

        _bio_assurance = d.pop("bio_assurance", UNSET)
        bio_assurance: IntrospectionBioAssurance | Unset
        if isinstance(_bio_assurance, Unset):
            bio_assurance = UNSET
        else:
            bio_assurance = IntrospectionBioAssurance(_bio_assurance)

        bio_ledger_scope = d.pop("bio_ledger_scope", UNSET)

        introspection = cls(
            active=active,
            sub=sub,
            scope=scope,
            client_id=client_id,
            jti=jti,
            iat=iat,
            exp=exp,
            bio_credential_kind=bio_credential_kind,
            bio_assurance=bio_assurance,
            bio_ledger_scope=bio_ledger_scope,
        )

        introspection.additional_properties = d
        return introspection

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
