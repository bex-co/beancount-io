"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

import unicodedata
from pathlib import Path

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    compat = _closure_needs_compat(file)
    if compat is not None and not current.json_output:
        # Native bean-check cannot parse a BOM-marked file at all, and reads
        # NFC and NFD spellings of one account as two accounts, so these file
        # shapes run the helper check in both modes; bean-check-only flags
        # cannot be forwarded to a run that never starts upstream.
        if ctx.args:
            tokens = " ".join(ctx.args)
            raise UsageError(
                f"bea check cannot pass bean-check options ({tokens}) for this ledger: "
                f"{compat}. Run bea format -i to converge the encoding, then retry."
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


def _closure_needs_compat(file: Path) -> str | None:
    """Why the closure must skip native bean-check, or None when it can run it.

    A BOM-marked file fails upstream outright, and mixed Unicode
    normalizations read as distinct accounts there; the helper reads both
    shapes. Pure NFC unmarked closures keep native output byte for byte.
    """
    from cli.utils import has_bom

    try:
        members = output.ledger_closure(file)
    except OSError:
        return None
    for member in members:
        if has_bom(member):
            return "a file in its include closure starts with a UTF-8 BOM bean-check cannot parse"
    for member in members:
        try:
            raw = member.read_bytes()
        except OSError:
            continue
        text = raw.decode("utf-8", errors="ignore")
        if not unicodedata.is_normalized("NFC", text):
            return "a file in its include closure mixes Unicode normalizations bean-check reads as distinct accounts"
    return None
