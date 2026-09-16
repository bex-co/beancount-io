"""`bea example` — delegate to upstream `bean-example`."""

from __future__ import annotations

import typer

from cli.engine import launch
from cli.errors import refuse_json


def example(ctx: typer.Context) -> None:
    """Generate an example Beancount history (delegates to bean-example)."""
    refuse_json("example", hint="Run without --json to print the sample ledger.")
    code = launch.run_native("bean-example", list(ctx.args))
    raise typer.Exit(code)
