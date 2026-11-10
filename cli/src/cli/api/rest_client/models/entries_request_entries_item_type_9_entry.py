from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_9_entry_meta_type_0 import (
        EntriesRequestEntriesItemType9EntryMetaType0,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType9Entry")


@_attrs_define
class EntriesRequestEntriesItemType9Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        account (str):
        filename (str):
        tags (list[str] | None | Unset):
        links (list[str] | None | Unset):
        meta (EntriesRequestEntriesItemType9EntryMetaType0 | None | Unset): Metadata written beneath the directive;
            every value is a string, written quoted as given
    """

    date: str
    account: str
    filename: str
    tags: list[str] | None | Unset = UNSET
    links: list[str] | None | Unset = UNSET
    meta: EntriesRequestEntriesItemType9EntryMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_9_entry_meta_type_0 import (
            EntriesRequestEntriesItemType9EntryMetaType0,  # noqa: PLC0415
        )

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

        meta: dict[str, Any] | None | Unset
        if isinstance(self.meta, Unset):
            meta = UNSET
        elif isinstance(self.meta, EntriesRequestEntriesItemType9EntryMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

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
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_9_entry_meta_type_0 import (
            EntriesRequestEntriesItemType9EntryMetaType0,  # noqa: PLC0415
        )

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

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType9EntryMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType9EntryMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType9EntryMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_9_entry = cls(
            date=date,
            account=account,
            filename=filename,
            tags=tags,
            links=links,
            meta=meta,
        )

        return entries_request_entries_item_type_9_entry
