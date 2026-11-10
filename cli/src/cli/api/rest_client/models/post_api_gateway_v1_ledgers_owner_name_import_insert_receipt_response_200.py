from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameImportInsertReceiptResponse200")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameImportInsertReceiptResponse200:
    """
    Attributes:
        success (bool):
        entry_hashes (list[str]): The hash each committed entry now carries, in request order — what getEntryContext,
            the source-slice update and delete take. Empty when the hashes could not be resolved after the commit.
        commit (str | Unset): The sha of the commit this write made; absent on a preview or a read.
    """

    success: bool
    entry_hashes: list[str]
    commit: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        entry_hashes = self.entry_hashes

        commit = self.commit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
                "entryHashes": entry_hashes,
            }
        )
        if commit is not UNSET:
            field_dict["commit"] = commit

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        success = d.pop("success")

        entry_hashes = cast(list[str], d.pop("entryHashes"))

        commit = d.pop("commit", UNSET)

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_response_200 = cls(
            success=success,
            entry_hashes=entry_hashes,
            commit=commit,
        )

        post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_response_200.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_import_insert_receipt_response_200

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
