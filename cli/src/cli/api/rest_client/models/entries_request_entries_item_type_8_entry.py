from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="EntriesRequestEntriesItemType8Entry")


@_attrs_define
class EntriesRequestEntriesItemType8Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        filename (str):
        tags (list[str] | None | Unset):
        links (list[str] | None | Unset):
    """

    date: str
    account: str
    filename: str
    tags: list[str] | None | Unset = UNSET
    links: list[str] | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        account = self.account

        filename = self.filename

        tags: list[str] | None | Unset
        if isinstance(self.tags, Unset):
            tags = UNSET
        elif isinstance(self.tags, list):
            tags = self.tags

        else:
            tags = self.tags

        links: list[str] | None | Unset
        if isinstance(self.links, Unset):
            links = UNSET
        elif isinstance(self.links, list):
            links = self.links

        else:
            links = self.links

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "account": account,
                "filename": filename,
            }
        )
        if tags is not UNSET:
            field_dict["tags"] = tags
        if links is not UNSET:
            field_dict["links"] = links

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date")

        account = d.pop("account")

        filename = d.pop("filename")

        def _parse_tags(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                tags_type_0 = cast(list[str], data)

                return tags_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        tags = _parse_tags(d.pop("tags", UNSET))

        def _parse_links(data: object) -> list[str] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                links_type_0 = cast(list[str], data)

                return links_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[str] | None | Unset, data)

        links = _parse_links(d.pop("links", UNSET))

        entries_request_entries_item_type_8_entry = cls(
            date=date,
            account=account,
            filename=filename,
            tags=tags,
            links=links,
        )

        return entries_request_entries_item_type_8_entry
