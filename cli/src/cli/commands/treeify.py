"""`bea treeify` — delegate to upstream `treeify`."""

from __future__ import annotations

import typer

from cli.engine import launch
from cli.errors import refuse_json


def treeify(ctx: typer.Context) -> None:
    """Render a hierarchical column as an ASCII tree (delegates to treeify)."""
    refuse_json("treeify", hint="Run without --json to print the ASCII tree.")
    code = launch.run_native("treeify", list(ctx.args))
    raise typer.Exit(code)
