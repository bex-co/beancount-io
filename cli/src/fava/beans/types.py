"""Typing helpers."""

from __future__ import annotations

from typing import TYPE_CHECKING, TypedDict

from ..helpers import BeancountError
from .abc import Directive


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Sequence

    from beancount.core.display_context import DisplayContext


class BeancountOptions(TypedDict):
    """Beancount options."""

    title: str
    filename: str
    name_assets: str
    name_liabilities: str
    name_equity: str
    name_income: str
    name_expenses: str
    account_current_conversions: str
    account_current_earnings: str
    render_commas: bool
    operating_currency: Sequence[str]
    documents: Sequence[str]
    include: Sequence[str]
    dcontext: DisplayContext


LoaderResult = tuple[
    list[Directive],
    list[BeancountError],
    BeancountOptions,
]
