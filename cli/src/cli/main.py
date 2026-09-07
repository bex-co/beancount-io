"""Beancount.io CLI entry point — the `bea` command."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Annotated, Any

import typer
from typer.core import TyperGroup

from cli import context, output, update
from cli.commands.add import add_app
from cli.commands.ask import ask
from cli.commands.auth import auth_app
from cli.commands.check import check
from cli.commands.format import format_beans
from cli.commands.ledger import ledger_app
from cli.commands.list import list_app
from cli.commands.query import query
from cli.commands.report import report_app
from cli.commands.upgrade import upgrade


class _GuardedGroup(TyperGroup):
    """Turn anything a command raises into the documented category and exit code.

    The failure contract belongs at the one point every command passes through.
    Pasted into each command body it would be optional, and a command whose
    author forgot it would exit with a traceback on stdout — off-contract in
    both shape and status, which is exactly what `--json` callers cannot parse.
    Click nests subcommand dispatch inside the root group's `invoke`, so this
    covers the mounted sub-apps too.
    """

    # `ctx` is typer's vendored click Context; typed loosely to avoid importing
    # a private module just to restate the supertype's annotation.
    def invoke(self, ctx: Any) -> Any:
        try:
            result = super().invoke(ctx)
        except (typer.Exit, typer.Abort):  # click's own control flow, not a failure
            raise
        except Exception as e:
            output.error(e)
        # After the command's own output, and only on the way out cleanly: a
        # courtesy line has no business interleaving with an error report.
        update.print_notice()
        return result


app = typer.Typer(
    name="bea",
    cls=_GuardedGroup,
    help="Beancount.io CLI — check, query, and edit beancount ledgers",
    no_args_is_help=True,
    rich_markup_mode=None,
    context_settings={"help_option_names": ["-h", "--help"]},
)


def _version_callback(value: bool) -> None:
    """Print the version and stop, without loading accounting code or touching the network."""
    if value:
        from cli.config import package_version

        version = package_version()
        typer.echo(f"bea {version}")
        # From the day-old cache only: `--version` is what scripts parse and
        # what people run when the network is the thing that is broken.
        update.print_version_hint(version, sys.argv[1:])
        raise typer.Exit()


@app.callback()
def main(
    file: Annotated[
        Path | None,
        typer.Option("--file", "-f", help="Ledger entry file (overrides $BEA_FILE and ./main.bean)"),
    ] = None,
    json_output: Annotated[bool, typer.Option("--json", help="Emit JSON on stdout and JSON errors on stderr")] = False,
    no_input: Annotated[bool, typer.Option("--no-input", help="Never prompt; fail instead of waiting")] = False,
    yes: Annotated[bool, typer.Option("--yes", "-y", help="Answer confirmations with yes")] = False,
    version: Annotated[
        bool,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show the version and exit"),
    ] = False,
) -> None:
    """Global options, resolved once for whichever command runs."""
    ctx = context.configure(file=file, json_output=json_output, no_input=no_input, yes=yes)
    # Started here, where the machine-mode options are already resolved, so the
    # check overlaps the command instead of delaying it.
    update.start(json_output=ctx.json_output, no_input=ctx.no_input)


app.command("check")(check)
app.command("format")(format_beans)
app.command("query")(query)
app.command("ask")(ask)
app.command("upgrade")(upgrade)

app.add_typer(auth_app, name="auth")
app.add_typer(ledger_app, name="ledger")
app.add_typer(add_app, name="add")
app.add_typer(list_app, name="list")
app.add_typer(report_app, name="report")

if __name__ == "__main__":
    app()
