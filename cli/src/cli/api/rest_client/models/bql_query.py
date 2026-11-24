from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="BqlQuery")


@_attrs_define
class BqlQuery:
    """A BQL query to run against the ledger

    Attributes:
        query (str): A Beancount Query Language statement Example: SELECT account, sum(position) GROUP BY account.
    """

    query: str

    def to_dict(self) -> dict[str, Any]:
        query = self.query

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "query": query,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        query = d.pop("query")

        bql_query = cls(
            query=query,
        )

        return bql_query
