"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

import typer

from cli import context, output
from cli.engine import launch


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    if current.json_output:
        # Keep bea's documented JSON envelope; native --json is a different shape.
        data = launch.helper_json(["check", "--file", str(file), *ctx.args])
        output.emit(data, target=output.file_target(file))
        return
    code = launch.run_native("bean-check", [str(file), *ctx.args])
    raise typer.Exit(code)
