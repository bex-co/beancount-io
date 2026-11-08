from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.preview_ledger_setup_body_setup_preset import PreviewLedgerSetupBodySetupPreset
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.preview_ledger_setup_body_setup_accounts_item import PreviewLedgerSetupBodySetupAccountsItem
    from ..models.preview_ledger_setup_body_setup_capabilities import PreviewLedgerSetupBodySetupCapabilities
    from ..models.preview_ledger_setup_body_setup_modules_item import PreviewLedgerSetupBodySetupModulesItem


T = TypeVar("T", bound="PreviewLedgerSetupBodySetup")


@_attrs_define
class PreviewLedgerSetupBodySetup:
    """
    Attributes:
        preset (PreviewLedgerSetupBodySetupPreset): Setup preset id (ADR026).
        modules (list[PreviewLedgerSetupBodySetupModulesItem] | Unset): personal@1 only; each module at most once.
        title (str | Unset):
        operating_currency (str | Unset):
        history_start (str | Unset):
        capabilities (PreviewLedgerSetupBodySetupCapabilities | Unset):
        accounts (list[PreviewLedgerSetupBodySetupAccountsItem] | Unset):
    """

    preset: PreviewLedgerSetupBodySetupPreset
    modules: list[PreviewLedgerSetupBodySetupModulesItem] | Unset = UNSET
    title: str | Unset = UNSET
    operating_currency: str | Unset = UNSET
    history_start: str | Unset = UNSET
    capabilities: PreviewLedgerSetupBodySetupCapabilities | Unset = UNSET
    accounts: list[PreviewLedgerSetupBodySetupAccountsItem] | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        preset = self.preset.value

        modules: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.modules, Unset):
            modules = []
            for modules_item_data in self.modules:
                modules_item = modules_item_data.to_dict()
                modules.append(modules_item)

        title = self.title

        operating_currency = self.operating_currency

        history_start = self.history_start

        capabilities: dict[str, Any] | Unset = UNSET
        if not isinstance(self.capabilities, Unset):
            capabilities = self.capabilities.to_dict()

        accounts: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.accounts, Unset):
            accounts = []
            for accounts_item_data in self.accounts:
                accounts_item = accounts_item_data.to_dict()
                accounts.append(accounts_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "preset": preset,
            }
        )
        if modules is not UNSET:
            field_dict["modules"] = modules
        if title is not UNSET:
            field_dict["title"] = title
        if operating_currency is not UNSET:
            field_dict["operatingCurrency"] = operating_currency
        if history_start is not UNSET:
            field_dict["historyStart"] = history_start
        if capabilities is not UNSET:
            field_dict["capabilities"] = capabilities
        if accounts is not UNSET:
            field_dict["accounts"] = accounts

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.preview_ledger_setup_body_setup_accounts_item import (
            PreviewLedgerSetupBodySetupAccountsItem,  # noqa: PLC0415
        )
        from ..models.preview_ledger_setup_body_setup_capabilities import (
            PreviewLedgerSetupBodySetupCapabilities,  # noqa: PLC0415
        )
        from ..models.preview_ledger_setup_body_setup_modules_item import (
            PreviewLedgerSetupBodySetupModulesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        preset = PreviewLedgerSetupBodySetupPreset(d.pop("preset"))

        _modules = d.pop("modules", UNSET)
        modules: list[PreviewLedgerSetupBodySetupModulesItem] | Unset = UNSET
        if _modules is not UNSET:
            modules = []
            for modules_item_data in _modules:
                modules_item = PreviewLedgerSetupBodySetupModulesItem.from_dict(modules_item_data)

                modules.append(modules_item)

        title = d.pop("title", UNSET)

        operating_currency = d.pop("operatingCurrency", UNSET)

        history_start = d.pop("historyStart", UNSET)

        _capabilities = d.pop("capabilities", UNSET)
        capabilities: PreviewLedgerSetupBodySetupCapabilities | Unset
        if isinstance(_capabilities, Unset):
            capabilities = UNSET
        else:
            capabilities = PreviewLedgerSetupBodySetupCapabilities.from_dict(_capabilities)

        _accounts = d.pop("accounts", UNSET)
        accounts: list[PreviewLedgerSetupBodySetupAccountsItem] | Unset = UNSET
        if _accounts is not UNSET:
            accounts = []
            for accounts_item_data in _accounts:
                accounts_item = PreviewLedgerSetupBodySetupAccountsItem.from_dict(accounts_item_data)

                accounts.append(accounts_item)

        preview_ledger_setup_body_setup = cls(
            preset=preset,
            modules=modules,
            title=title,
            operating_currency=operating_currency,
            history_start=history_start,
            capabilities=capabilities,
            accounts=accounts,
        )

        return preview_ledger_setup_body_setup
