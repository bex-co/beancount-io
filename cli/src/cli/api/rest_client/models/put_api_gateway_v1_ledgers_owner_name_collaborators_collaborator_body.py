from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body_permission_type_1 import (
    PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1,
)
from ..models.put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body_permission_type_2_type_1 import (
    PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1,
)
from ..models.put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body_permission_type_3_type_1 import (
    PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBody")


@_attrs_define
class PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBody:
    """
    Attributes:
        permission (None | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1 |
            PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1 |
            PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1 | Unset):
    """

    permission: (
        None
        | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1
        | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1
        | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1
        | Unset
    ) = UNSET

    def to_dict(self) -> dict[str, Any]:
        permission: None | str | Unset
        if isinstance(self.permission, Unset):
            permission = UNSET
        elif isinstance(self.permission, PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1):
            permission = self.permission.value
        elif isinstance(
            self.permission, PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1
        ):
            permission = self.permission.value
        elif isinstance(
            self.permission, PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1
        ):
            permission = self.permission.value
        else:
            permission = self.permission

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if permission is not UNSET:
            field_dict["permission"] = permission

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_permission(
            data: object,
        ) -> (
            None
            | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1
            | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1
            | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1
            | Unset
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                permission_type_1 = PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1(data)

                return permission_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                permission_type_2_type_1 = (
                    PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1(data)
                )

                return permission_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                permission_type_3_type_1 = (
                    PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1(data)
                )

                return permission_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                None
                | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType1
                | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType2Type1
                | PutApiGatewayV1LedgersOwnerNameCollaboratorsCollaboratorBodyPermissionType3Type1
                | Unset,
                data,
            )

        permission = _parse_permission(d.pop("permission", UNSET))

        put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body = cls(
            permission=permission,
        )

        return put_api_gateway_v1_ledgers_owner_name_collaborators_collaborator_body
