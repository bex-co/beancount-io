"""`bea upgrade` — hand the update to whichever package manager owns this install.

`bea` has no raw-binary channel: every install is owned by Homebrew, uv, or
pipx, and each of those keeps its own record of what it put on disk. So this
command never touches an installed file itself — it works out which manager
owns the running interpreter and runs that manager's upgrade command. A CLI
that rewrote its own `site-packages` would leave the owning manager describing
a version that is no longer there.
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output, update
from cli.config import package_version
from cli.errors import BeaError, UsageError


@dataclass(frozen=True)
class Channel:
    """How this copy of `bea` was installed, and what updating it means."""

    name: str
    #: The manager's own upgrade command, or empty when there is nothing to run.
    command: tuple[str, ...] = ()
    #: What to tell the user instead, when there is no command to run.
    advice: tuple[str, ...] = ()
    #: Whether not knowing the channel is the user's problem to resolve.
    unknown: bool = False


HOMEBREW = Channel("homebrew", command=("brew", "upgrade", "bea"))
UV_TOOL = Channel("uv-tool", command=("uv", "tool", "upgrade", "beancount-io"))
PIPX = Channel("pipx", command=("pipx", "upgrade", "beancount-io"))
CHECKOUT = Channel("checkout", advice=("git pull", "uv sync --all-groups"))
UNKNOWN = Channel(
    "unknown",
    advice=("brew upgrade bea", "uv tool upgrade beancount-io"),
    unknown=True,
)

#: Path fragments that mean Homebrew owns the environment, on either prefix and
#: on Linuxbrew. Homebrew has no relocation variable, so a marker is all there is.
_HOMEBREW_MARKERS = ("/Cellar/", "/opt/homebrew/", "/usr/local/Homebrew/", "/home/linuxbrew/.linuxbrew/")

#: The managers that can be relocated: the variable that moves them, and the
#: default path fragment to fall back on when it is unset.
_RELOCATABLE = ((UV_TOOL, "UV_TOOL_DIR", "/uv/tools/"), (PIPX, "PIPX_HOME", "/pipx/venvs/"))


def _under(path: str, parent: str) -> bool:
    parent = os.path.realpath(parent).rstrip(os.sep)
    return os.path.realpath(path).startswith(parent + os.sep)


def detect_channel(prefix: str, package_dir: str, env: Mapping[str, str]) -> Channel:
    """Work out who owns this install from the environment it is running in.

    `prefix` is the interpreter's environment root and `package_dir` is where
    the `cli` package actually lives; taking both is what separates a real
    install from an editable one, whose code sits in a checkout outside the
    environment that nominally contains it.
    """
    # An editable install is checked first, because `uv tool install --editable`
    # (what `make install-tool` runs) produces a uv-owned environment whose code
    # is a working tree — where `git pull` is the update, not `uv tool upgrade`.
    if not _under(package_dir, prefix):
        return CHECKOUT
    if any(marker in prefix for marker in _HOMEBREW_MARKERS):
        return HOMEBREW
    for channel, home_variable, marker in _RELOCATABLE:
        home = env.get(home_variable)
        if (home and _under(prefix, home)) or marker in prefix:
            return channel
    return UNKNOWN


def current_channel() -> Channel:
    return detect_channel(sys.prefix, str(Path(__file__).resolve().parent.parent), os.environ)


def upgrade(
    check: Annotated[
        bool,
        typer.Option("--check", help="Report what would be run, and run nothing"),
    ] = False,
) -> None:
    """Update bea using the package manager that installed it."""
    ctx = context.current()
    # This command reports versions itself; the passive notice would only
    # repeat a comparison that is about to be out of date.
    update.suppress()
    channel = current_channel()
    current = package_version()

    if check:
        # The user asked, so this is the one path that goes past the daily
        # cache: a stale answer is exactly what they are trying to rule out.
        latest = update.latest_version(use_cache=False, channel=channel.name)
        if ctx.json_output:
            output.emit(
                {
                    "channel": channel.name,
                    "current": current,
                    "latest": latest,
                    "command": list(channel.command),
                    "advice": list(channel.advice),
                }
            )
        else:
            _report(channel, current, latest)
        return

    if channel.unknown:
        raise UsageError(
            "Cannot tell which package manager installed bea, so nothing was run.",
            details=[f"Upgrade it yourself with one of: {', '.join(channel.advice)}"],
        )
    if not channel.command:
        if ctx.json_output:
            output.emit({"channel": channel.name, "command": [], "advice": list(channel.advice), "ran": False})
        else:
            output.success(f"bea {current} runs from a checkout — update it with: {'; '.join(channel.advice)}")
        return

    printed = " ".join(channel.command)
    output.note(f"Running: {printed}")
    try:
        # Streamed, not captured, so the manager's own progress and prompts
        # reach the user unchanged. In JSON mode it goes to stderr instead, so
        # stdout stays the envelope alone.
        completed = subprocess.run(channel.command, stdout=sys.stderr if ctx.json_output else None, check=False)
    except FileNotFoundError as exc:
        raise UsageError(f"'{channel.command[0]}' is not on PATH, so `{printed}` could not run.") from exc
    if completed.returncode != 0:
        raise BeaError(f"`{printed}` failed (exit {completed.returncode}); bea was not changed.")

    # After the frontend package updates, refresh the managed engine so the
    # helper/version pins stay matched (ADR014 t017). Homebrew already
    # provisions `libexec/engine` at install time; PyPI/uv installs rely on
    # this path. Failures here are reported — do not silently keep a stale env.
    engine_refreshed = _refresh_engine()

    if ctx.json_output:
        output.emit(
            {
                "channel": channel.name,
                "command": list(channel.command),
                "ran": True,
                "engine_refreshed": engine_refreshed,
            }
        )
    else:
        output.success(f"`{printed}` finished. Run 'bea --version' to see the installed version.")


def _refresh_engine() -> bool:
    """Rebuild the managed engine for the new frontend, when one is managed.

    Returns whether a rebuild ran. Overrides (`BEA_ENGINE_PYTHON`), checkouts
    (helper runs from the tree), and missing uv are left alone — the next local
    command will surface a clear provision error if the engine is still required.
    """
    from cli.engine import paths, provision

    if paths.python_override() is not None:
        return False
    if paths.checkout_source_root() is not None:
        return False
    try:
        provision.repair_engine()
    except Exception as exc:  # noqa: BLE001 — surface through BeaError below
        raise BeaError(
            "bea upgraded, but refreshing the Beancount engine failed.",
            details=[str(exc), "Retry with a local command such as 'bea check', or set BEA_ENGINE_PYTHON."],
        ) from exc
    return True


def _report(channel: Channel, current: str, latest: str | None) -> None:
    typer.echo(f"bea {current} (installed by: {channel.name})")
    typer.echo(f"Latest release: {latest or 'unknown'}")
    if channel.command:
        typer.echo(f"Would run: {' '.join(channel.command)}")
    else:
        typer.echo(f"Would run: nothing — upgrade it yourself with: {'; '.join(channel.advice)}")
