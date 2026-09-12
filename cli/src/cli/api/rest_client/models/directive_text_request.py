from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="DirectiveTextRequest")


@_attrs_define
class DirectiveTextRequest:
    """Beancount directive text to append to the ledger

    Attributes:
        text (str): Beancount directive text, with a transaction's postings indented beneath it Example: 2026-01-02 *
            "Cafe" "Coffee"
              Expenses:Food   4.50 USD
              Assets:Cash    -4.50 USD.
        path (None | str | Unset): Target file. Omitted, each directive routes to the file the ledger's own options
            assign it.
        dry_run (bool | None | Unset): Run every check and return the diff and projected errors without committing
        allow_invalid (bool | None | Unset): Commit even when the text introduces new bean-check errors, instead of
            refusing with UNBALANCED or VALIDATION_FAILED
    """

    text: str
    path: None | str | Unset = UNSET
    dry_run: bool | None | Unset = UNSET
    allow_invalid: bool | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        text = self.text

        path: None | str | Unset
        if isinstance(self.path, Unset):
            path = UNSET
        else:
            path = self.path

        dry_run: bool | None | Unset
        if isinstance(self.dry_run, Unset):
            dry_run = UNSET
        else:
            dry_run = self.dry_run

        allow_invalid: bool | None | Unset
        if isinstance(self.allow_invalid, Unset):
            allow_invalid = UNSET
        else:
            allow_invalid = self.allow_invalid

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "text": text,
            }
        )
        if path is not UNSET:
            field_dict["path"] = path
        if dry_run is not UNSET:
            field_dict["dryRun"] = dry_run
        if allow_invalid is not UNSET:
            field_dict["allowInvalid"] = allow_invalid

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        text = d.pop("text")

        def _parse_path(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        path = _parse_path(d.pop("path", UNSET))

        def _parse_dry_run(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        dry_run = _parse_dry_run(d.pop("dryRun", UNSET))

        def _parse_allow_invalid(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        allow_invalid = _parse_allow_invalid(d.pop("allowInvalid", UNSET))

        directive_text_request = cls(
            text=text,
            path=path,
            dry_run=dry_run,
            allow_invalid=allow_invalid,
        )

        return directive_text_request
