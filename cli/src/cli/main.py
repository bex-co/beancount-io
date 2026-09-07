"""Beancount.io CLI entry point — the `bea` command."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context
from cli.commands.add import add_app
from cli.commands.ask import ask
from cli.commands.auth import auth_app
from cli.commands.check import check
from cli.commands.format import format_beans
from cli.commands.ledger import ledger_app
from cli.commands.list import list_app
from cli.commands.query import query
from cli.commands.report import report_app

app = typer.Typer(
    name="bea",
    help="Beancount.io CLI — check, query, and edit beancount ledgers",
    no_args_is_help=True,
    rich_markup_mode=None,
    context_settings={"help_option_names": ["-h", "--help"]},
)


def _version_callback(value: bool) -> None:
    """Print the version and stop, without loading accounting code or touching the network."""
    if value:
        from cli.config import package_version

        typer.echo(f"bea {package_version()}")
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
    context.configure(file=file, json_output=json_output, no_input=no_input, yes=yes)


app.command("check")(check)
app.command("format")(format_beans)
app.command("query")(query)
app.command("ask")(ask)

app.add_typer(auth_app, name="auth")
app.add_typer(ledger_app, name="ledger")
app.add_typer(add_app, name="add")
app.add_typer(list_app, name="list")
app.add_typer(report_app, name="report")

if __name__ == "__main__":
    app()
