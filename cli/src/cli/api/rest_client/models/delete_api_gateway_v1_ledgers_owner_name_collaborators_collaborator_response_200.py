from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.collaborator_preview import CollaboratorPreview


T = TypeVar("T", bound="DeleteApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorResponse200")


@_attrs_define
class DeleteApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorResponse200:
    """
    Attributes:
        success (bool):
        message (str | Unset):
        dry_run (bool | Unset): True when this is a collaborator mutation preview: the checks ran and nothing changed.
            Commits echo false.
        preview (CollaboratorPreview | Unset): The rendered would-be access change; present only on previews.
    """

    success: bool
    message: str | Unset = UNSET
    dry_run: bool | Unset = UNSET
    preview: CollaboratorPreview | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        success = self.success

        message = self.message

        dry_run = self.dry_run

        preview: dict[str, Any] | Unset = UNSET
        if not isinstance(self.preview, Unset):
            preview = self.preview.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "success": success,
            }
        )
        if message is not UNSET:
            field_dict["message"] = message
        if dry_run is not UNSET:
            field_dict["dryRun"] = dry_run
        if preview is not UNSET:
            field_dict["preview"] = preview

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.collaborator_preview import CollaboratorPreview  # noqa: PLC0415

        d = dict(src_dict)
        success = d.pop("success")

        message = d.pop("message", UNSET)

        dry_run = d.pop("dryRun", UNSET)

        _preview = d.pop("preview", UNSET)
        preview: CollaboratorPreview | Unset
        if isinstance(_preview, Unset):
            preview = UNSET
        else:
            preview = CollaboratorPreview.from_dict(_preview)

        delete_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200 = cls(
            success=success,
            message=message,
            dry_run=dry_run,
            preview=preview,
        )

        delete_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200.additional_properties = d
        return delete_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_response_200

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
