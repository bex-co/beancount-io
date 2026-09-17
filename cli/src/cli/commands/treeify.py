"""`bea treeify` — delegate to upstream `treeify`."""

from __future__ import annotations

import sys

import typer

from cli.engine import launch
from cli.errors import UsageError, refuse_json

_NO_COLUMN = "Could not find any valid column in input"


def treeify(ctx: typer.Context) -> None:
    """Render a hierarchical column as an ASCII tree (delegates to treeify)."""
    refuse_json("treeify", hint="Run without --json to print the ASCII tree.")
    completed = launch.capture_native("treeify", list(ctx.args))
    if completed.returncode == 0 and _NO_COLUMN in (completed.stderr or ""):
        # Upstream echoes the input unchanged and calls that success; the
        # echo is not a tree, so it is not printed.
        sys.stderr.write(completed.stderr or "")
        raise UsageError(
            "treeify found no hierarchical column to render (colon-separated names like Assets:Cash). "
            "Pipe balances or an account listing, not plain text."
        )
    launch.check_native(completed, "treeify")
    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)
