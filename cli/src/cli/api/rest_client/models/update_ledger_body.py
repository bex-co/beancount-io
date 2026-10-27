from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="UpdateLedgerBody")


@_attrs_define
class UpdateLedgerBody:
    """
    Attributes:
        name (None | str | Unset): Lowercase letters, numbers, and underscores, joined by single hyphens.
        description (None | str | Unset): A short description shown with the ledger, up to 2048 characters.
        private (bool | None | Unset): true makes the ledger visible only to its owner and collaborators; false makes it
            public, readable by anyone; omitted leaves it as it is.
        dryRun (bool | None | Unset): Run every check and return the preview without committing
        dry_run (bool | None | Unset): Alias of dryRun, as MCP spells it.
    """

    name: None | str | Unset = UNSET
    description: None | str | Unset = UNSET
    private: bool | None | Unset = UNSET
    dryRun: bool | None | Unset = UNSET
    dry_run: bool | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        private: bool | None | Unset
        if isinstance(self.private, Unset):
            private = UNSET
        else:
            private = self.private

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
        if name is not UNSET:
            field_dict["name"] = name
        if description is not UNSET:
            field_dict["description"] = description
        if private is not UNSET:
            field_dict["private"] = private
        if dryRun is not UNSET:
            field_dict["dryRun"] = dryRun
        if dry_run is not UNSET:
            field_dict["dry_run"] = dry_run

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        def _parse_private(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        private = _parse_private(d.pop("private", UNSET))

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

        update_ledger_body = cls(
            name=name,
            description=description,
            private=private,
            dryRun=dryRun,
            dry_run=dry_run,
        )

        return update_ledger_body
