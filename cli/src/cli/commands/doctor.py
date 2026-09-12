"""`bea doctor` — delegate to upstream `bean-doctor` in the engine environment."""

from __future__ import annotations

import typer

from cli.engine import launch

doctor_app = typer.Typer(
    name="doctor",
    help="Beancount diagnostics (delegates to bean-doctor).",
    no_args_is_help=True,
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
)

_OPS = (
    "lex",
    "parse",
    "roundtrip",
    "directories",
    "list-options",
    "print-options",
    "context",
    "linked",
    "region",
    "missing-open",
    "display-context",
)


def _forward(op: str, ctx: typer.Context) -> None:
    """Pass remaining argv through to bean-doctor unchanged."""
    code = launch.run_native("bean-doctor", [op, *ctx.args])
    raise typer.Exit(code)


def _register(op: str) -> None:
    help_text = f"Run bean-doctor {op}."

    @doctor_app.command(op, help=help_text, context_settings={"allow_extra_args": True, "ignore_unknown_options": True})
    def _cmd(ctx: typer.Context) -> None:
        _forward(op, ctx)


for _op in _OPS:
    _register(_op)


@doctor_app.command("dump-lexer", context_settings={"allow_extra_args": True, "ignore_unknown_options": True})
def dump_lexer(ctx: typer.Context) -> None:
    """Alias for bean-doctor lex."""
    _forward("lex", ctx)
