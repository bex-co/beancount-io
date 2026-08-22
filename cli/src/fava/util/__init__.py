"""Utility functions for beancount-server."""

from __future__ import annotations

from functools import wraps
from typing import TYPE_CHECKING


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Callable, Iterable
    from typing import ParamSpec, TypeVar

    Item = TypeVar("Item")
    P = ParamSpec("P")


def listify[**P, Item](func: Callable[P, Iterable[Item]]) -> Callable[P, list[Item]]:
    """Make generator function return a list (decorator).

    This decorator converts a function that returns an iterable (like a generator)
    into a function that returns a list. This is useful when you want to ensure
    that the result is a concrete list rather than a generator.

    Args:
        func: A function that returns an iterable.

    Returns:
        A decorated function that returns a list instead of an iterable.

    Example:
        @listify
        def get_items():
            yield from range(5)

        result = get_items()  # Returns [0, 1, 2, 3, 4] instead of a generator
    """

    @wraps(func)
    def _wrapper(*args: P.args, **kwargs: P.kwargs) -> list[Item]:
        return list(func(*args, **kwargs))

    return _wrapper
