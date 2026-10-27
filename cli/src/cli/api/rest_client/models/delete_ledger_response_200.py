from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ledger_delete_preview import LedgerDeletePreview


T = TypeVar("T", bound="DeleteLedgerResponse200")


@_attrs_define
class DeleteLedgerResponse200:
    """
    Attributes:
        ledger_id (str):
        dry_run (bool | Unset): True when this is a deleteLedger preview: the checks ran and nothing was destroyed.
            Commits echo false.
        preview (LedgerDeletePreview | Unset): The destroy summary; present only on deleteLedger previews.
    """

    ledger_id: str
    dry_run: bool | Unset = UNSET
    preview: LedgerDeletePreview | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ledger_id = self.ledger_id

        dry_run = self.dry_run

        preview: dict[str, Any] | Unset = UNSET
        if not isinstance(self.preview, Unset):
            preview = self.preview.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ledgerId": ledger_id,
            }
        )
        if dry_run is not UNSET:
            field_dict["dryRun"] = dry_run
        if preview is not UNSET:
            field_dict["preview"] = preview

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.ledger_delete_preview import LedgerDeletePreview  # noqa: PLC0415

        d = dict(src_dict)
        ledger_id = d.pop("ledgerId")

        dry_run = d.pop("dryRun", UNSET)

        _preview = d.pop("preview", UNSET)
        preview: LedgerDeletePreview | Unset
        if isinstance(_preview, Unset):
            preview = UNSET
        else:
            preview = LedgerDeletePreview.from_dict(_preview)

        delete_ledger_response_200 = cls(
            ledger_id=ledger_id,
            dry_run=dry_run,
            preview=preview,
        )

        delete_ledger_response_200.additional_properties = d
        return delete_ledger_response_200

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
