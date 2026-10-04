"""`bea treeify` — delegate to upstream `treeify`."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import NoReturn

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError, refuse_json
from cli.utils import atomic_write

_NO_COLUMN = "Could not find any valid column in input"
_FORCE = "--force"


class _Unparsed(Exception):
    """The arguments are not ones upstream accepts; it reports that itself."""


class _Parser(argparse.ArgumentParser):
    def error(self, message: str) -> NoReturn:
        raise _Unparsed(message)


def _upstream_parser() -> _Parser:
    """Upstream treeify's argument grammar, so `bea` reads argv as it will.

    Mirrors `beancount/tools/treeify.py`: the same options, argparse's default
    abbreviation of long options and clustering of short flags. Reading the
    destination any other way is how `--outp X` or `-Ao X` slipped past the
    guard and overwrote a ledger.
    """
    parser = _Parser(add_help=False)
    parser.add_argument("input", nargs="?")
    parser.add_argument("-h", "--help", action="store_true")
    parser.add_argument("-o", "--output")
    parser.add_argument("-r", "--pattern")
    parser.add_argument("-d", "--delimiter")
    parser.add_argument("-s", "--split")
    parser.add_argument("-F", "--filenames", action="store_true")
    parser.add_argument("-A", "--loose-accounts", action="store_true")
    parser.add_argument("--filler")
    return parser


def _without_output(parsed: argparse.Namespace) -> list[str]:
    """The same invocation with stdout as the destination."""
    argv: list[str] = []
    for flag, value in (
        ("--pattern", parsed.pattern),
        ("--delimiter", parsed.delimiter),
        ("--split", parsed.split),
        ("--filler", parsed.filler),
    ):
        if value is not None:
            argv.append(f"{flag}={value}")
    if parsed.filenames:
        argv.append("--filenames")
    if parsed.loose_accounts:
        argv.append("--loose-accounts")
    if parsed.input is not None:
        argv += ["--", parsed.input]
    return argv


def treeify(ctx: typer.Context) -> None:
    """Render a hierarchical column as an ASCII tree (delegates to treeify)."""
    refuse_json("treeify", hint="Run without --json to print the ASCII tree.")
    # Upstream treeify knows no `--force`, so bea's own opt-in is stripped
    # before forwarding; without it an existing ledger file is never replaced.
    args = list(ctx.args)
    stop = args.index("--") if "--" in args else len(args)
    forwarded = [arg for index, arg in enumerate(args) if arg != _FORCE or index > stop]
    destination: Path | None = None
    try:
        parsed = _upstream_parser().parse_args(forwarded)
    except _Unparsed:
        # Upstream rejects these before it opens anything; the plain-spelling
        # guard still runs in case its grammar ever drifts from the mirror.
        parsed = None
        output.guard_forwarded_output(
            forwarded, _ledgers(), refuse_existing_ledger_file=True, force=_FORCE in args[:stop], flags="FA"
        )
    if parsed is not None and parsed.output is not None and not parsed.help:
        # Upstream opens `-o` for writing before it reads the input, so a run
        # that then fails — or reads the same file — has already truncated
        # it. bea keeps the destination itself and writes it only on success.
        destination = Path(parsed.output).expanduser()
        output.guard_output_destination(
            destination, _ledgers(), refuse_existing_ledger_file=True, force=_FORCE in args[:stop]
        )
        if parsed.input is not None:
            output.refuse_input_alias(destination, Path(parsed.input).expanduser())
        output.check_output_destination(destination)
        forwarded = _without_output(parsed)
    completed = launch.capture_native("treeify", forwarded)
    if completed.returncode == 0 and _NO_COLUMN in (completed.stderr or ""):
        # Upstream echoes the input unchanged and calls that success; the
        # echo is not a tree, so it is not printed.
        sys.stderr.write(completed.stderr or "")
        raise UsageError(
            "treeify found no hierarchical column to render (colon-separated names like Assets:Cash). "
            "Pipe balances or an account listing, not plain text."
        )
    launch.check_native(completed, "treeify")
    if destination is not None:
        atomic_write(destination, completed.stdout or "", export=True)
    elif completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)


def _ledgers() -> list[Path]:
    """The ledger under read, when there is one — treeify runs happily without."""
    try:
        return [context.current().entry_file()]
    except UsageError:
        return []
