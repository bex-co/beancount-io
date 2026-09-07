from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_0_entry_meta_type_0 import (
        EntriesRequestEntriesItemType0EntryMetaType0,
    )
    from ..models.entries_request_entries_item_type_0_entry_postings_item import (
        EntriesRequestEntriesItemType0EntryPostingsItem,
    )


T = TypeVar("T", bound="EntriesRequestEntriesItemType0Entry")


@_attrs_define
class EntriesRequestEntriesItemType0Entry:
    """
    Attributes:
        date (str):  Example: 2026-08-23.
        flag (str): `*` for cleared, `!` for pending Example: *.
        postings (list[EntriesRequestEntriesItemType0EntryPostingsItem]):
        payee (None | str | Unset):
        narration (None | str | Unset):
        tags (list[str] | None | Unset):
        links (list[str] | None | Unset):
        meta (EntriesRequestEntriesItemType0EntryMetaType0 | None | Unset):
    """

    date: str
    flag: str
    postings: list[EntriesRequestEntriesItemType0EntryPostingsItem]
    payee: None | str | Unset = UNSET
    narration: None | str | Unset = UNSET
    tags: list[str] | None | Unset = UNSET
    links: list[str] | None | Unset = UNSET
    meta: EntriesRequestEntriesItemType0EntryMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_0_entry_meta_type_0 import (
            EntriesRequestEntriesItemType0EntryMetaType0,  # noqa: PLC0415
        )

        date = self.date

        flag = self.flag

        postings = []
        for postings_item_data in self.postings:
            postings_item = postings_item_data.to_dict()
            postings.append(postings_item)

        payee: None | str | Unset
        if isinstance(self.payee, Unset):
            payee = UNSET
        else:
            payee = self.payee

        narration: None | str | Unset
        if isinstance(self.narration, Unset):
            narration = UNSET
        else:
            narration = self.narration

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
        elif isinstance(self.meta, EntriesRequestEntriesItemType0EntryMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "date": date,
                "flag": flag,
                "postings": postings,
            }
        )
        if payee is not UNSET:
            field_dict["payee"] = payee
        if narration is not UNSET:
            field_dict["narration"] = narration
        if tags is not UNSET:
            field_dict["tags"] = tags
        if links is not UNSET:
            field_dict["links"] = links
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_0_entry_meta_type_0 import (
            EntriesRequestEntriesItemType0EntryMetaType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item import (
            EntriesRequestEntriesItemType0EntryPostingsItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        date = d.pop("date")

        flag = d.pop("flag")

        postings = []
        _postings = d.pop("postings")
        for postings_item_data in _postings:
            postings_item = EntriesRequestEntriesItemType0EntryPostingsItem.from_dict(postings_item_data)

            postings.append(postings_item)

        def _parse_payee(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        payee = _parse_payee(d.pop("payee", UNSET))

        def _parse_narration(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        narration = _parse_narration(d.pop("narration", UNSET))

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

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType0EntryMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType0EntryMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_0_entry = cls(
            date=date,
            flag=flag,
            postings=postings,
            payee=payee,
            narration=narration,
            tags=tags,
            links=links,
            meta=meta,
        )

        return entries_request_entries_item_type_0_entry
