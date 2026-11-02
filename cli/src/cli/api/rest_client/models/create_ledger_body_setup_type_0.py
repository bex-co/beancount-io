from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define

from ..models.create_ledger_body_setup_type_0_preset import CreateLedgerBodySetupType0Preset
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.create_ledger_body_setup_type_0_accounts_item import CreateLedgerBodySetupType0AccountsItem
    from ..models.create_ledger_body_setup_type_0_capabilities import CreateLedgerBodySetupType0Capabilities
    from ..models.create_ledger_body_setup_type_0_modules_item import CreateLedgerBodySetupType0ModulesItem


T = TypeVar("T", bound="CreateLedgerBodySetupType0")


@_attrs_define
class CreateLedgerBodySetupType0:
    """
    Attributes:
        preset (CreateLedgerBodySetupType0Preset): Setup preset id (ADR021).
        modules (list[CreateLedgerBodySetupType0ModulesItem] | Unset): personal@1 only; each module at most once.
        title (str | Unset):
        operating_currency (str | Unset):
        history_start (str | Unset):
        capabilities (CreateLedgerBodySetupType0Capabilities | Unset):
        accounts (list[CreateLedgerBodySetupType0AccountsItem] | Unset):
    """

    preset: CreateLedgerBodySetupType0Preset
    modules: list[CreateLedgerBodySetupType0ModulesItem] | Unset = UNSET
    title: str | Unset = UNSET
    operating_currency: str | Unset = UNSET
    history_start: str | Unset = UNSET
    capabilities: CreateLedgerBodySetupType0Capabilities | Unset = UNSET
    accounts: list[CreateLedgerBodySetupType0AccountsItem] | Unset = UNSET

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
        from ..models.create_ledger_body_setup_type_0_accounts_item import (
            CreateLedgerBodySetupType0AccountsItem,  # noqa: PLC0415
        )
        from ..models.create_ledger_body_setup_type_0_capabilities import (
            CreateLedgerBodySetupType0Capabilities,  # noqa: PLC0415
        )
        from ..models.create_ledger_body_setup_type_0_modules_item import (
            CreateLedgerBodySetupType0ModulesItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        preset = CreateLedgerBodySetupType0Preset(d.pop("preset"))

        _modules = d.pop("modules", UNSET)
        modules: list[CreateLedgerBodySetupType0ModulesItem] | Unset = UNSET
        if _modules is not UNSET:
            modules = []
            for modules_item_data in _modules:
                modules_item = CreateLedgerBodySetupType0ModulesItem.from_dict(modules_item_data)

                modules.append(modules_item)

        title = d.pop("title", UNSET)

        operating_currency = d.pop("operatingCurrency", UNSET)

        history_start = d.pop("historyStart", UNSET)

        _capabilities = d.pop("capabilities", UNSET)
        capabilities: CreateLedgerBodySetupType0Capabilities | Unset
        if isinstance(_capabilities, Unset):
            capabilities = UNSET
        else:
            capabilities = CreateLedgerBodySetupType0Capabilities.from_dict(_capabilities)

        _accounts = d.pop("accounts", UNSET)
        accounts: list[CreateLedgerBodySetupType0AccountsItem] | Unset = UNSET
        if _accounts is not UNSET:
            accounts = []
            for accounts_item_data in _accounts:
                accounts_item = CreateLedgerBodySetupType0AccountsItem.from_dict(accounts_item_data)

                accounts.append(accounts_item)

        create_ledger_body_setup_type_0 = cls(
            preset=preset,
            modules=modules,
            title=title,
            operating_currency=operating_currency,
            history_start=history_start,
            capabilities=capabilities,
            accounts=accounts,
        )

        return create_ledger_body_setup_type_0
