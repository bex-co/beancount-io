"""`bea query` — BQL in the engine process (ADR014 t005).

Every mode is a child process. A query string runs through the helper's `query`
command, which dispatches it the way `bean-query` does — so `PRINT` prints
directives instead of a `ROW(*)` table — and answers with either upstream's own
rendering or the rows themselves. No query string opens the helper's `shell`
command with the streams inherited, which is upstream's interactive shell on
the customer's terminal.

The frontend keeps what it has always owned: which ledger, whether a read that
found load errors may answer anyway (`--allow-errors`, `--strict`), and the
JSON envelope. It keeps none of the accounting: there is no connection, no
result rendering and no `BQLShell` subclass here any more.
"""

from __future__ import annotations

import sys
from typing import Annotated

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError

FORMATS = ("text", "csv", "beancount")


def query(
    query_string: Annotated[str | None, typer.Argument(help="BQL query (omit to read stdin or open the shell)")] = None,
    source: Annotated[
        str | None, typer.Option("--source", help="Native Beanquery source URI; delegates directly to bean-query")
    ] = None,
    allow_errors: Annotated[
        bool,
        typer.Option("--allow-errors", help="Answer with errors on stderr; opts strict reads into partial answers"),
    ] = False,
    output_format: Annotated[
        str, typer.Option("--format", "-f", help=f"Rendering for a printed result: {', '.join(FORMATS)}")
    ] = "text",
    output_file: Annotated[
        str | None, typer.Option("--output", "-o", help="Write the result to this file instead of stdout")
    ] = None,
    numberify: Annotated[
        bool, typer.Option("--numberify", "-m", help="Split amounts into one column per currency")
    ] = False,
    no_errors: Annotated[bool, typer.Option("--no-errors", "-q", help="Hide ledger load errors")] = False,
) -> None:
    """Run BQL queries against a local ledger.

    With a query string, print the table; without one, read BQL from stdin
    or open the interactive shell when stdin is a terminal.
    """
    ctx = context.current()
    if output_format not in FORMATS:
        raise UsageError(f"Unknown query format '{output_format}'. Choose one of: {', '.join(FORMATS)}.")
    if output_file == "-":
        output_file = None

    rendering = ["--format", output_format]
    if output_file is not None:
        rendering += ["--output", output_file]
    if numberify:
        rendering.append("--numberify")
    if no_errors:
        rendering.append("--no-errors")
    if source is not None:
        if ctx.json_output or ctx.strict:
            raise UsageError("--source uses native Beanquery output; --json and --strict require a local --file.")
        native_args = [*rendering, source]
        if query_string is not None:
            native_args.append(query_string)
        raise typer.Exit(launch.run_native("bean-query", native_args))

    file = ctx.entry_file()
    if not query_string:
        if not sys.stdin.isatty():
            query_string = sys.stdin.read()
            if not query_string.strip():
                raise UsageError("A query is required as an argument or on stdin.")
        elif ctx.no_input:
            raise UsageError("A query is required with --no-input. Pass it as an argument or on stdin.")
        else:
            raise typer.Exit(launch.run_engine_argv(["shell", "--file", str(file), *rendering]))

    # `--allow-errors` / `--strict` are frontend policy; the engine enforces
    # them before running the query so a total from a broken ledger is never
    # computed.
    args = ["query", "--file", str(file), query_string]
    args += ["--format", "json" if ctx.json_output else output_format]
    if allow_errors or not ctx.strict_reads():
        args.append("--allow-errors")
    if output_file is not None:
        args += ["--output", output_file]
    if numberify:
        args.append("--numberify")

    data = launch.helper_json(args)
    if not no_errors:
        output.render_ledger_errors([str(error) for error in data.get("errors", [])], allow=True)

    if ctx.json_output:
        output.emit(
            {"columns": data.get("columns", []), "rows": data.get("rows", [])},
            target=output.file_target(file),
        )
        return
    text = str(data.get("text", ""))
    if text:
        # `end=""`: the renderer's own trailing newline is part of the table.
        typer.echo(text, nl=False)
