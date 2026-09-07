from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetUserProfileResponse200Type0Limits")


@_attrs_define
class GetUserProfileResponse200Type0Limits:
    """
    Attributes:
        ledgers_used (float):
        ledgers_max (float):
        collaborators_per_ledger_max (float):
        max_directives (float):
    """

    ledgers_used: float
    ledgers_max: float
    collaborators_per_ledger_max: float
    max_directives: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ledgers_used = self.ledgers_used

        ledgers_max = self.ledgers_max

        collaborators_per_ledger_max = self.collaborators_per_ledger_max

        max_directives = self.max_directives

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ledgersUsed": ledgers_used,
                "ledgersMax": ledgers_max,
                "collaboratorsPerLedgerMax": collaborators_per_ledger_max,
                "maxDirectives": max_directives,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ledgers_used = d.pop("ledgersUsed")

        ledgers_max = d.pop("ledgersMax")

        collaborators_per_ledger_max = d.pop("collaboratorsPerLedgerMax")

        max_directives = d.pop("maxDirectives")

        get_user_profile_response_200_type_0_limits = cls(
            ledgers_used=ledgers_used,
            ledgers_max=ledgers_max,
            collaborators_per_ledger_max=collaborators_per_ledger_max,
            max_directives=max_directives,
        )

        get_user_profile_response_200_type_0_limits.additional_properties = d
        return get_user_profile_response_200_type_0_limits

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
