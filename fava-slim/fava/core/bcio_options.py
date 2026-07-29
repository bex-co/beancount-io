"""Beancount.io custom options.

Options specific to the beancount.io platform that can be specified through
Custom entries in the Beancount file. Unlike fava-option, these options are
designed for a git-remote filesystem rather than a local filesystem.

Format::

    2000-01-01 custom "beancountio-option" "option-name" "value"

"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from ..helpers import BeancountError


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Sequence

    from ..beans.abc import Custom


class BcioOptionError(BeancountError):
    """An error for one of the beancount.io options."""


class MissingBcioOptionError(ValueError):
    def __init__(self) -> None:
        super().__init__("Custom entry is missing option name.")


class UnknownBcioOptionError(ValueError):
    def __init__(self, key: str) -> None:
        super().__init__(f"Unknown beancountio-option `{key}`")


class NotAStringBcioOptionError(TypeError):
    def __init__(self, key: str) -> None:
        super().__init__(f"Expected string value for beancountio-option `{key}`")


_STR_OPTS = {
    "default_file",
    "transaction_file",
    "account_file",
    "price_file",
    "balance_file",
    "note_file",
    "pad_file",
    "budget_file",
    "receipt_base_folder",
    "receipt_storage",
    "document_file",
}

_ALL_OPTS = _STR_OPTS


@dataclass
class BcioOptions:
    """Options for beancount.io that can be set in the Beancount file.

    All file path options support date-based template variables resolved using
    the entry's own date:
      - {year}    — 4-digit calendar year (e.g. 2025)
      - {month}   — zero-padded month (e.g. 03)
      - {quarter} — quarter number (e.g. 1)
      - {date}    — full ISO 8601 date (e.g. 2025-03-15)

    The ledger layer exposes these raw option values. File routing logic
    (resolving which file to use for a given entry type and date) is
    performed by the backend-v2 layer, not here.
    """

    default_file: str = "main.bean"
    transaction_file: str | None = None
    account_file: str | None = None
    price_file: str | None = None
    balance_file: str | None = None
    note_file: str | None = None
    pad_file: str | None = None
    budget_file: str | None = None
    receipt_base_folder: str | None = None
    receipt_storage: str | None = None
    document_file: str | None = None


def parse_bcio_option_custom_entry(entry: Custom, options: BcioOptions) -> None:
    """Parse a single custom beancountio-option entry and set option accordingly."""
    key = str(entry.values[0].value).replace("-", "_")
    if key not in _ALL_OPTS:
        raise UnknownBcioOptionError(key)

    value = entry.values[1].value if len(entry.values) > 1 else ""
    if not isinstance(value, str):
        raise NotAStringBcioOptionError(key)

    # All current options are string type
    setattr(options, key, value)


def parse_bcio_options(
    custom_entries: Sequence[Custom],
) -> tuple[BcioOptions, list[BcioOptionError]]:
    """Parse custom entries for beancount.io options.

    The format for option entries is the following::

        2000-01-01 custom "beancountio-option" "[name]" "[value]"

    Args:
        custom_entries: A list of Custom entries.

    Returns:
        A tuple (options, errors) where options is a BcioOptions instance and
        errors contains possible parsing errors.
    """
    options = BcioOptions()
    errors: list[BcioOptionError] = []

    for entry in (e for e in custom_entries if e.type == "beancountio-option"):
        try:
            if not entry.values:
                raise MissingBcioOptionError
            parse_bcio_option_custom_entry(entry, options)
        except (IndexError, TypeError, ValueError) as err:
            msg = f"Failed to parse beancountio-option entry: {err!s}"
            errors.append(BcioOptionError(entry.meta, msg, entry))

    return options, errors
