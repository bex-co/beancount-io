"""Pinned upstream interfaces, available without provisioning or frontend imports."""

from __future__ import annotations

import json
from functools import cache
from pathlib import Path


@cache
def _commands() -> dict[str, str]:
    data = json.loads((Path(__file__).parent / "engine/native-help.json").read_text())
    return dict(data["commands"])


def native_help(command: str) -> str:
    """Append upstream usage verbatim while keeping bea's own options above it."""
    note = "Native interface (arguments/options are forwarded by bea):"
    if command == "check":
        note = "Native interface: FILENAME comes from bea --file; use global --json for bea's JSON envelope."
    return note + "\n\n\b\n" + _commands()[command].replace("\n\n", "\n\n\b\n")
