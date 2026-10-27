from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.collaborator_preview_current_type_1 import CollaboratorPreviewCurrentType1
from ..models.collaborator_preview_current_type_2_type_1 import CollaboratorPreviewCurrentType2Type1
from ..models.collaborator_preview_current_type_3_type_1 import CollaboratorPreviewCurrentType3Type1
from ..models.collaborator_preview_requested_type_1 import CollaboratorPreviewRequestedType1
from ..models.collaborator_preview_requested_type_2_type_1 import CollaboratorPreviewRequestedType2Type1
from ..models.collaborator_preview_requested_type_3_type_1 import CollaboratorPreviewRequestedType3Type1

T = TypeVar("T", bound="CollaboratorPreview")


@_attrs_define
class CollaboratorPreview:
    """The rendered would-be access change; present only on previews.

    Attributes:
        collaborator (str): Whose access would change.
        current (CollaboratorPreviewCurrentType1 | CollaboratorPreviewCurrentType2Type1 |
            CollaboratorPreviewCurrentType3Type1 | None): Their current access, null when no grant could be confirmed.
        requested (CollaboratorPreviewRequestedType1 | CollaboratorPreviewRequestedType2Type1 |
            CollaboratorPreviewRequestedType3Type1 | None): The access the call asks for, null for removals and the
            repository default.
        warnings (list[str]): What would happen, in plain words.
    """

    collaborator: str
    current: (
        CollaboratorPreviewCurrentType1
        | CollaboratorPreviewCurrentType2Type1
        | CollaboratorPreviewCurrentType3Type1
        | None
    )
    requested: (
        CollaboratorPreviewRequestedType1
        | CollaboratorPreviewRequestedType2Type1
        | CollaboratorPreviewRequestedType3Type1
        | None
    )
    warnings: list[str]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        collaborator = self.collaborator

        current: None | str
        if isinstance(self.current, CollaboratorPreviewCurrentType1):
            current = self.current.value
        elif isinstance(self.current, CollaboratorPreviewCurrentType2Type1):
            current = self.current.value
        elif isinstance(self.current, CollaboratorPreviewCurrentType3Type1):
            current = self.current.value
        else:
            current = self.current

        requested: None | str
        if isinstance(self.requested, CollaboratorPreviewRequestedType1):
            requested = self.requested.value
        elif isinstance(self.requested, CollaboratorPreviewRequestedType2Type1):
            requested = self.requested.value
        elif isinstance(self.requested, CollaboratorPreviewRequestedType3Type1):
            requested = self.requested.value
        else:
            requested = self.requested

        warnings = self.warnings

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "collaborator": collaborator,
                "current": current,
                "requested": requested,
                "warnings": warnings,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        collaborator = d.pop("collaborator")

        def _parse_current(
            data: object,
        ) -> (
            CollaboratorPreviewCurrentType1
            | CollaboratorPreviewCurrentType2Type1
            | CollaboratorPreviewCurrentType3Type1
            | None
        ):
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                current_type_1 = CollaboratorPreviewCurrentType1(data)

                return current_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                current_type_2_type_1 = CollaboratorPreviewCurrentType2Type1(data)

                return current_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                current_type_3_type_1 = CollaboratorPreviewCurrentType3Type1(data)

                return current_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                CollaboratorPreviewCurrentType1
                | CollaboratorPreviewCurrentType2Type1
                | CollaboratorPreviewCurrentType3Type1
                | None,
                data,
            )

        current = _parse_current(d.pop("current"))

        def _parse_requested(
            data: object,
        ) -> (
            CollaboratorPreviewRequestedType1
            | CollaboratorPreviewRequestedType2Type1
            | CollaboratorPreviewRequestedType3Type1
            | None
        ):
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                requested_type_1 = CollaboratorPreviewRequestedType1(data)

                return requested_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                requested_type_2_type_1 = CollaboratorPreviewRequestedType2Type1(data)

                return requested_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                requested_type_3_type_1 = CollaboratorPreviewRequestedType3Type1(data)

                return requested_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                CollaboratorPreviewRequestedType1
                | CollaboratorPreviewRequestedType2Type1
                | CollaboratorPreviewRequestedType3Type1
                | None,
                data,
            )

        requested = _parse_requested(d.pop("requested"))

        warnings = cast(list[str], d.pop("warnings"))

        collaborator_preview = cls(
            collaborator=collaborator,
            current=current,
            requested=requested,
            warnings=warnings,
        )

        collaborator_preview.additional_properties = d
        return collaborator_preview

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
