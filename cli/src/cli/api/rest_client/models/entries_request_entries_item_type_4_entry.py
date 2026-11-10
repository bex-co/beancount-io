from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_4_entry_amount import EntriesRequestEntriesItemType4EntryAmount
    from ..models.entries_request_entries_item_type_4_entry_meta_type_0 import (
        EntriesRequestEntriesItemType4EntryMetaType0,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType4Entry")


@_attrs_define
class EntriesRequestEntriesItemType4Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        amount (EntriesRequestEntriesItemType4EntryAmount):
        tolerance (None | str | Unset): Explicit balance tolerance as a plain decimal
        meta (EntriesRequestEntriesItemType4EntryMetaType0 | None | Unset): Metadata written beneath the directive;
            every value is a string, written quoted as given
    """

    date: str
    account: str
    amount: EntriesRequestEntriesItemType4EntryAmount
    tolerance: None | str | Unset = UNSET
    meta: EntriesRequestEntriesItemType4EntryMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_4_entry_meta_type_0 import (
            EntriesRequestEntriesItemType4EntryMetaType0,  # noqa: PLC0415
        )

        date = self.date

        account = self.account

        amount = self.amount.to_dict()

        tolerance: None | str | Unset
        if isinstance(self.tolerance, Unset):
            tolerance = UNSET
        else:
            tolerance = self.tolerance

        meta: dict[str, Any] | None | Unset
        if isinstance(self.meta, Unset):
            meta = UNSET
        elif isinstance(self.meta, EntriesRequestEntriesItemType4EntryMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "amount": amount,
            }
        )
        if tolerance is not UNSET:
            field_dict["tolerance"] = tolerance
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_4_entry_amount import (
            EntriesRequestEntriesItemType4EntryAmount,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_4_entry_meta_type_0 import (
            EntriesRequestEntriesItemType4EntryMetaType0,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        amount = EntriesRequestEntriesItemType4EntryAmount.from_dict(d.pop("amount"))

        def _parse_tolerance(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        tolerance = _parse_tolerance(d.pop("tolerance", UNSET))

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType4EntryMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType4EntryMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType4EntryMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_4_entry = cls(
            date=date,
            account=account,
            amount=amount,
            tolerance=tolerance,
            meta=meta,
        )

        return entries_request_entries_item_type_4_entry
