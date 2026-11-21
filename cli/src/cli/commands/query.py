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
from cli.completion import fixed_values
from cli.engine import launch
from cli.errors import BeaError, UsageError, placement_hint
from cli.paths import expand_path, is_descriptor_path
from cli.utils import RawPath, decode_error_message, inert_text, writes_through_descriptor

FORMATS = ("text", "csv", "beancount")

# Bare names that PreciseShell rewrites to dot commands (beanquery deprecates
# the undotted forms). Any leading-`.` token also goes through the shell.
_SHELL_ALIASES = frozenset({"clear", "errors", "exit", "help", "history", "parse", "quit", "run", "set"})


def _refuse_shell_without_terminal_stdout() -> None:
    """Refuse the interactive shell when its prompt would not reach the terminal (w5/587).

    Upstream's `input()` writes the prompt to stdout, so with stdout
    redirected the session showed nothing, looked hung, and wrote its
    `beanquery>` prompts into the results file.
    """
    if not context.current().stdout_is_a_terminal:
        raise UsageError(
            "The query shell draws its prompt on stdout, and stdout is redirected, so the session would be "
            "invisible and its prompts would land in the output. Pass the query as an argument or on stdin, "
            "or export with -o FILE."
        )


def _stdin_query() -> str:
    """Piped BQL, held to the UTF-8 rule `format -` and `--from -` apply (w5/155).

    Text-mode stdin decodes with surrogateescape under a C locale, so a
    Latin-1 byte arrives as a lone surrogate that matches nothing and the
    query answers "(no rows)" with exit 0. A BOM is accepted, as elsewhere.
    """
    stream = getattr(sys.stdin, "buffer", None)
    if stream is None:
        return sys.stdin.read()
    data = bytes(stream.read())
    utf16 = "'stdin' looks like UTF-16 text; re-save the query as UTF-8 and retry."
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        message = decode_error_message("stdin", exc, data)
        if data.startswith((b"\xff\xfe", b"\xfe\xff")):
            message = f"{message} {utf16}"
        raise UsageError(message) from exc
    if "\x00" in text:
        # BOM-less UTF-16 decodes as UTF-8 with a NUL beside every ASCII byte;
        # a query can never hold one (it travels to the engine as an argument).
        raise UsageError(utf16)
    return text


#: Schemes `bean-query` can attach from `beanquery.sources.<scheme>`; anything
#: else dies there with a ModuleNotFoundError traceback, so the frontend refuses
#: it first. `memory` is left out: upstream ships the module without an
#: `attach`, so it ended in an AttributeError traceback while the refusal for
#: any other scheme recommended it (w5/288). A bare path loads as a ledger.
_SOURCE_SCHEMES = ("beancount", "csv", "test")


def _check_source_scheme(source: str) -> None:
    """Refuse a `--source` URI whose scheme upstream cannot resolve."""
    scheme, separator, _rest = source.partition(":")
    if not separator or not scheme.isidentifier() or len(scheme) == 1:
        return
    if scheme.casefold() not in _SOURCE_SCHEMES:
        supported = ", ".join(f"{name}:..." for name in _SOURCE_SCHEMES)
        raise UsageError(f"--source scheme '{scheme}' is not supported; use {supported}, or a bare path.")


def _require_source_ledger(source: str) -> None:
    """Refuse a native Beancount `--source` whose ledger file is not there (w5/249).

    Upstream records `File "…" does not exist` as an ordinary load error and
    answers from an empty database, so a typo in the path exited 0 and replaced
    an existing `--output` export with a header row. The path is the one the
    engine will hand the loader (`bea_engine.query._native_shell` restates this
    rule and checks again): a lower-case scheme makes a URI, anything else is a
    bare path, and either way the URL parser has the last word on the name.

    A `csv:` source is opened by upstream directly, so a missing file, a
    directory, or no path at all (`--source ""` from an unset shell variable)
    ended in a traceback through the engine instead (w5/250); those are refused
    here in the same words.

    A `$VAR` the loader would expand is refused before the existence check: it
    silently read another ledger with exit 0, or answered from an empty
    database and replaced an `--output` export with a header row (w5/791).
    A descriptor spelling (`/dev/fd/N`, `/dev/stdin`) is refused the same
    way: the engine child cannot open it (w5/792).
    """
    import re
    from urllib.parse import urlparse

    parts = urlparse(source if re.match("[a-z]{2,}:", source) else "beancount:" + source)
    if parts.scheme not in {"beancount", "csv"}:
        return
    if not parts.path:
        raise UsageError(f"--source '{source}' names no file; pass a ledger path, beancount:<path> or csv:<path>.")
    path = Path(parts.path)
    named = "" if parts.path == source else f" {source}"
    if parts.scheme == "beancount":
        context.refuse_expanding_ledger_path(parts.path, f" (from --source{named})")
    kind, label = ("ledger", "Ledger") if parts.scheme == "beancount" else ("CSV", "CSV")
    if is_descriptor_path(parts.path):
        # The engine child cannot open our descriptors; refused by name
        # instead of "not found" mid-query (w5/792).
        raise UsageError(
            f"{label} path '{path}' (from --source{named}) is a file descriptor, not a file. "
            "Save it to a file and pass that file."
        )
    if not path.exists():
        raise UsageError(f"No {kind} file at '{path}' (from --source{named}).")
    if path.is_dir():
        raise UsageError(f"{label} path '{path}' (from --source{named}) is a directory; expected a {kind} file.")
    if parts.scheme == "beancount":
        output.refuse_cache_over_ledger(path)


def _refuse_source_alias(source: str, destination: Path, *, spelling: Path | None = None) -> None:
    """Refuse `--output` onto the local file a native `--source` reads.

    Native Beanquery opens the output itself, so the guard `--file` runs never
    ran here: `--source main.bean --output main.bean` replaced the books with a
    text table and exited 0. The file is resolved the way upstream does — a
    bare path, or the path of a `beancount:` / `csv:` URI; `test:` names no
    file — and a Beancount ledger is checked with its includes.
    """
    from urllib.parse import urlparse

    parts = urlparse(source)
    scheme = parts.scheme.casefold() if len(parts.scheme) > 1 else ""
    if scheme == "":
        output.refuse_ledger_alias(destination, Path(source), spelling=spelling)
    elif scheme == "beancount" and parts.path:
        output.refuse_ledger_alias(destination, Path(parts.path), spelling=spelling)
    elif scheme == "csv" and parts.path:
        output.refuse_input_alias(destination, Path(parts.path))


def _refuse_shell_descriptor(descriptor: str | None) -> None:
    """Refuse a descriptor destination for the interactive shell, which writes each result itself."""
    if descriptor is not None:
        raise UsageError(
            f"--output {descriptor} is a descriptor of this process, which the interactive shell cannot write; "
            "pass the query as an argument or on stdin."
        )


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
    """Split a one-shot query on top-level semicolons, honoring quotes and comments.

    Only a `;` that is really a statement separator counts. A comment's
    punctuation is not executable BQL, and skipping that rule failed in both
    directions: a `;` inside `/* … */` split a valid single query and got it
    refused as two, while an apostrophe inside a comment opened a string that
    swallowed the real separator — so two statements were forwarded, the engine
    ran only the first, and the caller got exit 0 and half an answer.

    BQL escapes a quote by doubling it and comments with `/* */`. It has no
    line-comment form — `--`, `#` and a bare `;` are all syntax errors, probed
    against the parser rather than assumed — so only these two rules exist to
    honor. The engine twin
    (`bea_engine.query._code_mask`) applies the same rules for a different
    purpose; the frontend may not import the engine, so the rules are restated
    rather than shared, and `tests/test_query_statement_comments.py` pins that
    the two agree.

    A fragment holding only whitespace and comments is not a statement either:
    `SELECT …; /* note */` is one query to Beanquery, and counting its tail
    refused it as two (w5/262).
    """
    statements: list[str] = []
    current: list[str] = []
    code: list[bool] = []  # Per fragment: whether it holds anything but whitespace and comments.
    has_code = False
    index = 0
    length = len(query_string)
    while index < length:
        char = query_string[index]
        if char in "\"'":
            end = index + 1
            while end < length:
                if query_string[end] == char:
                    if end + 1 < length and query_string[end + 1] == char:  # A doubled quote is content.
                        end += 2
                        continue
                    end += 1
                    break
                end += 1
        elif query_string.startswith("/*", index):
            end = query_string.find("*/", index + 2)
            end = length if end == -1 else end + 2
            current.append(query_string[index:end])
            index = end
            continue
        elif char == ";":
            statements.append("".join(current))
            code.append(has_code)
            current = []
            has_code = False
            index += 1
            continue
        else:
            end = index + 1
        has_code = has_code or not char.isspace()
        current.append(query_string[index:end])
        index = end
    statements.append("".join(current))
    code.append(has_code)
    return [piece.strip() for piece, is_code in zip(statements, code, strict=True) if is_code]


def _refuse_multi_statement(query_string: str) -> None:
    """Refuse a one-shot carrying two BQL statements when only one would run.

    The engine executes the first statement and drops the rest with exit 0.
    Dot-commands are not BQL statements — `.run` legitimately replays a file
    of them — so only plain queries are split. A trailing `;` is not a second
    statement.

    A shell command is one line, and everything after its name is its
    argument: `.format csv` followed by a query never ran the query, printed
    `error:` and exited 0 over an emptied `--output` (w5/236). Only `.explain`
    and `.parse` take BQL, which may span lines.
    """
    stripped = query_string.strip()
    if _is_shell_utility(stripped):
        command = stripped.split(maxsplit=1)[0]
        lines = [line for line in stripped.splitlines() if line.strip()]
        if len(lines) > 1 and command.lstrip(".").lower() not in {"explain", "parse"}:
            raise UsageError(
                f"One command per invocation: `{command}` is a shell command and takes one line; "
                f"got {len(lines)} lines. Run each command or query in its own `bea query` call."
            )
    if stripped.startswith("."):
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
        str | None,
        typer.Option(
            "--source",
            help="Native Beanquery source URI (beancount:<path>, csv:..., or a bare path); native bean-query rendering",
        ),
    ] = None,
    allow_errors: Annotated[
        bool,
        typer.Option("--allow-errors", help="Answer with errors on stderr; opts strict reads into partial answers"),
    ] = False,
    output_format: Annotated[
        str | None,
        typer.Option(
            "--format",
            "-f",
            help=f"Rendering for a printed result: {', '.join(FORMATS)}",
            autocompletion=fixed_values(FORMATS),
        ),
    ] = None,
    output_file: Annotated[
        str | None,
        typer.Option("--output", "-o", click_type=RawPath(), help="Write the result to this file instead of stdout"),
    ] = None,
    numberify: Annotated[
        bool, typer.Option("--numberify", "-m", help="Split amounts into one column per currency")
    ] = False,
    no_errors: Annotated[bool, typer.Option("--no-errors", "-q", help="Hide ledger load errors")] = False,
    spreadsheet_safe: Annotated[
        bool,
        typer.Option(
            "--spreadsheet-safe",
            help="With --format csv, prefix text cells starting with = + - @ tab or CR with ' so spreadsheets "
            "do not run them as formulas",
        ),
    ] = False,
) -> None:
    """Run BQL queries against a local ledger.

    With a query string, print the table; without one, read BQL from stdin
    or open the interactive shell when stdin is a terminal.
    """
    ctx = context.current()
    if output_file in output.STDOUT_PATHS:
        # The engine's stdout is the envelope pipe, not the caller's, so a
        # device path for stdout means what `-` means: print the result here.
        output_file = None
    if output_file is not None:
        # No format bea writes is a workbook, so this holds under `--format`
        # and `--json` too; `--spreadsheet-safe` needs a local `--file`.
        output.refuse_workbook_destination(output_file, spreadsheet_safe=source is None)
    explicit_format = output_format
    # Under `--json` the destination receives the JSON envelope whatever its
    # suffix, so a `.csv`/`.tsv` name says nothing about the format.
    if output_format is None and output_file is not None and not ctx.json_output:
        suffix = Path(output_file).suffix.casefold()
        if suffix == ".csv":
            output_format = "csv"
        elif suffix in {".bean", ".beancount"}:
            # A ledger name holds directives: a SELECT's text table there is a
            # file that later fails to parse when a glob includes it (w5/459).
            output_format = "beancount"
        elif suffix == ".tsv":
            raise UsageError(
                f"--output {output_file} looks like TSV; pass --format csv (or rename the file) "
                "so the destination is not an ASCII text table."
            )
        elif suffix == ".json":
            # `--json` is global, so it is easy to leave off before the command.
            raise UsageError(
                f"--output {output_file} looks like JSON; put --json before the command "
                f"(bea --json query … -o {output_file}) or rename the file, "
                "so the destination is not an ASCII text table."
            )
    if output_format is not None and output_format not in FORMATS:
        message = f"Unknown query format '{output_format}'. Choose one of: {', '.join(FORMATS)}."
        if output_format.endswith((".bean", ".beancount")) or Path(output_format).is_file():
            # `query -f` is --format; the ledger's -f goes before the command (w5/413).
            message += f" -f after query is --format. {placement_hint('-f')}"
        raise UsageError(message)
    if ctx.json_output and explicit_format is not None:
        raise UsageError(
            f"--json and --format {explicit_format} cannot be combined: --json already selects JSON output. "
            "Drop --format or drop --json."
        )
    if output_format is None:
        output_format = "text"
    if spreadsheet_safe and (output_format != "csv" or ctx.json_output or source is not None):
        raise UsageError(
            "--spreadsheet-safe applies to CSV from a local --file: pass --format csv (or -o FILE.csv), "
            "without --json or --source."
        )
    # A descriptor this process holds — `-o >(cmd)`, `-o /dev/fd/3` — is
    # closed in the engine, or is the engine's own reply pipe: rows landed in
    # the envelope channel and the run failed (w5/853). This process writes it.
    descriptor = output_file if output_file is not None and writes_through_descriptor(output_file) else None
    if descriptor is not None:
        output_file = None
    output_spelling = Path(output_file) if output_file is not None else None
    if output_file is not None:
        # Resolve once before checking aliases, then carry that target through
        # the engine and JSON writer even if the original link changes.
        output_file = str(expand_path(Path(output_file), "--output").resolve())
        output.check_output_destination(Path(output_file))
        # One rule for text and `--json`, which are written by different
        # processes: an unwritable destination is refused before the query runs.
        output.require_writable_destination(Path(output_file))

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
        _check_source_scheme(source)
        _require_source_ledger(source)
        if output_file is not None:
            _refuse_source_alias(source, Path(output_file), spelling=output_spelling)
        if query_string is None:
            # The same missing-query policy as `--file`: a terminal opens the
            # shell only when prompting is allowed, and a pipe must carry BQL.
            # Only an omitted argument asks for either; an explicit "" is a
            # blank query, refused below like a whitespace-only one.
            if not sys.stdin.isatty():
                query_string = _stdin_query()
            elif ctx.no_input:
                raise UsageError("A query is required with --no-input. Pass it as an argument or on stdin.")
            else:
                _refuse_shell_without_terminal_stdout()
                _refuse_shell_descriptor(descriptor)
                # `--debug` reaches the prompt, where a mistake is otherwise only explained.
                shell_argv = ["source-shell", *rendering, *(["--debug"] if ctx.debug else []), "--", source]
                raise typer.Exit(launch.run_engine_argv(shell_argv, interactive=True))
        if not query_string.strip():
            raise UsageError("A query is required as an argument or on stdin.")
        _refuse_one_shot_output(query_string)
        # Refused before the engine starts, exactly as on the `--file` branch.
        _refuse_multi_statement(query_string)
        # The engine runs upstream's shell on the native source the way
        # `bean-query` does, but a missing stored query exits 2 instead of
        # printing an error and reporting success.
        debug = ["--debug"] if ctx.debug else []
        argv = ["source-query", *rendering, *debug, "--", source, query_string]
        if descriptor is None:
            raise typer.Exit(launch.run_engine_argv(argv))
        completed = launch.capture_engine(argv)
        sys.stderr.write(completed.stderr)
        if completed.returncode == 0:
            output.write_descriptor(descriptor, completed.stdout)
        else:
            output.write_data(completed.stdout)
        raise typer.Exit(launch.captured_status(completed))

    file = ctx.entry_file()
    if output_file is not None:
        # Before anything is forwarded: the engine opens this path for write,
        # and opening the ledger under read would truncate the books.
        output.refuse_ledger_alias(Path(output_file), file, spelling=output_spelling)
    if query_string is None:
        if not sys.stdin.isatty():
            query_string = _stdin_query()
            if not query_string.strip():
                raise UsageError("A query is required as an argument or on stdin.")
        elif ctx.no_input:
            raise UsageError("A query is required with --no-input. Pass it as an argument or on stdin.")
        else:
            _refuse_shell_without_terminal_stdout()
            _refuse_shell_descriptor(descriptor)
            # The read policy is frontend-resolved and must reach the shell:
            # a strict session answering from a ledger that does not load is
            # exactly what `--strict` exists to refuse, and suppressing the
            # banner with `--no-errors` must not also suppress the check.
            shell_argv = ["shell", "--file", str(file), *rendering]
            if allow_errors or not ctx.strict_reads():
                shell_argv.append("--allow-errors")
            if spreadsheet_safe:
                shell_argv.append("--spreadsheet-safe")
            if ctx.debug:
                shell_argv.append("--debug")
            raise typer.Exit(launch.run_engine_argv(shell_argv, interactive=True))
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
    args = ["query", "--file", str(file), "--format", engine_format]
    if allow_errors or not ctx.strict_reads():
        args.append("--allow-errors")
    if output_file is not None:
        args += ["--output", output_file]
    if numberify:
        args.append("--numberify")
    if spreadsheet_safe:
        args.append("--spreadsheet-safe")
    # After `--`, so a query that begins with a dash stays a query: the engine
    # would otherwise parse `--output=main.bean` as its own option.
    args += ["--", query_string]

    try:
        data = launch.helper_json(args)
    except BeaError as exc:
        if ctx.json_output:
            # A shell utility runs on the text path, so the engine's remedy
            # does not know the mode it was asked in (w5/838).
            exc.details = [
                detail.replace("Run bea ", "Run bea --json ", 1)
                if detail.lstrip().startswith("Run bea ") and "--json" not in detail
                else detail
                for detail in exc.details
            ]
        raise
    ledger_errors = [str(error) for error in data.get("errors", [])]
    if not no_errors:
        output.render_ledger_errors(ledger_errors, allow=True)

    if ctx.json_output:
        payload: dict[str, object]
        if engine_format == "json":
            payload = {"columns": data.get("columns", []), "rows": data.get("rows", [])}
        else:
            payload = {"text": str(data.get("text", ""))}
        destination = descriptor or output_file
        output.emit(
            payload,
            target=output.file_target(file),
            destination=Path(destination) if destination is not None else None,
            ledger_errors=[output.format_ledger_error(error) for error in ledger_errors],
        )
        return
    text = str(data.get("text", ""))
    if descriptor is not None:
        output.write_descriptor(descriptor, text)
        return
    if text:
        # A redirect or pipe gets the engine's bytes, the same ones `-o` writes.
        # A terminal is a person reading: CSV cells and `PRINT` directives hold
        # the ledger's strings verbatim, so a raw ESC in a payee would drive the
        # terminal. Show it as `\xNN`, as the text table already does (w5/245).
        if sys.stdout is not None and sys.stdout.isatty():
            text = inert_text(text)
        # The renderer's own trailing newline is part of the result.
        output.write_data(text)
