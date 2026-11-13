"""What in an existing ledger needs attention before an agent uses it (w1/m42/t003).

`bea init --existing` reads a ledger bea did not create. Its `bea check` result
is accurate but written for someone who already knows the engine: a plugin
that will not import is an error like any other. This turns the
`bea-engine describe` answer into a short list, one item per problem, each
with the one next step that fits where the problem comes from. It installs
nothing and writes nothing.
"""

from __future__ import annotations

import os
from typing import Any

#: How many errors other than plugins and options the text report shows.
SHOWN_ERRORS = 5


def attention(description: dict[str, Any], check_command: str) -> list[dict[str, str]]:
    """Each problem as `{kind, location, subject, message, next}`; empty for a clean ledger."""
    folder = os.path.dirname(description["root"])
    version = description["beancount_version"]
    items: list[dict[str, str]] = []
    for plugin in description["plugins"]:
        if plugin["loaded"]:
            continue
        name = plugin["name"]
        top = name.split(".", 1)[0]
        if plugin["failed_while_running"]:
            kind, message, step = (
                "plugin-failed",
                f"Plugin `{name}` loaded but failed while running.",
                "Fix the plugin's code or its configuration string; `bea check` shows its error.",
            )
        elif plugin["source"] == "beancount":
            kind, message, step = (
                "plugin-not-in-beancount",
                f"Plugin `{name}` is not part of Beancount {version}; "
                "Beancount 2 shipped plugins that Beancount 3 dropped.",
                "Remove the plugin line, or replace it with a Beancount 3 plugin that does the same.",
            )
        elif plugin["source"] == "beside-ledger":
            kind, message, step = (
                "plugin-beside-ledger",
                f"Plugin `{name}` is the module `{top}` in this folder. bea never imports from the "
                "working directory, so it loads only through PYTHONPATH.",
                f"Run bea from this folder with PYTHONPATH=. set: {check_command}",
            )
        else:
            kind, message, step = (
                "plugin-package-missing",
                f"Plugin `{name}` needs the Python package `{top}`, which bea's managed engine does not "
                "include. No bea command installs third-party packages into it.",
                "Under bea the plugin does not run and the rest of the ledger still loads; remove the plugin "
                "line to use the ledger with bea without that error.",
            )
        location = _location(plugin["file"] or description["root"], plugin["line"], folder)
        items.append({"kind": kind, "location": location, "subject": name, "message": message, "next": step})
    for error in description["errors"]:
        location = _location(error["file"], error["line"], folder)
        if error["option"] is not None:
            items.append(
                {
                    "kind": "option-unknown",
                    "location": location,
                    "subject": error["option"],
                    "message": f'Beancount {version} has no option "{error["option"]}"; '
                    "Beancount 2 had options that Beancount 3 removed or renamed.",
                    "next": "Remove the option line, or replace it with its Beancount 3 name.",
                }
            )
        else:
            items.append(
                {"kind": "error", "location": location, "subject": "", "message": error["message"], "next": ""}
            )
    # Plugins first, then options, then the rest, each in ledger order.
    order = {"option-unknown": 1, "error": 2}
    return sorted(items, key=lambda item: order.get(item["kind"], 0))


def render(items: list[dict[str, str]], check_command: str) -> list[str]:
    """The text lines `bea init --existing` prints under "Needs attention"."""
    if not items:
        return []
    explained = [item for item in items if item["kind"] != "error"]
    errors = [item for item in items if item["kind"] == "error"]
    lines = ["Needs attention before an agent works on this ledger:"]
    for item in explained:
        lines.append(f"  {item['location']}: {item['message']}")
        lines.append(f"    Next: {item['next']}")
    for item in errors[:SHOWN_ERRORS]:
        lines.append(f"  {item['location']}: {item['message']}")
    if errors:
        more = f"{len(errors) - SHOWN_ERRORS} more; " if len(errors) > SHOWN_ERRORS else ""
        lines.append(f"    Next: {more}see every error with {check_command}")
    return lines


def _location(path: str, line: int | None, folder: str) -> str:
    """`path:line`, the path relative to the ledger folder when it is inside it."""
    try:
        shown = os.path.relpath(path, folder)
    except ValueError:
        shown = path
    if shown.startswith(".."):
        shown = path
    return f"{shown}:{line}" if line else shown
