"""`bea example` — delegate to upstream `bean-example`."""

from __future__ import annotations

from pathlib import Path

import typer

from cli.engine import launch
from cli.errors import ConflictError, refuse_json

_FORCE = "--force"


def _split_output(args: list[str]) -> tuple[list[str], Path | None, bool]:
    """Pull bea's own `--force` and upstream's `-o` out of the passthrough args.

    `bean-example` knows no `--force`, so it is stripped before forwarding;
    `-o`/`--output` stays, since upstream is what writes it. Only an existing
    destination needs refusing — a fresh path is upstream's normal case.
    """
    forwarded: list[str] = []
    output: Path | None = None
    force = False
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "--":
            forwarded.extend(args[index:])
            break
        if arg == _FORCE:
            force = True
            index += 1
            continue
        if arg in ("-o", "--output"):
            if index + 1 < len(args):
                output = Path(args[index + 1])
                forwarded.extend(args[index : index + 2])
                index += 2
                continue
        elif arg.startswith("--output="):
            output = Path(arg.split("=", 1)[1])
        elif arg.startswith("-o") and len(arg) > 2:
            output = Path(arg[2:])
        forwarded.append(arg)
        index += 1
    return forwarded, output, force


def example(ctx: typer.Context) -> None:
    """Generate an example Beancount history (delegates to bean-example)."""
    refuse_json("example", hint="Run without --json to print the sample ledger.")
    forwarded, output, force = _split_output(list(ctx.args))
    if output is not None and not force and (output.exists() or output.is_symlink()):
        raise ConflictError(
            f"Already exists: {output}. Pass --force to overwrite it with a generated example; "
            "without it, example never overwrites."
        )
    code = launch.run_native("bean-example", forwarded)
    raise typer.Exit(code)
