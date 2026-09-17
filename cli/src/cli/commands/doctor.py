"""`bea doctor` — delegate to upstream `bean-doctor` in the engine environment."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import typer

from cli.engine import launch
from cli.errors import BeaError, LedgerError, refuse_json
from cli.native_help import native_help

doctor_app = typer.Typer(
    name="doctor",
    help=(
        "Beancount diagnostics (delegates to bean-doctor). Operations take the ledger file as a "
        "positional argument; --file, BEA_FILE, and ./main.bean do not apply."
    ),
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


def _positionals(args: list[str]) -> list[str]:
    """The operands bean-doctor will see: past `--`, skipping flags."""
    if "--" in args:
        args = args[args.index("--") + 1 :]
    return [arg for arg in args if not arg.startswith("-")]


# `context` and `linked` take `FILENAME LOCATION`; `region` takes
# `FILENAME REGION`, which may also carry a filename. All three resolve that
# filename the same way, and get it wrong the same way.
_LOCATED_OPS = frozenset({"context", "linked", "region"})


def _located_against_ledger(op: str, args: list[str]) -> list[str]:
    """Resolve a relative location filename against the ledger it belongs to.

    `bean-doctor` resolves it against the process working directory, so
    `doctor context /abs/books/main.bean txns/jan.bean:4` only works from inside
    the books tree — even though `txns/jan.bean` is exactly how the ledger's own
    `include` spells that file. When the working directory has no such file but
    the root ledger's directory does, that is the file meant.

    A location that already resolves is passed through untouched, so this only
    ever turns a guaranteed failure into an answer.
    """
    if op not in _LOCATED_OPS:
        return args
    # Read by shape, not by position: options and their values sit anywhere in
    # the forwarded argv, and only the ledger argument names a file that exists.
    for index, value in enumerate(args[:-1]):
        if value.startswith("-") or not Path(value).expanduser().is_file():
            continue
        ledger, position = Path(value).expanduser(), index + 1
        head, sep, rest = args[position].partition(":")
        if not sep or not head or head.isdigit() or Path(head).is_absolute() or Path(head).exists():
            return args
        candidate = ledger.parent / head
        if not candidate.exists():
            return args
        args = list(args)
        args[position] = f"{candidate}{sep}{rest}"
        return args
    return args


def _syntax_errors_of(filename: str) -> list[str]:
    """Syntax errors in one file, or [] when the file cannot be checked here.

    A name that is not a readable file is upstream's to report, and a dead
    engine must not take the diagnostics tool down with it: both fail open to
    the plain passthrough.
    """
    if not Path(filename).is_file():
        return []
    try:
        data = launch.helper_json(["syntax", filename])
    except BeaError:
        return []
    return [str(error) for error in data.get("files", {}).get(filename, [])]


def _forward(op: str, ctx: typer.Context) -> None:
    """Pass remaining argv through to bean-doctor, resolving a relative location."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    code = launch.run_native("bean-doctor", [op, *_located_against_ledger(op, list(ctx.args))])
    raise typer.Exit(code)


def _replay(completed: subprocess.CompletedProcess[str]) -> None:
    """Print captured upstream output back to its own streams, verbatim."""
    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)
    # A failure line follows on stderr; flush first so redirected streams keep
    # upstream's output ahead of the error that refers to it.
    sys.stdout.flush()
    sys.stderr.flush()


def _forward_parse(op: str, ctx: typer.Context) -> None:
    """Trace the parse, but exit 1 when recovery ran on unparseable input."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = list(ctx.args)
    positionals = _positionals(args)
    errors = _syntax_errors_of(positionals[0]) if positionals else []
    code = launch.run_native("bean-doctor", [op, *args])
    if code == 0 and errors:
        raise LedgerError(f"doctor {op} recovered from syntax errors in {positionals[0]} (see above).")
    raise typer.Exit(code)


def _forward_print_options(ctx: typer.Context) -> None:
    """Refuse to print default options for a file that did not load."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = list(ctx.args)
    positionals = _positionals(args)
    if positionals:
        errors = _syntax_errors_of(positionals[0])
        if errors:
            raise LedgerError(f"doctor print-options cannot load {positionals[0]}: {errors[0]}")
    code = launch.run_native("bean-doctor", ["print-options", *args])
    raise typer.Exit(code)


def _forward_roundtrip(ctx: typer.Context) -> None:
    """Compare entry sets, without congratulations on unparseable input."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = list(ctx.args)
    positionals = _positionals(args)
    errors = _syntax_errors_of(positionals[0]) if positionals else []
    if not errors:
        raise typer.Exit(launch.run_native("bean-doctor", ["roundtrip", *args]))
    completed = launch.capture_native("bean-doctor", ["roundtrip", *args])
    _replay_without_congratulations(completed)
    raise LedgerError(f"doctor roundtrip cannot compare {positionals[0]}: {errors[0]}")


def _replay_without_congratulations(completed: subprocess.CompletedProcess[str]) -> None:
    """Upstream's trace minus its success copy, which the errors above belie."""
    for stream, write in ((completed.stdout, sys.stdout.write), (completed.stderr, sys.stderr.write)):
        kept = "".join(line for line in stream.splitlines(keepends=True) if "Congratulations" not in line)
        if kept:
            write(kept)


def _forward_directories(ctx: typer.Context) -> None:
    """Map upstream's ERROR lines to the exit status gates need."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = list(ctx.args)
    completed = launch.capture_native("bean-doctor", ["directories", *args])
    _replay(completed)
    if completed.returncode != 0:
        raise typer.Exit(completed.returncode)
    problems = [
        line
        for stream in (completed.stdout, completed.stderr)
        for line in stream.splitlines()
        if line.startswith("ERROR:")
    ]
    if problems:
        noun = "directory" if len(problems) == 1 else "directories"
        raise LedgerError(f"doctor directories found {len(problems)} invalid {noun} (see above).")
    raise typer.Exit(0)


def _forward_scoped(op: str, ctx: typer.Context) -> None:
    """Fail an empty link/region scope instead of printing a blank success."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = _located_against_ledger(op, list(ctx.args))
    # Through the helper rather than the `bean-doctor` script: same upstream
    # command, run where bea can number its balance tree from the entries in
    # scope instead of from the whole ledger's display context (w3/352).
    completed = launch.capture_engine(["scoped", op, *args])
    _replay(completed)
    if completed.returncode != 0:
        raise typer.Exit(completed.returncode)
    rest = [
        line
        for stream in (completed.stdout, completed.stderr)
        for line in stream.splitlines()
        if line.strip() and line.strip() != "Net Income: ()"
    ]
    if not rest:
        positionals = _positionals(args)
        scope = positionals[1] if len(positionals) > 1 else "?"
        ledger = positionals[0] if positionals else "?"
        raise LedgerError(f"doctor {op} matched no entries for '{scope}' in {ledger}.")
    raise typer.Exit(0)


def _forward_missing_open(ctx: typer.Context) -> None:
    """Print upstream's missing opens, then name the inactive ones it omits."""
    refuse_json(
        "doctor",
        hint="Run without --json and pass the ledger path as a positional argument.",
    )
    args = list(ctx.args)
    completed = launch.capture_native("bean-doctor", ["missing-open", *args])
    _replay(completed)
    if completed.returncode != 0:
        raise typer.Exit(completed.returncode)
    positionals = _positionals(args)
    if not positionals:
        raise typer.Exit(0)
    try:
        launch.helper_json(["check", "--file", positionals[0]])
    except BeaError as exc:
        details = exc.details or []
    else:
        details = []
    inactive = [line for line in details if "inactive account" in line]
    if inactive:
        for line in inactive:
            typer.echo(line)
        raise LedgerError(
            f"doctor missing-open still references {len(inactive)} closed account(s); reopen them or fix the postings."
        )
    raise typer.Exit(0)


def _register(op: str) -> None:
    help_text = f"Run bean-doctor {op}."
    forwarder = {
        "lex": lambda ctx: _forward_parse("lex", ctx),
        "parse": lambda ctx: _forward_parse("parse", ctx),
        "roundtrip": _forward_roundtrip,
        "directories": _forward_directories,
        "print-options": _forward_print_options,
        "linked": lambda ctx: _forward_scoped("linked", ctx),
        "region": lambda ctx: _forward_scoped("region", ctx),
        "missing-open": _forward_missing_open,
    }.get(op)
    if forwarder is None:

        def forwarder(ctx: typer.Context, op: str = op) -> None:
            _forward(op, ctx)

    @doctor_app.command(
        op,
        help=help_text,
        epilog=native_help(f"doctor {op}"),
        context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
    )
    def _cmd(ctx: typer.Context) -> None:
        assert forwarder is not None
        forwarder(ctx)


for _op in _OPS:
    _register(_op)


@doctor_app.command(
    "dump-lexer",
    epilog=native_help("doctor dump-lexer"),
    context_settings={"allow_extra_args": True, "ignore_unknown_options": True},
)
def dump_lexer(ctx: typer.Context) -> None:
    """Alias for bean-doctor lex."""
    _forward_parse("lex", ctx)
