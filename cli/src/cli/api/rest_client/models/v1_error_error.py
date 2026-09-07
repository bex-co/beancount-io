from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.v1_error_error_metadata import V1ErrorErrorMetadata


T = TypeVar("T", bound="V1ErrorError")


@_attrs_define
class V1ErrorError:
    """
    Attributes:
        code (str): Canonical error category Example: VALIDATION_FAILED.
        message (str):
        metadata (V1ErrorErrorMetadata | Unset):
    """

    code: str
    message: str
    metadata: V1ErrorErrorMetadata | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        code = self.code

        message = self.message

        metadata: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metadata, Unset):
            metadata = self.metadata.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "code": code,
                "message": message,
            }
        )
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.v1_error_error_metadata import V1ErrorErrorMetadata  # noqa: PLC0415

        d = dict(src_dict)
        code = d.pop("code")

        message = d.pop("message")

        _metadata = d.pop("metadata", UNSET)
        metadata: V1ErrorErrorMetadata | Unset
        if isinstance(_metadata, Unset):
            metadata = UNSET
        else:
            metadata = V1ErrorErrorMetadata.from_dict(_metadata)

        v1_error_error = cls(
            code=code,
            message=message,
            metadata=metadata,
        )

        v1_error_error.additional_properties = d
        return v1_error_error

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
