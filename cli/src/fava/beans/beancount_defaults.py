"""Platform-wide overrides of Beancount's built-in option defaults.

These change the *default* value used when a ledger does not set the option
itself; any explicit ``option "..."`` directive in the ledger still wins over
the default. Keep all Beancount.io default overrides here so they live in one
discoverable place.
"""

from __future__ import annotations

from beancount.parser import options as beancount_options


def apply_platform_option_defaults() -> None:
    """Override Beancount option defaults for all Beancount.io ledgers."""
    # Render thousands separators unless a ledger explicitly opts out with
    # `option "render_commas" "FALSE"`. Beancount's own default is False.
    beancount_options.OPTIONS_DEFAULTS["render_commas"] = True

    # Add future platform-wide option-default overrides below.
