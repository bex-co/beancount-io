"""`bea check` — native bean-check, with bea's JSON envelope via the helper."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError

_URL_INCLUDE_RE = re.compile(r'^\s*include\s+"https?://', re.MULTILINE)
"""An include line native bean-check cannot resolve (w1/m29).

A posting line can never match: account names cannot start with the lowercase
`include` keyword, and a `;` comment never has the keyword first. Close
enough to exact for routing the closure to the helper check.
"""


def check(ctx: typer.Context) -> None:
    """Parse, check and realize a beancount ledger."""
    current = context.current()
    file = current.entry_file()
    compat = _closure_needs_compat(file)
    if compat is not None and not current.json_output:
        # Native bean-check cannot parse a BOM-marked file at all, reads
        # NFC and NFD spellings of one account as two accounts, and cannot
        # fetch URL includes, so these closures run the helper check in both
        # modes; bean-check-only flags cannot be forwarded to a run that
        # never starts upstream.
        if ctx.args:
            tokens = " ".join(ctx.args)
            reason, advice = compat
            raise UsageError(f"bea check cannot pass bean-check options ({tokens}) for this ledger: {reason}. {advice}")
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


def _closure_needs_compat(file: Path) -> tuple[str, str] | None:
    """Why the closure must skip native bean-check, or None when it can run it.

    A BOM-marked file fails upstream outright, mixed Unicode normalizations
    read as distinct accounts there, and URL includes cannot be fetched; the
    helper reads all three shapes. Pure NFC unmarked local closures keep
    native output byte for byte. Answers the reason plus what to do instead.
    """
    from cli.utils import has_bom

    converge = "Run bea format -i to converge the encoding, then retry."
    try:
        members = output.ledger_closure(file)
    except OSError:
        return None
    for member in members:
        if has_bom(member):
            return (
                "a file in its include closure starts with a UTF-8 BOM bean-check cannot parse",
                converge,
            )
    for member in members:
        try:
            raw = member.read_bytes()
        except OSError:
            continue
        text = raw.decode("utf-8", errors="ignore")
        if not unicodedata.is_normalized("NFC", text):
            return (
                "a file in its include closure mixes Unicode normalizations bean-check reads as distinct accounts",
                converge,
            )
        if _URL_INCLUDE_RE.search(text):
            return (
                "a file in its include closure names a URL include native bean-check cannot fetch",
                "Run without extra options to check through the helper.",
            )
    return None
