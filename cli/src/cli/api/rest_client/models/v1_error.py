from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.v1_error_error import V1ErrorError


T = TypeVar("T", bound="V1Error")


@_attrs_define
class V1Error:
    """Standard v1 error body

    Attributes:
        ok (bool):
        error (V1ErrorError):
    """

    ok: bool
    error: V1ErrorError
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ok = self.ok

        error = self.error.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ok": ok,
                "error": error,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.v1_error_error import V1ErrorError  # noqa: PLC0415

        d = dict(src_dict)
        ok = d.pop("ok")

        error = V1ErrorError.from_dict(d.pop("error"))

        v1_error = cls(
            ok=ok,
            error=error,
        )

        v1_error.additional_properties = d
        return v1_error

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
