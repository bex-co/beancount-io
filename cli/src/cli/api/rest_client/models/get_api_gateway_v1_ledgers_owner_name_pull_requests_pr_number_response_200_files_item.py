from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem")


@_attrs_define
class GetApiGatewayV1LedgersOwnerNamePullRequestsPrNumberResponse200FilesItem:
    """
    Attributes:
        filename (str):
        additions (int):
        deletions (int):
        changes (int):
    """

    filename: str
    additions: int
    deletions: int
    changes: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        filename = self.filename

        additions = self.additions

        deletions = self.deletions

        changes = self.changes

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "filename": filename,
                "additions": additions,
                "deletions": deletions,
                "changes": changes,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        filename = d.pop("filename")

        additions = d.pop("additions")

        deletions = d.pop("deletions")

        changes = d.pop("changes")

        get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200_files_item = cls(
            filename=filename,
            additions=additions,
            deletions=deletions,
            changes=changes,
        )

        get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200_files_item.additional_properties = d
        return get_api_gateway_v1_ledgers_owner_name_pull_requests_pr_number_response_200_files_item

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
