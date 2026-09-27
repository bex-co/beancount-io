"""`bea treeify` — delegate to upstream `treeify`."""

from __future__ import annotations

import sys
from pathlib import Path

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError, refuse_json

_NO_COLUMN = "Could not find any valid column in input"
_FORCE = "--force"


def treeify(ctx: typer.Context) -> None:
    """Render a hierarchical column as an ASCII tree (delegates to treeify)."""
    refuse_json("treeify", hint="Run without --json to print the ASCII tree.")
    # Upstream treeify knows no `--force`, so bea's own opt-in is stripped
    # before forwarding; without it an existing ledger file is never replaced.
    args = list(ctx.args)
    stop = args.index("--") if "--" in args else len(args)
    forwarded = [arg for index, arg in enumerate(args) if arg != _FORCE or index > stop]
    output.guard_forwarded_output(forwarded, _ledgers(), refuse_existing_ledger_file=True, force=_FORCE in args[:stop])
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
    if completed.stdout:
        sys.stdout.write(completed.stdout)
    if completed.stderr:
        sys.stderr.write(completed.stderr)


def _ledgers() -> list[Path]:
    """The ledger under read, when there is one — treeify runs happily without."""
    try:
        return [context.current().entry_file()]
    except UsageError:
        return []
