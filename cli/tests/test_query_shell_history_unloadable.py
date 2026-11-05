"""A history the query shell cannot load costs the history, not the session (w5/235).

Leaving `bea query` with Ctrl-D before typing anything wrote a history file
holding only the line editor's header. libedit refuses to load such a file, and
upstream guards the load against a missing file only, so every later session
died in a traceback ending `PermissionError: [Errno 1] Operation not permitted`
before its first prompt — until the customer found and deleted
`~/.config/beanquery/history`. An empty, unreadable or directory history did
the same.

These need a real terminal: the line editor is set up only for one.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

PROMPT = "beanquery> "
CTRL_D = b"\x04"
NOTE = "Cannot load query history"
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-05 * "Cafe" "Coffee"
  Expenses:Food  4.00 USD
  Assets:Cash
"""


def _argv(tmp_path: Path, native: bool) -> list[str]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    return ["query", "--source", str(ledger)] if native else ["-f", str(ledger), "query"]


def _history(tmp_path: Path) -> Path:
    return tmp_path / "startup" / "history"


def _session(tmp_path: Path, argv: list[str], *typed: str, leave_with_ctrl_d: bool = False) -> tuple[int, str]:
    """One shell session: wait for the prompt, type each line, leave."""
    with QueryTerminal(tmp_path, argv) as terminal:
        terminal.read(PROMPT)
        for line in typed:
            terminal.send(line)
            terminal.read(PROMPT)
        if leave_with_ctrl_d:
            os.write(terminal.fd, CTRL_D)
            terminal.read()
            status = terminal.process.wait(timeout=10)
        else:
            status = terminal.finish()
        return status, terminal.screen


def _assert_answers(status: int, screen: str) -> None:
    assert status == 0, screen
    assert "Traceback" not in screen, screen
    assert "PermissionError" not in screen, screen
    assert "4.00 USD" in screen, f"the session did not answer its query: {screen!r}"


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_a_session_that_typed_nothing_does_not_break_the_next_one(tmp_path: Path, native: bool) -> None:
    argv = _argv(tmp_path, native)

    status, screen = _session(tmp_path, argv, leave_with_ctrl_d=True)
    assert status == 0, screen
    assert not _history(tmp_path).exists(), "an empty history is one the line editor may refuse to load"

    status, screen = _session(tmp_path, argv, "SELECT sum(position) AS total WHERE account ~ 'Food'")

    _assert_answers(status, screen)
    assert NOTE not in screen, "an empty session is not a history problem"


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
@pytest.mark.parametrize("problem", ["header-only", "empty", "unreadable", "directory"])
def test_an_unloadable_history_costs_one_line_and_not_the_session(tmp_path: Path, native: bool, problem: str) -> None:
    argv = _argv(tmp_path, native)
    history = _history(tmp_path)
    history.parent.mkdir()
    if problem == "directory":
        history.mkdir()
    else:
        # What the exit-time write used to leave behind after an empty session.
        history.write_text("_HiStOrY_V2_\n" if problem == "header-only" else "", encoding="utf-8")
    if problem == "unreadable":
        if os.geteuid() == 0:
            pytest.skip("root reads any file")
        history.chmod(0o000)

    try:
        # Backends bearing the same libedit name differ on header-only histories.
        # Probe the actual interpreter in isolation, before the session overwrites
        # the fixture, rather than inferring support from readline.__doc__.
        probe = subprocess.run(
            [
                sys.executable,
                "-c",
                "import readline, sys\n"
                "try:\n"
                "    readline.read_history_file(sys.argv[1])\n"
                "except OSError:\n"
                "    sys.exit(2)\n",
                str(history),
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        assert probe.returncode in {0, 2}, probe.stderr
        status, screen = _session(tmp_path, argv, "SELECT sum(position) AS total WHERE account ~ 'Food'")
    finally:
        if problem == "unreadable":
            history.chmod(0o600)

    _assert_answers(status, screen)
    notes = [line for line in screen.splitlines() if NOTE in line]
    if problem in {"unreadable", "directory"}:
        assert len(notes) == 1, screen
        assert str(history) in notes[0]
        assert screen.index(NOTE) < screen.index(PROMPT), "the note belongs before the first prompt"
    else:
        assert len(notes) == (1 if probe.returncode == 2 else 0), screen
    assert "Cannot save query history" not in screen, "one line per session, not one at each end"


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_a_session_that_typed_a_query_still_saves_and_reloads_it(tmp_path: Path, native: bool) -> None:
    """The note's control: a history with an entry round-trips."""
    argv = _argv(tmp_path, native)

    status, screen = _session(tmp_path, argv, "SELECT 1 AS remembered LIMIT 1", leave_with_ctrl_d=True)
    assert status == 0, screen
    assert _history(tmp_path).is_file()

    status, screen = _session(tmp_path, argv, ".history")

    assert status == 0, screen
    assert NOTE not in screen
    assert "SELECT 1 AS remembered LIMIT 1" in screen, "the saved entry did not come back"
