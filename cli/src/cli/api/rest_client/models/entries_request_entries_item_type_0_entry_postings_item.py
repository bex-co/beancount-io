from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.entries_request_entries_item_type_0_entry_postings_item_cost_type_0 import (
        EntriesRequestEntriesItemType0EntryPostingsItemCostType0,
    )
    from ..models.entries_request_entries_item_type_0_entry_postings_item_meta_type_0 import (
        EntriesRequestEntriesItemType0EntryPostingsItemMetaType0,
    )
    from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
        EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,
    )
    from ..models.entries_request_entries_item_type_0_entry_postings_item_units_type_0 import (
        EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0,
    )
    from ..models.posting_total_price_type_0 import PostingTotalPriceType0


T = TypeVar("T", bound="EntriesRequestEntriesItemType0EntryPostingsItem")


@_attrs_define
class EntriesRequestEntriesItemType0EntryPostingsItem:
    """
    Attributes:
        account (str):  Example: Assets:Bank:Checking.
        units (EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0 | None | Unset): Posting amount; omit on at
            most one posting per transaction to elide it
        price (EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset): Per-unit price (`@`
            annotation); exclusive with the total price
        totalPrice (None | PostingTotalPriceType0 | Unset): Total price (`@@`); exclusive with the per-unit price
        total_price (None | PostingTotalPriceType0 | Unset): Total price (`@@`); exclusive with the per-unit price
        cost (EntriesRequestEntriesItemType0EntryPostingsItemCostType0 | None | Unset): Lot basis `{number currency [,
            date] [, label]}`; needs units like price
        flag (None | str | Unset):
        tags (list[str] | None | Unset): Posting tags (`#tag`), sorted onto the posting line
        links (list[str] | None | Unset): Posting links (`^link`), sorted onto the posting line
        meta (EntriesRequestEntriesItemType0EntryPostingsItemMetaType0 | None | Unset): Posting metadata, written
            beneath the posting
    """

    account: str
    units: EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0 | None | Unset = UNSET
    price: EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset = UNSET
    totalPrice: None | PostingTotalPriceType0 | Unset = UNSET
    total_price: None | PostingTotalPriceType0 | Unset = UNSET
    cost: EntriesRequestEntriesItemType0EntryPostingsItemCostType0 | None | Unset = UNSET
    flag: None | str | Unset = UNSET
    tags: list[str] | None | Unset = UNSET
    links: list[str] | None | Unset = UNSET
    meta: EntriesRequestEntriesItemType0EntryPostingsItemMetaType0 | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.entries_request_entries_item_type_0_entry_postings_item_cost_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemCostType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_meta_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemMetaType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_units_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0,  # noqa: PLC0415
        )
        from ..models.posting_total_price_type_0 import PostingTotalPriceType0  # noqa: PLC0415

        account = self.account

        units: dict[str, Any] | None | Unset
        if isinstance(self.units, Unset):
            units = UNSET
        elif isinstance(self.units, EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0):
            units = self.units.to_dict()
        else:
            units = self.units

        price: dict[str, Any] | None | Unset
        if isinstance(self.price, Unset):
            price = UNSET
        elif isinstance(self.price, EntriesRequestEntriesItemType0EntryPostingsItemPriceType0):
            price = self.price.to_dict()
        else:
            price = self.price

        totalPrice: dict[str, Any] | None | Unset
        if isinstance(self.totalPrice, Unset):
            totalPrice = UNSET
        elif isinstance(self.totalPrice, PostingTotalPriceType0):
            totalPrice = self.totalPrice.to_dict()
        else:
            totalPrice = self.totalPrice

        total_price: dict[str, Any] | None | Unset
        if isinstance(self.total_price, Unset):
            total_price = UNSET
        elif isinstance(self.total_price, PostingTotalPriceType0):
            total_price = self.total_price.to_dict()
        else:
            total_price = self.total_price

        cost: dict[str, Any] | None | Unset
        if isinstance(self.cost, Unset):
            cost = UNSET
        elif isinstance(self.cost, EntriesRequestEntriesItemType0EntryPostingsItemCostType0):
            cost = self.cost.to_dict()
        else:
            cost = self.cost

        flag: None | str | Unset
        if isinstance(self.flag, Unset):
            flag = UNSET
        else:
            flag = self.flag

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
        elif isinstance(self.meta, EntriesRequestEntriesItemType0EntryPostingsItemMetaType0):
            meta = self.meta.to_dict()
        else:
            meta = self.meta

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "account": account,
            }
        )
        if units is not UNSET:
            field_dict["units"] = units
        if price is not UNSET:
            field_dict["price"] = price
        if totalPrice is not UNSET:
            field_dict["totalPrice"] = totalPrice
        if total_price is not UNSET:
            field_dict["total_price"] = total_price
        if cost is not UNSET:
            field_dict["cost"] = cost
        if flag is not UNSET:
            field_dict["flag"] = flag
        if tags is not UNSET:
            field_dict["tags"] = tags
        if links is not UNSET:
            field_dict["links"] = links
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.entries_request_entries_item_type_0_entry_postings_item_cost_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemCostType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_meta_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemMetaType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_price_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemPriceType0,  # noqa: PLC0415
        )
        from ..models.entries_request_entries_item_type_0_entry_postings_item_units_type_0 import (
            EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0,  # noqa: PLC0415
        )
        from ..models.posting_total_price_type_0 import PostingTotalPriceType0  # noqa: PLC0415

        d = dict(src_dict)
        account = d.pop("account")

        def _parse_units(data: object) -> EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                units_type_0 = EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0.from_dict(data)

                return units_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryPostingsItemUnitsType0 | None | Unset, data)

        units = _parse_units(d.pop("units", UNSET))

        def _parse_price(data: object) -> EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                price_type_0 = EntriesRequestEntriesItemType0EntryPostingsItemPriceType0.from_dict(data)

                return price_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryPostingsItemPriceType0 | None | Unset, data)

        price = _parse_price(d.pop("price", UNSET))

        def _parse_totalPrice(data: object) -> None | PostingTotalPriceType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_posting_total_price_type_0 = PostingTotalPriceType0.from_dict(data)

                return componentsschemas_posting_total_price_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PostingTotalPriceType0 | Unset, data)

        totalPrice = _parse_totalPrice(d.pop("totalPrice", UNSET))

        def _parse_total_price(data: object) -> None | PostingTotalPriceType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_posting_total_price_type_0 = PostingTotalPriceType0.from_dict(data)

                return componentsschemas_posting_total_price_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PostingTotalPriceType0 | Unset, data)

        total_price = _parse_total_price(d.pop("total_price", UNSET))

        def _parse_cost(data: object) -> EntriesRequestEntriesItemType0EntryPostingsItemCostType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                cost_type_0 = EntriesRequestEntriesItemType0EntryPostingsItemCostType0.from_dict(data)

                return cost_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryPostingsItemCostType0 | None | Unset, data)

        cost = _parse_cost(d.pop("cost", UNSET))

        def _parse_flag(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        flag = _parse_flag(d.pop("flag", UNSET))

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

        def _parse_meta(data: object) -> EntriesRequestEntriesItemType0EntryPostingsItemMetaType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                meta_type_0 = EntriesRequestEntriesItemType0EntryPostingsItemMetaType0.from_dict(data)

                return meta_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(EntriesRequestEntriesItemType0EntryPostingsItemMetaType0 | None | Unset, data)

        meta = _parse_meta(d.pop("meta", UNSET))

        entries_request_entries_item_type_0_entry_postings_item = cls(
            account=account,
            units=units,
            price=price,
            totalPrice=totalPrice,
            total_price=total_price,
            cost=cost,
            flag=flag,
            tags=tags,
            links=links,
            meta=meta,
        )

        return entries_request_entries_item_type_0_entry_postings_item
