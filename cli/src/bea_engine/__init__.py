"""Ledger helper bundled with beancount-io; invoked only in a child process."""

FALLBACK_VERSION = "0.2.0"


def version() -> str:
    """Version of the bundled helper, kept in sync with the bea release."""
    return FALLBACK_VERSION
