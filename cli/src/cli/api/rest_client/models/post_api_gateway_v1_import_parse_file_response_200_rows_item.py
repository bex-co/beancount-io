from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PostApiGatewayV1ImportParseFileResponse200RowsItem")


@_attrs_define
class PostApiGatewayV1ImportParseFileResponse200RowsItem:
    """
    Attributes:
        date (str):
        payee (str):
        description (str):
        amount (float):
    """

    date: str
    payee: str
    description: str
    amount: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        payee = self.payee

        description = self.description

        amount = self.amount

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

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        payee = d.pop("payee")

        description = d.pop("description")

        amount = d.pop("amount")

        post_api_gateway_v1_import_parse_file_response_200_rows_item = cls(
            date=date,
            payee=payee,
            description=description,
            amount=amount,
        )

        post_api_gateway_v1_import_parse_file_response_200_rows_item.additional_properties = d
        return post_api_gateway_v1_import_parse_file_response_200_rows_item

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
