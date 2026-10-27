from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="DeleteApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBody")


@_attrs_define
class DeleteApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBody:
    """
    Attributes:
        dryRun (bool | None | Unset): Run every check and return the preview without committing
        dry_run (bool | None | Unset): Alias of dryRun, as MCP spells it.
    """

    dryRun: bool | None | Unset = UNSET
    dry_run: bool | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        dryRun: bool | None | Unset
        if isinstance(self.dryRun, Unset):
            dryRun = UNSET
        else:
            dryRun = self.dryRun

        dry_run: bool | None | Unset
        if isinstance(self.dry_run, Unset):
            dry_run = UNSET
        else:
            dry_run = self.dry_run

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_dryRun(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        dryRun = _parse_dryRun(d.pop("dryRun", UNSET))

        def _parse_dry_run(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        dry_run = _parse_dry_run(d.pop("dry_run", UNSET))

        delete_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body = cls(
            dryRun=dryRun,
            dry_run=dry_run,
        )

        return delete_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body
