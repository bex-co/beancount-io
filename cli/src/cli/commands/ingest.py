"""`bea ingest` — run the user's Beangulp ingest script through the engine.

Identify, extract, and archive stay in Beangulp's own CLI (the script that
builds `Ingest(importers, hooks=...)`). This module only picks the engine
interpreter, requires `bea engine enable beangulp`, and forwards the subcommand.
`bea import` remains the review/apply workflow and is unchanged.
"""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer

from cli import context
from cli.engine import launch
from cli.errors import UsageError
from cli.native_help import native_help

_EXTRA = {"allow_extra_args": True, "ignore_unknown_options": True}
_CONFIG = Annotated[
    Path | None,
    typer.Option("--config", help="Ingest script (defaults to ingest.py beside the ledger or cwd)"),
]

ingest_app = typer.Typer(
    name="ingest",
    help=(
        "Run Beangulp identify/extract/archive via the user's ingest script (requires 'bea engine enable beangulp')."
    ),
    no_args_is_help=True,
)


def _ingest_script(supplied: Path | None) -> Path:
    """Resolve the user's ingest script: --config, else ingest.py beside the ledger or cwd."""
    if supplied is not None:
        return supplied.expanduser().resolve()
    try:
        ledger = context.current().entry_file()
    except UsageError:
        ledger = None
    candidates: list[Path] = []
    if ledger is not None:
        candidates.append(ledger.parent / "ingest.py")
    candidates.append(Path.cwd() / "ingest.py")
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise UsageError(
        "Choose an ingest script with --config FILE, or place ingest.py beside the root ledger "
        "(or in the current directory). The script should call beangulp.Ingest(...)()."
    )


def _forward(operation: str, ctx: typer.Context, config: Path | None) -> None:
    script = _ingest_script(config)
    code = launch.run_optional_script("beangulp", script, [operation, *ctx.args])
    raise typer.Exit(code)


@ingest_app.command("identify", epilog=native_help("ingest identify"), context_settings=_EXTRA)
def identify(ctx: typer.Context, config: _CONFIG = None) -> None:
    """Identify which importer matches each document (Beangulp identify)."""
    _forward("identify", ctx, config)


@ingest_app.command("extract", epilog=native_help("ingest extract"), context_settings=_EXTRA)
def extract(ctx: typer.Context, config: _CONFIG = None) -> None:
    """Extract raw entries from documents (Beangulp extract; not bea import --apply)."""
    _forward("extract", ctx, config)


@ingest_app.command("archive", epilog=native_help("ingest archive"), context_settings=_EXTRA)
def archive(ctx: typer.Context, config: _CONFIG = None) -> None:
    """File documents into the archive hierarchy (Beangulp archive)."""
    _forward("archive", ctx, config)
