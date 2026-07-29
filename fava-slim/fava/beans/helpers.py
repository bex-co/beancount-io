"""Helpers for Beancount entries."""

from __future__ import annotations

from bisect import bisect_left
from operator import attrgetter
from typing import TYPE_CHECKING, Any, TypeVar


if TYPE_CHECKING:  # pragma: no cover
    import datetime
    from collections.abc import Sequence

    from .abc import Directive, Posting

    T = TypeVar("T", bound=Directive | Posting)


def replace[T: Directive | Posting](entry: T, **kwargs: Any) -> T:
    """Create a copy of the given directive, replacing some arguments."""
    if hasattr(entry, "_replace"):
        return entry._replace(**kwargs)  # type: ignore[no-any-return]
    msg = f"Could not replace attribute in type {type(entry)}"
    raise TypeError(msg)


_get_date = attrgetter("date")


def slice_entry_dates[T: Directive | Posting](entries: Sequence[T], begin: datetime.date, end: datetime.date) -> Sequence[T]:
    """Get slice of entries in a date window.

    Args:
        entries: A date-sorted list of dated directives.
        begin: The first date to include.
        end: One day beyond the last date.

    Returns:
        The slice between the given dates.
    """
    index_begin = bisect_left(entries, begin, key=_get_date)
    index_end = bisect_left(entries, end, key=_get_date)
    return entries[index_begin:index_end]
