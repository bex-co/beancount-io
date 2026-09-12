"""`bea-engine` — the Beancount.io engine helper.

This package is the Beancount side of the ADR014 process boundary. It ships in
the `beancount-io-engine` distribution (`cli/engine/pyproject.toml`) together
with the vendored Fava reporting code, and it is the only place allowed to
import `beancount`, `beanquery` or `fava`. The `bea` frontend reaches it by
spawning a child process and reading one JSON object back; it never imports
anything from here.

`README.md` in this directory is the command protocol.
"""

from __future__ import annotations

# What `version()` answers when the helper runs from a checkout instead of an
# installed wheel, which is the normal case while developing. It duplicates the
# version in `engine/pyproject.toml` and `engine/manifest.json` because a
# checkout has no distribution metadata to read; `tests/test_engine_helper.py`
# fails if the three ever disagree.
FALLBACK_VERSION = "0.1.0"


def version() -> str:
    """The installed engine version, or `FALLBACK_VERSION` in a checkout."""
    from importlib.metadata import PackageNotFoundError
    from importlib.metadata import version as installed_version

    try:
        return installed_version("beancount-io-engine")
    except PackageNotFoundError:
        return FALLBACK_VERSION
