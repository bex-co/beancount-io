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
from cli.commands.check import check
from cli.commands.cloud.app import cloud_app
from cli.commands.format import format_beans
from cli.commands.import_ import import_entries
from cli.commands.init import init
from cli.commands.list import list_app
from cli.commands.query import query
from cli.commands.report import report_app
from cli.commands.upgrade import current_channel, upgrade
from cli.completion import install as install_completion_callback
from cli.completion import show as show_completion_callback


class _GuardedGroup(TyperGroup):
    """Turn anything a command raises into the documented category and exit code.

    The failure contract belongs at the one point every command passes through.
    Pasted into each command body it would be optional, and a command whose
    author forgot it would exit with a traceback on stdout — off-contract in
    both shape and status, which is exactly what `--json` callers cannot parse.
    Click nests subcommand dispatch inside the root group's `invoke`, so this
    covers the mounted sub-apps too.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        from typer.completion import get_completion_inspect_parameters

        # Custom completion flags still need Typer's shell protocol handlers.
        get_completion_inspect_parameters()
        super().__init__(*args, **kwargs)

    # `ctx` is typer's vendored click Context; typed loosely to avoid importing
    # a private module just to restate the supertype's annotation.
    def parse_args(self, ctx: Any, args: list[str]) -> list[str]:
        # Parse global switches before command resolution can fail. Use Click's
        # parser so --file=--json and arguments following -- remain values.
        resilient, ignore_unknown = ctx.resilient_parsing, ctx.ignore_unknown_options
        try:
            ctx.resilient_parsing = True
            ctx.ignore_unknown_options = True
            opts, _, _ = self.make_parser(ctx).parse_args(list(args))
        finally:
            ctx.resilient_parsing, ctx.ignore_unknown_options = resilient, ignore_unknown
        context.configure(
            json_output=bool(opts.get("json_output")),
            no_input=bool(opts.get("no_input")),
            yes=bool(opts.get("yes")),
            debug=bool(opts.get("debug")),
            strict=bool(opts.get("strict")),
        )
        ctx.meta["completion_shell"] = opts.get("shell")
        try:
            return super().parse_args(ctx, list(args))
        except (typer.Exit, typer.Abort):
            raise
        except Exception as exc:
            if not args:  # Keep the normal no-arguments help page.
                raise
            output.error(exc)

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

    def format_commands(self, ctx: Any, formatter: Any) -> None:
        """Render the command list grouped by `rich_help_panel`.

        The panel metadata carries the local/cloud boundary, but with
        `rich_markup_mode=None` typer renders help through plain click, which
        ignores it — so the grouping has to happen here for `--help` to show
        which commands stay on disk and which talk to the hosted service.
        """
        commands = [
            (name, cmd)
            for name in self.list_commands(ctx)
            if (cmd := self.get_command(ctx, name)) is not None and not cmd.hidden
        ]
        if not commands:
            return
        limit = formatter.width - 6 - max(len(name) for name, _ in commands)
        panels: dict[str, list[tuple[str, str]]] = {}
        for name, cmd in commands:
            panel = getattr(cmd, "rich_help_panel", None) or "Commands"
            panels.setdefault(panel, []).append((name, cmd.get_short_help_str(limit)))
        for title, rows in panels.items():
            with formatter.section(title):
                formatter.write_dl(rows)


app = typer.Typer(
    name="bea",
    cls=_GuardedGroup,
    help="Beancount.io CLI — check, query, and edit beancount ledgers",
    no_args_is_help=True,
    rich_markup_mode=None,
    add_completion=False,
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
        update.print_version_hint(version, sys.argv[1:], channel=current_channel().name)
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
    debug: Annotated[bool, typer.Option("--debug", help="Include exception tracebacks in errors")] = False,
    strict: Annotated[
        bool, typer.Option("--strict", help="Refuse partial answers even in a terminal; --allow-errors opts in")
    ] = False,
    shell: Annotated[
        str | None, typer.Option("--shell", help="Completion shell: bash, zsh, fish, powershell or pwsh")
    ] = None,
    show_completion: Annotated[
        bool,
        typer.Option(
            "--show-completion",
            callback=show_completion_callback,
            is_eager=True,
            help="Print completion script; detects the shell unless --shell is supplied",
        ),
    ] = False,
    install_completion: Annotated[
        bool,
        typer.Option(
            "--install-completion",
            callback=install_completion_callback,
            is_eager=True,
            help="Install shell completion; optionally select --shell",
        ),
    ] = False,
    version: Annotated[
        bool,
        typer.Option("--version", callback=_version_callback, is_eager=True, help="Show the version and exit"),
    ] = False,
) -> None:
    """Global options, resolved once for whichever command runs."""
    del shell, show_completion, install_completion  # Handled by the completion callbacks.
    ctx = context.configure(file=file, json_output=json_output, no_input=no_input, yes=yes, debug=debug, strict=strict)
    # Started here, where the machine-mode options are already resolved, so the
    # check overlaps the command instead of delaying it.
    update.start(json_output=ctx.json_output, no_input=ctx.no_input, channel=current_channel().name)


# `ask` is local despite its hosted model calls — the task-verb rule in
# cli/CLAUDE.md keeps every verb over .bean files out of `cloud`. `upgrade`
# is about the tool itself (PyPI/Homebrew), so it is neither local nor cloud.
_LOCAL_PANEL = "Local ledger commands (work on .bean files)"
_CLOUD_PANEL = "Cloud commands (beancount.io — need 'bea cloud login' or BEA_TOKEN)"
_SELF_PANEL = "CLI maintenance"

app.command("check", rich_help_panel=_LOCAL_PANEL)(check)
app.command("init", rich_help_panel=_LOCAL_PANEL)(init)
app.command("import", rich_help_panel=_LOCAL_PANEL)(import_entries)
app.command("format", rich_help_panel=_LOCAL_PANEL)(format_beans)
app.command("query", rich_help_panel=_LOCAL_PANEL)(query)
app.command("ask", rich_help_panel=_LOCAL_PANEL)(ask)

app.add_typer(add_app, name="add", rich_help_panel=_LOCAL_PANEL)
app.add_typer(list_app, name="list", rich_help_panel=_LOCAL_PANEL)
app.add_typer(report_app, name="report", rich_help_panel=_LOCAL_PANEL)

app.add_typer(cloud_app, name="cloud", rich_help_panel=_CLOUD_PANEL)

app.command("upgrade", rich_help_panel=_SELF_PANEL)(upgrade)

if __name__ == "__main__":
    app()
