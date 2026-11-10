from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.file_commit_ack_new_errors_item import FileCommitAckNewErrorsItem


T = TypeVar("T", bound="FileCommitAck")


@_attrs_define
class FileCommitAck:
    """Acknowledgement that a file change was committed — or, on a dry run, that it would be

    Attributes:
        ok (bool):
        path (str):
        dry_run (bool): True when this was a preview: the checks ran and nothing was committed.
        valid (bool): True only when the change adds no bean-check error. A dry run reports the new errors instead of
            refusing, so gate on this, not on the status.
        new_errors (list[FileCommitAckNewErrorsItem]):
        not_loaded (list[str] | Unset): Ledger files the change writes that no loaded file includes: their entries don't
            count and bean-check did not read them. Present only when there are any.
    """

    ok: bool
    path: str
    dry_run: bool
    valid: bool
    new_errors: list[FileCommitAckNewErrorsItem]
    not_loaded: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ok = self.ok

        path = self.path

        dry_run = self.dry_run

        valid = self.valid

        new_errors = []
        for new_errors_item_data in self.new_errors:
            new_errors_item = new_errors_item_data.to_dict()
            new_errors.append(new_errors_item)

        not_loaded: list[str] | Unset = UNSET
        if not isinstance(self.not_loaded, Unset):
            not_loaded = self.not_loaded

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ok": ok,
                "path": path,
                "dryRun": dry_run,
                "valid": valid,
                "newErrors": new_errors,
            }
        )
        if not_loaded is not UNSET:
            field_dict["notLoaded"] = not_loaded

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.file_commit_ack_new_errors_item import FileCommitAckNewErrorsItem  # noqa: PLC0415

        d = dict(src_dict)
        ok = d.pop("ok")

        path = d.pop("path")

        dry_run = d.pop("dryRun")

        valid = d.pop("valid")

        new_errors = []
        _new_errors = d.pop("newErrors")
        for new_errors_item_data in _new_errors:
            new_errors_item = FileCommitAckNewErrorsItem.from_dict(new_errors_item_data)

            new_errors.append(new_errors_item)

        not_loaded = cast(list[str], d.pop("notLoaded", UNSET))

        file_commit_ack = cls(
            ok=ok,
            path=path,
            dry_run=dry_run,
            valid=valid,
            new_errors=new_errors,
            not_loaded=not_loaded,
        )

        file_commit_ack.additional_properties = d
        return file_commit_ack

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
