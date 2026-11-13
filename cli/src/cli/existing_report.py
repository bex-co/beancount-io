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
    items: list[dict[str, str]] = []
    for plugin in description["plugins"]:
        if plugin["loaded"]:
            continue
        name = plugin["name"]
        location = _relative(plugin["location"] or description["root"], folder)
        top = name.split(".", 1)[0]
        if plugin["failed_while_running"]:
            item = (
                "plugin-failed",
                f"Plugin `{name}` loaded but failed while running.",
                "Fix the plugin's code or its configuration string; `bea check` shows its error.",
            )
        elif plugin["source"] == "beancount":
            item = (
                "plugin-not-in-beancount",
                f"Plugin `{name}` is not part of Beancount {description['beancount_version']}; "
                "Beancount 2 shipped plugins that Beancount 3 dropped.",
                "Remove the plugin line, or replace it with a Beancount 3 plugin that does the same.",
            )
        elif plugin["source"] == "beside-ledger":
            item = (
                "plugin-beside-ledger",
                f"Plugin `{name}` is the module `{top}` in this folder. bea never imports from the "
                "working directory, so it loads only through PYTHONPATH.",
                f"Run bea from this folder with PYTHONPATH=. set: {check_command}",
            )
        else:
            item = (
                "plugin-package-missing",
                f"Plugin `{name}` needs the Python package `{top}`, which bea's managed engine does not "
                "include. No bea command installs third-party packages into it.",
                "Under bea the plugin does not run and the rest of the ledger still loads; remove the plugin "
                "line to use the ledger with bea without that error.",
            )
        kind, message, step = item
        items.append({"kind": kind, "location": location, "subject": name, "message": message, "next": step})
    for option in description.get("unknown_options") or ():
        items.append(
            {
                "kind": "option-unknown",
                "location": _relative(option["location"], folder),
                "subject": option["name"],
                "message": f'Beancount {description["beancount_version"]} has no option "{option["name"]}"; '
                "Beancount 2 had options that Beancount 3 removed or renamed.",
                "next": "Remove the option line, or replace it with its Beancount 3 name.",
            }
        )
    flagged = {option["location"] for option in description.get("unknown_options") or ()}
    for line in description["errors"]:
        location, _, message = line.partition(": ")
        if location in flagged:
            continue
        items.append(
            {
                "kind": "error",
                "location": _relative(location, folder),
                "subject": "",
                "message": message or line,
                "next": "",
            }
        )
    return items


def render(items: list[dict[str, str]], check_command: str) -> list[str]:
    """The text lines `bea init --existing` prints under "Needs attention"."""
    if not items:
        return []
    lines = ["Needs attention before an agent works on this ledger:"]
    errors = [item for item in items if item["kind"] == "error"]
    for item in items:
        if item["kind"] == "error":
            continue
        lines.append(f"  {item['location']}: {item['message']}")
        lines.append(f"    Next: {item['next']}")
    for item in errors[:SHOWN_ERRORS]:
        lines.append(f"  {item['location']}: {item['message']}")
    if errors:
        more = f"{len(errors) - SHOWN_ERRORS} more; " if len(errors) > SHOWN_ERRORS else ""
        lines.append(f"    Next: {more}see every error with {check_command}")
    return lines


def _relative(location: str, folder: str) -> str:
    """`location` (`path` or `path:line`) with the path relative to the ledger folder when it is inside it."""
    path, sep, line = location.rpartition(":")
    if not sep or not line.isdigit():
        path, line = location, ""
    try:
        shown = os.path.relpath(path, folder)
    except ValueError:
        shown = path
    if shown.startswith(".."):
        shown = path
    return f"{shown}:{line}" if line else shown
