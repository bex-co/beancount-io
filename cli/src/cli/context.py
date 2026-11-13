"""The run context: one resolved answer to "which ledger, and may I prompt?".

Commands never read `sys.argv`, the environment, or `main.bean` themselves.
They ask the context, so target resolution and prompt suppression are defined
once and behave identically for a person, a script, and a coding agent.
"""

from __future__ import annotations

import os
import shlex
import sys
from collections.abc import Callable
from contextlib import redirect_stdout
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cli.config import DEFAULT_ENTRY_FILE
from cli.errors import UsageError
from cli.paths import expand_path, is_descriptor_path, refuse_too_long_name

_TRUE = {"1", "true", "yes", "on"}


def env_flag(name: str) -> bool:
    """Whether an environment switch is on. Shared so `CI` means the same thing everywhere."""
    return os.environ.get(name, "").strip().lower() in _TRUE


def _stdin_is_a_terminal() -> bool:
    """Whether a person could answer a prompt. A closed or replaced stdin counts as nobody."""
    try:
        return sys.stdin.isatty()
    except (AttributeError, ValueError):
        return False


def _stdout_is_a_terminal() -> bool:
    """Whether a person is reading the table. Piped stdout means a script is."""
    try:
        return sys.stdout.isatty()
    except (AttributeError, ValueError):
        return False


def _stderr_is_a_terminal() -> bool:
    """Whether a person would see a question. Prompts go to stderr, so stdout carries only results."""
    try:
        return sys.stderr.isatty()
    except (AttributeError, ValueError):
        return False


def _child_ledger() -> Path | None:
    """The first root ledger one directory below the working directory, by name.

    Hidden directories are skipped; an unreadable directory counts as none.
    """
    from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS

    try:
        children = sorted(entry.name for entry in os.scandir() if not entry.name.startswith(".") and entry.is_dir())
    except OSError:
        return None
    for child in children:
        for name in DEFAULT_ENTRY_FILE_FALLBACKS:
            try:
                if (Path(child) / name).is_file():
                    return Path(child) / name
            except OSError:
                break
    return None


@dataclass
class RunContext:
    """Global options, resolved once by the root callback."""

    file: Path | None = None
    json_output: bool = False
    yes: bool = False
    debug: bool = False
    strict: bool = False
    offline: bool = False
    strict_prices: bool = False
    _no_input: bool = field(default=False, repr=False)

    def require_network(self, command: str) -> None:
        """Refuse a command whose purpose requires network access before it starts."""
        if self.offline:
            raise UsageError(f"bea {command} requires network access; remove --offline.")

    @property
    def no_input(self) -> bool:
        """True when nothing may block on a human.

        Set explicitly with `--no-input`, and implied by JSON mode, by a
        non-terminal stdin, and by `CI=true` — an agent that forgot the flag
        still never hangs on a prompt.
        """
        return self._no_input or self.json_output or not _stdin_is_a_terminal() or env_flag("CI")

    @property
    def can_prompt(self) -> bool:
        """True when a question can be both seen and answered.

        Prompts are written to stderr, so a redirected stdout does not hide
        them; with stderr redirected too nobody would see the question, and
        the run behaves as under `--no-input` instead of waiting (w5/163).
        """
        return not self.no_input and _stderr_is_a_terminal()

    @property
    def stdout_is_a_terminal(self) -> bool:
        """True when what is drawn on stdout reaches the person at the keyboard."""
        return _stdout_is_a_terminal()

    def strict_reads(self) -> bool:
        """True when a read must refuse partial answers.

        Strict under `--strict`, under `--json`, when stdout is not a
        terminal (a pipe is a script), or when `CI` is truthy. A person at
        a terminal gets data plus a banner instead.
        """
        return self.strict or self.json_output or not _stdout_is_a_terminal() or env_flag("CI")

    def entry_file(self) -> Path:
        """Resolve the local ledger: `--file`, then `$BEA_FILE`, then cwd defaults.

        Cwd discovery prefers `./main.bean`, then `./main.beancount` when the
        `.bean` name is absent.
        """
        from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS, default_entry

        candidate = expand_path(self.file, "--file") if self.file is not None else None
        source = "--file"
        if candidate is None:
            env_file = os.environ.get("BEA_FILE")
            if env_file:
                candidate, source = expand_path(Path(env_file), "$BEA_FILE"), "$BEA_FILE"
        if candidate is None:
            # Present, not just a file: a dangling `main.bean` link or a
            # `main.bean` directory fell through to an older `main.beancount`,
            # silently, and writes landed there while `init` refused the same
            # entry as an existing ledger (w5/295).
            candidate, source = default_entry() or DEFAULT_ENTRY_FILE, "the working directory"

        if is_descriptor_path(candidate):
            # A ledger needs a stable path for its includes and cache; a
            # descriptor is refused by name instead of failing mid-load (w5/792).
            raise UsageError(
                f"Ledger path '{candidate}' (from {source}) is a file descriptor, not a file. "
                "Point --file at the ledger file."
            )
        refuse_too_long_name(candidate, f"Ledger path (from {source})")
        try:
            link = candidate.is_symlink()
            present = candidate.exists()
            directory = candidate.is_dir()
            regular = candidate.is_file()
        except PermissionError:
            # An ancestor without search permission (w5/793): the same
            # refusal an unreadable file gets.
            raise UsageError(f"Ledger path '{candidate}' (from {source}) is not readable.") from None
        if link and not present:
            raise UsageError(
                f"Ledger path '{candidate}' (from {source}) is a broken symbolic link to "
                f"'{os.readlink(candidate)}'. Restore its target, or point --file at the ledger."
            )
        if not present:
            if source == "$BEA_FILE":
                raise UsageError(
                    f"No ledger file at '{candidate}' (from $BEA_FILE). "
                    f"Unset or fix BEA_FILE, or pass --file PATH to override it. "
                    f"Cwd discovery of main.bean/main.beancount is skipped while BEA_FILE is set."
                )
            # Suggesting `init books` one directory above existing books
            # names a command that can only refuse (w5/219).
            nearby = _child_ledger() if source == "the working directory" else None
            start = (
                f"Found {shlex.quote(str(nearby))} here: run cd {shlex.quote(str(nearby.parent))}, "
                f"or pass --file {shlex.quote(str(nearby))}."
                if nearby
                else "To start new books, run bea init books --currency USD."
            )
            raise UsageError(
                f"No ledger file at '{candidate}' (from {source}). "
                f"Name one with --file PATH, set BEA_FILE, or run from a directory containing "
                f"main.bean or main.beancount. {start}"
            )
        if directory:
            try:
                hint = next(
                    (candidate / name for name in DEFAULT_ENTRY_FILE_FALLBACKS if (candidate / name).is_file()),
                    candidate / DEFAULT_ENTRY_FILE_FALLBACKS[0],
                )
            except PermissionError:
                hint = candidate / DEFAULT_ENTRY_FILE_FALLBACKS[0]
            raise UsageError(
                f"Ledger path '{candidate}' (from {source}) is a directory; expected a ledger file. "
                f"Point --file to its root ledger, for example --file {shlex.quote(str(hint))}."
            )
        if not regular:
            raise UsageError(f"Ledger path '{candidate}' (from {source}) is not a regular file.")
        if not os.access(candidate, os.R_OK):
            raise UsageError(f"Ledger path '{candidate}' (from {source}) is not readable.")
        # Absolute from here on: the beancount loader asserts on a relative
        # entry path, and every include is resolved against this one. Lexical
        # like the loader's own `abspath`: a symlinked root resolves its
        # includes beside the link, as `bean-check` does (w1/056).
        entry = os.path.abspath(candidate)
        refuse_expanding_ledger_path(entry, f" (from {source})")
        return Path(entry)

    def confirm(self, prompt: str) -> bool:
        """Ask before something destructive; refuse to guess when nobody can answer."""
        if self.yes:
            return True
        if not self.can_prompt:
            raise UsageError(f"{prompt} Refusing to ask — pass --yes to confirm without a prompt.")
        import typer

        with redirect_stdout(sys.stderr):
            return typer.confirm(prompt, err=True)

    def prompt(self, text: str, *, default: str, value_proc: Callable[[str], Any]) -> Any:
        """Ask a question on stderr; callers check `can_prompt` first.

        Click still writes the space after the question on stdout under
        `err=True`, so stdout is pointed at stderr for the duration.
        """
        import typer

        with redirect_stdout(sys.stderr):
            return typer.prompt(text, default=default, value_proc=value_proc, err=True)


_context = RunContext()


def configure(
    *,
    file: Path | None = None,
    json_output: bool = False,
    no_input: bool = False,
    yes: bool = False,
    debug: bool = False,
    strict: bool = False,
    offline: bool = False,
    strict_prices: bool = False,
) -> RunContext:
    global _context
    _context = RunContext(
        file=file,
        json_output=json_output,
        yes=yes,
        _no_input=no_input,
        debug=debug,
        strict=strict,
        offline=offline,
        strict_prices=strict_prices,
    )
    return _context


def current() -> RunContext:
    return _context


def refuse_terminal_stdin(message: str) -> None:
    """Refuse to read stdin when it is a terminal and nothing may wait for a human.

    A pipe or a redirect is read as before, and an interactive run may still
    type the input and end it with Ctrl-D; only the unattended run on a
    terminal (`--no-input`, `--json`, `CI`) would otherwise sit there (w5/210).
    """
    if _stdin_is_a_terminal() and _context.no_input:
        raise UsageError(message)


def refuse_expanding_ledger_path(entry: str, source: str = "") -> None:
    """Refuse a root ledger path that Beancount would read as another file.

    Beancount's loader and `bean-check` run `expandvars` on the root path, so
    `$X.bean` with X set read a different ledger while `add` wrote this one,
    and every read reported that other ledger with exit 0 (w5/315). Only an
    expansion that changes the path is refused: `$X` with X unset loads as
    written.
    """
    expanded = os.path.expandvars(entry)
    if expanded != entry:
        raise UsageError(
            f"Ledger path '{entry}'{source} contains an environment variable that Beancount "
            f"would expand, reading '{expanded}' instead. "
            "Rename the file or directory without '$', or unset that variable."
        )
