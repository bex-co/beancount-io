from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item import (
        PostApiGatewayV1LegacyEntriesBodyEntriesInputItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LegacyEntriesBody")


@_attrs_define
class PostApiGatewayV1LegacyEntriesBody:
    """
    Attributes:
        entries_input (list[PostApiGatewayV1LegacyEntriesBodyEntriesInputItem]):
        ledger_id (None | str | Unset):
    """

    entries_input: list[PostApiGatewayV1LegacyEntriesBodyEntriesInputItem]
    ledger_id: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        entries_input = []
        for entries_input_item_data in self.entries_input:
            entries_input_item = entries_input_item_data.to_dict()
            entries_input.append(entries_input_item)

        ledger_id: None | str | Unset
        if isinstance(self.ledger_id, Unset):
            ledger_id = UNSET
        else:
            ledger_id = self.ledger_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entriesInput": entries_input,
            }
        )
        if ledger_id is not UNSET:
            field_dict["ledgerId"] = ledger_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_legacy_entries_body_entries_input_item import (
            PostApiGatewayV1LegacyEntriesBodyEntriesInputItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        entries_input = []
        _entries_input = d.pop("entriesInput")
        for entries_input_item_data in _entries_input:
            entries_input_item = PostApiGatewayV1LegacyEntriesBodyEntriesInputItem.from_dict(entries_input_item_data)

            entries_input.append(entries_input_item)

        def _parse_ledger_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        ledger_id = _parse_ledger_id(d.pop("ledgerId", UNSET))

        post_api_gateway_v1_legacy_entries_body = cls(
            entries_input=entries_input,
            ledger_id=ledger_id,
        )

        return post_api_gateway_v1_legacy_entries_body
