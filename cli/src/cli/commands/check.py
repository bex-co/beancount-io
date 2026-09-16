"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    if current.json_output:
        # Keep bea's documented JSON envelope; native --json is a different shape.
        # bean-check-only flags (-v, --auto, …) are not implemented on bea-engine
        # check — refuse them up front as usage, not as a false "engine did not answer".
        if ctx.args:
            tokens = " ".join(ctx.args)
            raise UsageError(
                f"bea --json check does not accept bean-check options ({tokens}). "
                "Drop --json to use native bean-check flags such as -v / --auto."
            )
        data = launch.helper_json(["check", "--file", str(file)])
        output.emit(data, target=output.file_target(file))
        return
    code = launch.run_native("bean-check", [str(file), *ctx.args])
    raise typer.Exit(code)
