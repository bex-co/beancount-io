"""Beancount CLI entry point."""

from __future__ import annotations

import typer

from cli.commands.auth import auth_app
from cli.commands.chat import chat
from cli.commands.check import check
from cli.commands.format import format_beans
from cli.commands.ledger import ledger_app
from cli.commands.query import query
from cli.commands.read import read_app
from cli.commands.report import report_app
from cli.commands.write import write_app

app = typer.Typer(
    name="beancount-cli",
    help="Beancount.io CLI — manage ledgers and write directives",
    no_args_is_help=True,
    rich_markup_mode=None,
    context_settings={"help_option_names": ["-h", "--help"]},
)

app.command("check")(check)
app.command("format")(format_beans)
app.command("query")(query)
app.command("chat")(chat)

app.add_typer(auth_app, name="auth")
app.add_typer(ledger_app, name="ledger")
app.add_typer(write_app, name="write")
app.add_typer(read_app, name="read")
app.add_typer(report_app, name="report")

if __name__ == "__main__":
    app()
