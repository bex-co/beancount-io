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
        request_id (None | str | Unset): Client-generated retry key, 1-200 characters. Send a new one per write and
            reuse it only to retry the same write: within 24 hours the same id and request return the first result without
            writing again; the same id with a different request is refused (VALIDATION_FAILED); a repeat while the first
            attempt is still writing is CONFLICT, so wait and retry with the same id. Omitted, the write is not
            deduplicated.
    """

    entries_input: list[PostApiGatewayV1LegacyEntriesBodyEntriesInputItem]
    ledger_id: None | str | Unset = UNSET
    request_id: None | str | Unset = UNSET

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

        request_id: None | str | Unset
        if isinstance(self.request_id, Unset):
            request_id = UNSET
        else:
            request_id = self.request_id

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "entriesInput": entries_input,
            }
        )
        if ledger_id is not UNSET:
            field_dict["ledgerId"] = ledger_id
        if request_id is not UNSET:
            field_dict["requestId"] = request_id

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

        def _parse_request_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        request_id = _parse_request_id(d.pop("requestId", UNSET))

        post_api_gateway_v1_legacy_entries_body = cls(
            entries_input=entries_input,
            ledger_id=ledger_id,
            request_id=request_id,
        )

        return post_api_gateway_v1_legacy_entries_body
