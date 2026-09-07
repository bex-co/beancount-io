from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="BankAccountCurrency")


@_attrs_define
class BankAccountCurrency:
    """
    Attributes:
        currency (str):
    """

    currency: str

    def to_dict(self) -> dict[str, Any]:
        currency = self.currency

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "currency": currency,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        currency = d.pop("currency")

        bank_account_currency = cls(
            currency=currency,
        )

        return bank_account_currency
