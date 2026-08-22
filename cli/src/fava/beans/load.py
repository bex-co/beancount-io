"""Load Beancount files and strings."""

from __future__ import annotations

from typing import TYPE_CHECKING

from beancount import loader

from .beancount_defaults import apply_platform_option_defaults


if TYPE_CHECKING:  # pragma: no cover
    from .types import LoaderResult


# Apply Web Beancount's platform-wide overrides of Beancount option defaults
# (see beancount_defaults.py) before any ledger is loaded.
apply_platform_option_defaults()


def load_string(value: str) -> LoaderResult:
    """Load a Beancoun string."""
    return loader.load_string(value)  # type: ignore[return-value]


def load_uncached(
    beancount_file_path: str,
    *,
    is_encrypted: bool,
) -> LoaderResult:
    """Load a Beancount file."""
    if is_encrypted:  # pragma: no cover
        return loader.load_file(beancount_file_path)  # type: ignore[return-value]

    return loader._load(  # type: ignore[return-value]
        [(beancount_file_path, True)],
        None,
        None,
        None,
    )
