from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.entries_request_entries_item_type_1_entry_booking_type_1 import (
    EntriesRequestEntriesItemType1EntryBookingType1,
)
from ..models.entries_request_entries_item_type_1_entry_booking_type_2_type_1 import (
    EntriesRequestEntriesItemType1EntryBookingType2Type1,
)
from ..models.entries_request_entries_item_type_1_entry_booking_type_3_type_1 import (
    EntriesRequestEntriesItemType1EntryBookingType3Type1,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="EntriesRequestEntriesItemType1Entry")


@_attrs_define
class EntriesRequestEntriesItemType1Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        currencies (list[str] | None | Unset): Valid currencies for the account; omit for a bare open line
        booking (EntriesRequestEntriesItemType1EntryBookingType1 | EntriesRequestEntriesItemType1EntryBookingType2Type1
            | EntriesRequestEntriesItemType1EntryBookingType3Type1 | None | Unset): Booking method for the account
    """

    date: str
    account: str
    currencies: list[str] | None | Unset = UNSET
    booking: (
        EntriesRequestEntriesItemType1EntryBookingType1
        | EntriesRequestEntriesItemType1EntryBookingType2Type1
        | EntriesRequestEntriesItemType1EntryBookingType3Type1
        | None
        | Unset
    ) = UNSET

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        currencies: list[str] | None | Unset
        if isinstance(self.currencies, Unset):
            currencies = UNSET
        elif isinstance(self.currencies, list):
            currencies = self.currencies

        else:
            currencies = self.currencies

        booking: None | str | Unset
        if isinstance(self.booking, Unset):
            booking = UNSET
        elif isinstance(self.booking, EntriesRequestEntriesItemType1EntryBookingType1):
            booking = self.booking.value
        elif isinstance(self.booking, EntriesRequestEntriesItemType1EntryBookingType2Type1):
            booking = self.booking.value
        elif isinstance(self.booking, EntriesRequestEntriesItemType1EntryBookingType3Type1):
            booking = self.booking.value
        else:
            booking = self.booking

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
            }
        )
        if currencies is not UNSET:
            field_dict["currencies"] = currencies
        if booking is not UNSET:
            field_dict["booking"] = booking

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        def _parse_currencies(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                currencies_type_0 = cast(list[str], data)

                return currencies_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        currencies = _parse_currencies(d.pop("currencies", UNSET))

        def _parse_booking(
            data: object,
        ) -> (
            EntriesRequestEntriesItemType1EntryBookingType1
            | EntriesRequestEntriesItemType1EntryBookingType2Type1
            | EntriesRequestEntriesItemType1EntryBookingType3Type1
            | None
            | Unset
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                booking_type_1 = EntriesRequestEntriesItemType1EntryBookingType1(data)

                return booking_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                booking_type_2_type_1 = EntriesRequestEntriesItemType1EntryBookingType2Type1(data)

                return booking_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                booking_type_3_type_1 = EntriesRequestEntriesItemType1EntryBookingType3Type1(data)

                return booking_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                EntriesRequestEntriesItemType1EntryBookingType1
                | EntriesRequestEntriesItemType1EntryBookingType2Type1
                | EntriesRequestEntriesItemType1EntryBookingType3Type1
                | None
                | Unset,
                data,
            )

        booking = _parse_booking(d.pop("booking", UNSET))

        entries_request_entries_item_type_1_entry = cls(
            date=date,
            account=account,
            currencies=currencies,
            booking=booking,
        )

        return entries_request_entries_item_type_1_entry
