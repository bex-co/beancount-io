from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PostingTotalPriceType0")


@_attrs_define
class PostingTotalPriceType0:
    """Total price (`@@`); exclusive with the per-unit price

    Attributes:
        number (str): Decimal amount Example: 42.50.
        currency (str):  Example: USD.
    """

    number: str
    currency: str

    def to_dict(self) -> dict[str, Any]:
        number = self.number

        currency = self.currency

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "number": number,
                "currency": currency,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        number = d.pop("number")

        currency = d.pop("currency")

        posting_total_price_type_0 = cls(
            number=number,
            currency=currency,
        )

        return posting_total_price_type_0
