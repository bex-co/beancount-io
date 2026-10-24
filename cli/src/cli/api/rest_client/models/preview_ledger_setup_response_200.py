from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.preview_ledger_setup_response_200_files import PreviewLedgerSetupResponse200Files
    from ..models.preview_ledger_setup_response_200_validation import PreviewLedgerSetupResponse200Validation


T = TypeVar("T", bound="PreviewLedgerSetupResponse200")


@_attrs_define
class PreviewLedgerSetupResponse200:
    """
    Attributes:
        preset (str):
        operating_currency (str):
        history_start (str):
        accounts (list[str]):
        files (PreviewLedgerSetupResponse200Files):
        validation (PreviewLedgerSetupResponse200Validation):
    """

    preset: str
    operating_currency: str
    history_start: str
    accounts: list[str]
    files: PreviewLedgerSetupResponse200Files
    validation: PreviewLedgerSetupResponse200Validation
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        preset = self.preset

        operating_currency = self.operating_currency

        history_start = self.history_start

        accounts = self.accounts

        files = self.files.to_dict()

        validation = self.validation.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "preset": preset,
                "operatingCurrency": operating_currency,
                "historyStart": history_start,
                "accounts": accounts,
                "files": files,
                "validation": validation,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.preview_ledger_setup_response_200_files import PreviewLedgerSetupResponse200Files  # noqa: PLC0415
        from ..models.preview_ledger_setup_response_200_validation import (
            PreviewLedgerSetupResponse200Validation,  # noqa: PLC0415
        )

        d = dict(src_dict)
        preset = d.pop("preset")

        operating_currency = d.pop("operatingCurrency")

        history_start = d.pop("historyStart")

        accounts = cast(list[str], d.pop("accounts"))

        files = PreviewLedgerSetupResponse200Files.from_dict(d.pop("files"))

        validation = PreviewLedgerSetupResponse200Validation.from_dict(d.pop("validation"))

        preview_ledger_setup_response_200 = cls(
            preset=preset,
            operating_currency=operating_currency,
            history_start=history_start,
            accounts=accounts,
            files=files,
            validation=validation,
        )

        preview_ledger_setup_response_200.additional_properties = d
        return preview_ledger_setup_response_200

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
