"""`bea engine` — manage the isolated Beancount engine and optional features.

The base engine (Beancount + Beanquery + helper) provisions on first use.
Optional Beangulp and Beanprice stay out of that base profile and out of the
frontend: enable them explicitly with `bea engine enable`.
"""

from __future__ import annotations

from typing import Annotated

import typer

from cli import context, output
from cli.engine import paths, provision

engine_app = typer.Typer(
    name="engine",
    help="Manage the managed Beancount engine and optional accounting features.",
    no_args_is_help=True,
)


@engine_app.command("status")
def engine_status() -> None:
    """Show whether the engine is provisioned and which optional features are enabled."""
    status = provision.feature_status()
    if context.current().json_output:
        output.emit(status)
        return

    override = status.get("python_override")
    if override:
        typer.echo(f"Engine interpreter override: {override}")
    else:
        typer.echo(f"Engine {status['engine_version']} at {status['engine_root']}")
        typer.echo(f"Provisioned: {'yes' if status['provisioned'] else 'no'}")

    features = status.get("features") or {}
    if not features:
        typer.echo("Optional features: (none defined)")
        return
    typer.echo("Optional features:")
    for name, info in features.items():
        state = "enabled" if info.get("enabled") else "disabled"
        present = "present" if info.get("present") else "absent"
        typer.echo(f"  {name}: {state}, {present} ({info.get('license')})")
        notes = info.get("notes")
        if notes:
            typer.echo(f"    {notes}")


@engine_app.command("enable")
def engine_enable(
    feature: Annotated[
        str,
        typer.Argument(help="Optional engine feature to provision: beangulp or beanprice"),
    ],
) -> None:
    """Install a reviewed optional package into the managed engine (not the frontend)."""
    name = feature.strip().lower()
    enabled = provision.enable_feature(name)
    payload = {
        "feature": name,
        "enabled": sorted(enabled),
        "engine_root": str(paths.engine_root()),
        "engine_version": paths.engine_version(),
    }
    if context.current().json_output:
        output.emit(payload)
        return
    output.success(f"Enabled '{name}' in the managed engine. It is not installed into the bea frontend.")
