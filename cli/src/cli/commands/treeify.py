"""`bea treeify` — delegate to upstream `treeify`."""

from __future__ import annotations

import typer

from cli.engine import launch


def treeify(ctx: typer.Context) -> None:
    """Render a hierarchical column as an ASCII tree (delegates to treeify)."""
    code = launch.run_native("treeify", list(ctx.args))
    raise typer.Exit(code)
