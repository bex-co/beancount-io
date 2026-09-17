"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

from pathlib import Path

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    if _closure_has_bom(file) and not current.json_output:
        # Native bean-check cannot parse a BOM-marked file at all, so this
        # one file shape runs the helper check in both modes; bean-check-only
        # flags cannot be forwarded to a run that never starts upstream.
        if ctx.args:
            tokens = " ".join(ctx.args)
            raise UsageError(
                f"bea check cannot pass bean-check options ({tokens}) for this ledger: "
                "a file in its include closure starts with a UTF-8 BOM bean-check cannot parse. "
                "Run bea format -i to remove the BOM, then retry."
            )
        launch.helper_json(["check", "--file", str(file)])
        raise typer.Exit(0)
    if current.json_output:
        # Keep bea's documented JSON envelope; native --json is a different shape.
        # bean-check-only flags (-v, --auto, …) are not implemented on bea-engine
        # check — refuse them up front as usage, not as a false "engine did not answer".
        if ctx.args:
            tokens = " ".join(ctx.args)
            raise UsageError(
                f"bea --json check does not accept bean-check options ({tokens}). "
                "Drop --json to use native bean-check flags such as -v / --auto."
            )
        data = launch.helper_json(["check", "--file", str(file)])
        output.emit(data, target=output.file_target(file))
        return
    code = launch.run_native("bean-check", [str(file), *ctx.args])
    if code != 0:
        raise typer.Exit(code)
    # bean-check does not cover absolute document paths outside the ledger tree;
    # the helper check does, so copies that still resolve against another tree fail.
    launch.helper_json(["check", "--file", str(file)])
    raise typer.Exit(0)


def _closure_has_bom(file: Path) -> bool:
    """Whether the ledger or anything it includes starts with a UTF-8 BOM."""
    try:
        members = output.ledger_closure(file)
    except OSError:
        return False
    for member in members:
        try:
            with open(member, "rb") as stream:
                if stream.read(3) == b"\xef\xbb\xbf":
                    return True
        except OSError:
            continue
    return False
