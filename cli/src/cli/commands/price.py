"""`bea price` — fetch quotes through upstream `bean-price` in the engine.

Requires `bea engine enable beanprice`. This is quote retrieval only: it prints
price directives (or dry-run job lists) the way bean-price does. Recording a
supplied quote remains `bea add price` and does not need Beanprice.
"""

from __future__ import annotations

import typer

from cli.engine import launch
from cli.errors import refuse_json


def price(ctx: typer.Context) -> None:
    """Fetch prices via bean-price (requires 'bea engine enable beanprice')."""
    refuse_json("price", hint="Run without --json to print price directives.")
    code = launch.run_optional_native("beanprice", "bean-price", list(ctx.args))
    raise typer.Exit(code)
