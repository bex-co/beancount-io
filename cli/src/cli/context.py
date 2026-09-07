"""The run context: one resolved answer to "which ledger, and may I prompt?".

Commands never read `sys.argv`, the environment, or `main.bean` themselves.
They ask the context, so target resolution and prompt suppression are defined
once and behave identically for a person, a script, and a coding agent.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

from cli.config import DEFAULT_ENTRY_FILE
from cli.errors import UsageError

_TRUE = {"1", "true", "yes", "on"}


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in _TRUE


def _stdin_is_a_terminal() -> bool:
    """Whether a person could answer a prompt. A closed or replaced stdin counts as nobody."""
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError):
        return False


@dataclass
class RunContext:
    """Global options, resolved once by the root callback."""

    file: Path | None = None
    json_output: bool = False
    yes: bool = False
    _no_input: bool = field(default=False, repr=False)

    @property
    def no_input(self) -> bool:
        """True when nothing may block on a human.

        Set explicitly with `--no-input`, and implied by JSON mode, by a
        non-terminal stdin, and by `CI=true` — an agent that forgot the flag
        still never hangs on a prompt.
        """
        return self._no_input or self.json_output or not _stdin_is_a_terminal() or _env_flag("CI")

    def entry_file(self) -> Path:
        """Resolve the local ledger: `--file`, then `$BEA_FILE`, then `./main.bean`."""
        candidate = self.file
        source = "--file"
        if candidate is None:
            env_file = os.environ.get("BEA_FILE")
            if env_file:
                candidate, source = Path(env_file).expanduser(), "$BEA_FILE"
        if candidate is None:
            candidate, source = DEFAULT_ENTRY_FILE, "the working directory"

        if not candidate.exists():
            raise UsageError(
                f"No ledger file at '{candidate}' (from {source}). "
                f"Name one with --file PATH, set BEA_FILE, or run from a directory containing "
                f"{DEFAULT_ENTRY_FILE}."
            )
        # Absolute from here on: the beancount loader asserts on a relative
        # entry path, and every include is resolved against this one.
        return candidate.resolve()

    def confirm(self, prompt: str) -> bool:
        """Ask before something destructive; refuse to guess when nobody can answer."""
        if self.yes:
            return True
        if self.no_input:
            raise UsageError(f"{prompt} Refusing to ask — pass --yes to confirm without a prompt.")
        import typer

        return typer.confirm(prompt)


_context = RunContext()


def configure(
    *,
    file: Path | None = None,
    json_output: bool = False,
    no_input: bool = False,
    yes: bool = False,
) -> RunContext:
    global _context
    _context = RunContext(file=file, json_output=json_output, yes=yes, _no_input=no_input)
    return _context


def current() -> RunContext:
    return _context
