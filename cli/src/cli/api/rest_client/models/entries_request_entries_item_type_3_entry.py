from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="EntriesRequestEntriesItemType3Entry")


@_attrs_define
class EntriesRequestEntriesItemType3Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        sourceAccount (None | str | Unset): Account to pad from Example: Equity:Opening-Balances.
        source_account (None | str | Unset): Alias of sourceAccount. One of the two is required.
    """

    date: str
    account: str
    sourceAccount: None | str | Unset = UNSET
    source_account: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        sourceAccount: None | str | Unset
        if isinstance(self.sourceAccount, Unset):
            sourceAccount = UNSET
        else:
            sourceAccount = self.sourceAccount

        source_account: None | str | Unset
        if isinstance(self.source_account, Unset):
            source_account = UNSET
        else:
            source_account = self.source_account

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
            }
        )
        if sourceAccount is not UNSET:
            field_dict["sourceAccount"] = sourceAccount
        if source_account is not UNSET:
            field_dict["source_account"] = source_account

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        def _parse_sourceAccount(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        sourceAccount = _parse_sourceAccount(d.pop("sourceAccount", UNSET))

        def _parse_source_account(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_account = _parse_source_account(d.pop("source_account", UNSET))

        entries_request_entries_item_type_3_entry = cls(
            date=date,
            account=account,
            sourceAccount=sourceAccount,
            source_account=source_account,
        )

        return entries_request_entries_item_type_3_entry
