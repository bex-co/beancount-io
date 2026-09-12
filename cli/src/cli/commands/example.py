"""`bea example` — delegate to upstream `bean-example`."""

from __future__ import annotations

import typer

from cli.engine import launch


def example(ctx: typer.Context) -> None:
    """Generate an example Beancount history (delegates to bean-example)."""
    code = launch.run_native("bean-example", list(ctx.args))
    raise typer.Exit(code)
