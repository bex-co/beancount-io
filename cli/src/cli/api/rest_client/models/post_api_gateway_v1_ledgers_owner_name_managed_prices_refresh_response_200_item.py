from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_freshness import (
    PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemFreshness,
)

if TYPE_CHECKING:
    from ..models.post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_included_from_item import (
        PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem,
    )


T = TypeVar("T", bound="PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200Item")


@_attrs_define
class PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200Item:
    """
    Attributes:
        url (str):
        alias (str):
        included_from (list[PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem]):
        commodity (None | str):
        quote (None | str):
        source (None | str):
        revision (None | str):
        etag (None | str):
        observed_at (None | str):
        fetched_at (None | str):
        next_refresh_at (None | str):
        freshness (PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemFreshness):
        error (None | str):
        shadowed_count (int):
    """

    url: str
    alias: str
    included_from: list[PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem]
    commodity: None | str
    quote: None | str
    source: None | str
    revision: None | str
    etag: None | str
    observed_at: None | str
    fetched_at: None | str
    next_refresh_at: None | str
    freshness: PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemFreshness
    error: None | str
    shadowed_count: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        url = self.url

        alias = self.alias

        included_from = []
        for included_from_item_data in self.included_from:
            included_from_item = included_from_item_data.to_dict()
            included_from.append(included_from_item)

        commodity: None | str
        commodity = self.commodity

        quote: None | str
        quote = self.quote

        source: None | str
        source = self.source

        revision: None | str
        revision = self.revision

        etag: None | str
        etag = self.etag

        observed_at: None | str
        observed_at = self.observed_at

        fetched_at: None | str
        fetched_at = self.fetched_at

        next_refresh_at: None | str
        next_refresh_at = self.next_refresh_at

        freshness = self.freshness.value

        error: None | str
        error = self.error

        shadowed_count = self.shadowed_count

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "url": url,
                "alias": alias,
                "includedFrom": included_from,
                "commodity": commodity,
                "quote": quote,
                "source": source,
                "revision": revision,
                "etag": etag,
                "observedAt": observed_at,
                "fetchedAt": fetched_at,
                "nextRefreshAt": next_refresh_at,
                "freshness": freshness,
                "error": error,
                "shadowedCount": shadowed_count,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item_included_from_item import (
            PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem,  # noqa: PLC0415
        )

        d = dict(src_dict)
        url = d.pop("url")

        alias = d.pop("alias")

        included_from = []
        _included_from = d.pop("includedFrom")
        for included_from_item_data in _included_from:
            included_from_item = (
                PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemIncludedFromItem.from_dict(
                    included_from_item_data
                )
            )

            included_from.append(included_from_item)

        def _parse_commodity(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        commodity = _parse_commodity(d.pop("commodity"))

        def _parse_quote(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        quote = _parse_quote(d.pop("quote"))

        def _parse_source(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        source = _parse_source(d.pop("source"))

        def _parse_revision(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        revision = _parse_revision(d.pop("revision"))

        def _parse_etag(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        etag = _parse_etag(d.pop("etag"))

        def _parse_observed_at(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        observed_at = _parse_observed_at(d.pop("observedAt"))

        def _parse_fetched_at(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        fetched_at = _parse_fetched_at(d.pop("fetchedAt"))

        def _parse_next_refresh_at(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        next_refresh_at = _parse_next_refresh_at(d.pop("nextRefreshAt"))

        freshness = PostApiGatewayV1LedgersOwnerNameManagedPricesRefreshResponse200ItemFreshness(d.pop("freshness"))

        def _parse_error(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        error = _parse_error(d.pop("error"))

        shadowed_count = d.pop("shadowedCount")

        post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item = cls(
            url=url,
            alias=alias,
            included_from=included_from,
            commodity=commodity,
            quote=quote,
            source=source,
            revision=revision,
            etag=etag,
            observed_at=observed_at,
            fetched_at=fetched_at,
            next_refresh_at=next_refresh_at,
            freshness=freshness,
            error=error,
            shadowed_count=shadowed_count,
        )

        post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item.additional_properties = d
        return post_api_gateway_v1_ledgers_owner_name_managed_prices_refresh_response_200_item

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
