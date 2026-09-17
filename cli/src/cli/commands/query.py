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
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError

FORMATS = ("text", "csv", "beancount")

# Bare names that PreciseShell rewrites to dot commands (beanquery deprecates
# the undotted forms). Any leading-`.` token also goes through the shell.
_SHELL_ALIASES = frozenset({"clear", "errors", "exit", "help", "history", "parse", "quit", "run", "set"})


def _refuse_one_shot_output(query_string: str) -> None:
    """Refuse a one-shot `.output`, which writes nothing and reports success.

    The interactive shell redirects later queries into the file, but a
    one-shot runs a single command: `.output FILE` alone opens and truncates
    the path, then exits 0 with a 0-byte artifact. The supported one-shot form
    carries the query and the destination together.
    """
    words = query_string.strip().lower().split(None, 1)
    if words and words[0] == ".output":
        raise UsageError(
            "One-shot `.output` writes nothing: pass the query with `--output FILE` instead, "
            "as in `bea query --output FILE 'SELECT …'`."
        )


def _split_statements(query_string: str) -> list[str]:
    """Split a one-shot query on top-level semicolons, honoring quotes."""
    statements: list[str] = []
    current: list[str] = []
    quote: str | None = None
    escaped = False
    for char in query_string:
        if escaped:
            current.append(char)
            escaped = False
        elif quote is not None and char == "\\":
            current.append(char)
            escaped = True
        elif quote is not None and char == quote:
            current.append(char)
            quote = None
        elif quote is None and char in "\"'":
            current.append(char)
            quote = char
        elif quote is None and char == ";":
            statements.append("".join(current))
            current = []
        else:
            current.append(char)
    statements.append("".join(current))
    return [part for part in (piece.strip() for piece in statements) if part]


def _refuse_multi_statement(query_string: str) -> None:
    """Refuse a one-shot carrying two BQL statements when only one would run.

    The engine executes the first statement and drops the rest with exit 0.
    Dot-commands are not BQL statements — `.run` legitimately replays a file
    of them — so only plain queries are split. A trailing `;` is not a second
    statement.
    """
    if query_string.strip().startswith("."):
        return
    statements = _split_statements(query_string)
    if len(statements) > 1:
        raise UsageError(
            f"One BQL statement per invocation; got {len(statements)}. Run each query in its own `bea query` call."
        )


def _is_shell_utility(query: str) -> bool:
    """True when the string is a BQL shell utility, not a SELECT/PRINT statement."""
    stripped = query.lstrip()
    if not stripped:
        return False
    first = stripped.split(maxsplit=1)[0]
    if first.startswith("."):
        return True
    return first.lower() in _SHELL_ALIASES


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
        str | None, typer.Option("--format", "-f", help=f"Rendering for a printed result: {', '.join(FORMATS)}")
    ] = None,
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
    if output_file == "-":
        output_file = None
    if output_format is None and output_file is not None:
        suffix = Path(output_file).suffix.casefold()
        if suffix == ".csv":
            output_format = "csv"
        elif suffix == ".tsv":
            raise UsageError(
                f"--output {output_file} looks like TSV; pass --format csv (or rename the file) "
                "so the destination is not an ASCII text table."
            )
    if output_format is None:
        output_format = "text"
    if output_format not in FORMATS:
        raise UsageError(f"Unknown query format '{output_format}'. Choose one of: {', '.join(FORMATS)}.")
    if output_file is not None:
        destination = Path(output_file)
        if destination.exists() and destination.is_dir():
            raise UsageError(f"--output must be a file path, not a directory ({destination}).")

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
    if output_file is not None:
        # Before anything is forwarded: the engine opens this path for write,
        # and opening the ledger under read would truncate the books.
        output.refuse_ledger_alias(Path(output_file), file)
    if not query_string:
        if not sys.stdin.isatty():
            query_string = sys.stdin.read()
            if not query_string.strip():
                raise UsageError("A query is required as an argument or on stdin.")
        elif ctx.no_input:
            raise UsageError("A query is required with --no-input. Pass it as an argument or on stdin.")
        else:
            raise typer.Exit(launch.run_engine_argv(["shell", "--file", str(file), *rendering]))
    if not query_string.strip():
        raise UsageError("A query is required as an argument or on stdin.")
    _refuse_one_shot_output(query_string)
    _refuse_multi_statement(query_string)

    # `--allow-errors` / `--strict` are frontend policy; the engine enforces
    # them before running the query so a total from a broken ledger is never
    # computed.
    #
    # Global `--json` normally forces the engine's columns/rows shape, but shell
    # utilities (`.tables`, `.run`, …) only exist on the shell/text path. Keep
    # that path and put the rendered text in the frontend JSON envelope.
    engine_format = output_format
    if ctx.json_output:
        engine_format = "text" if _is_shell_utility(query_string) else "json"
    args = ["query", "--file", str(file), query_string]
    args += ["--format", engine_format]
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
        payload: dict[str, object]
        if engine_format == "json":
            payload = {"columns": data.get("columns", []), "rows": data.get("rows", [])}
        else:
            payload = {"text": str(data.get("text", ""))}
        output.emit(
            payload,
            target=output.file_target(file),
            destination=Path(output_file) if output_file is not None else None,
        )
        return
    text = str(data.get("text", ""))
    if text:
        # `end=""`: the renderer's own trailing newline is part of the table.
        typer.echo(text, nl=False)
