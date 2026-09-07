from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportParseReceiptResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportParseReceiptResponse200:
    """
    Attributes:
        date (None | str):
        payee (str):
        description (str):
        amount (float):
        source_account (str | Unset):
        target_account (str | Unset):
    """

    date: None | str
    payee: str
    description: str
    amount: float
    source_account: str | Unset = UNSET
    target_account: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date: None | str
        date = self.date

        payee = self.payee

        description = self.description

        amount = self.amount

        source_account = self.source_account

        target_account = self.target_account

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "date": date,
                "payee": payee,
                "description": description,
                "amount": amount,
            }
        )
        if source_account is not UNSET:
            field_dict["sourceAccount"] = source_account
        if target_account is not UNSET:
            field_dict["targetAccount"] = target_account

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_date(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        date = _parse_date(d.pop("date"))

        payee = d.pop("payee")

        description = d.pop("description")

        amount = d.pop("amount")

        source_account = d.pop("sourceAccount", UNSET)

        target_account = d.pop("targetAccount", UNSET)

        post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_response_200 = cls(
            date=date,
            payee=payee,
            description=description,
            amount=amount,
            source_account=source_account,
            target_account=target_account,
        )

        post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_import_parse_receipt_response_200

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
