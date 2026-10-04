"""`--strict` refuses an interactive session on a ledger that does not load (w3/401).

`--strict` refuses a partial answer for a one-shot query, but the no-query/TTY
branch launched the engine's `shell` command without forwarding the resolved
read policy. The shell opened and answered leniently from a ledger with a
failed balance assertion — and `--no-errors`, which exists only to quieten the
startup banner, then hid the one remaining sign that anything was wrong.

The policy now reaches `interactive()`, which gates the load before the prompt
appears, the same way a one-shot query is gated. Display suppression and
validation are separate concerns again: `--no-errors` still hides the banner,
and the refusal still happens.
"""

from __future__ import annotations

import os
import pty
import re
import select
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

# Cash is -10 USD, so the assertion fails and the ledger does not load cleanly.
INVALID = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch"
  Assets:Cash -10 USD
  Expenses:Food
2026-01-03 balance Assets:Cash 0 USD
"""
VALID = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch"
  Assets:Cash -10 USD
  Expenses:Food
"""

REFUSAL = "Ledger has 1 error(s)"


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        # beanquery keeps its shell history under ~; parallel tests must not share it.
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _session(
    tmp_path: Path, ledger: Path, *, strict: bool = False, query_flags: tuple[str, ...] = (), timeout: float = 120.0
) -> tuple[int, str]:
    """Open the shell, type one query and `.exit`, and report status and screen.

    `--strict` is a global option and the rest belong to `query`, so the two
    go on opposite sides of the subcommand name.

    The query is only sent once a prompt appears — a refused session never
    shows one, which is the behaviour under test.
    """
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        argv = [str(BEA), *(("--strict",) if strict else ()), "--file", str(ledger), "query", *query_flags]
        os.execve(str(BEA), argv, _env(tmp_path))
    screen = ""
    sent = False
    started = time.time()
    try:
        while True:
            if not sent and "beanquery>" in screen:
                os.write(fd, b"SELECT count(*) AS n\n.exit\n")
                sent = True
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:  # The PTY closes as the child exits.
                    chunk = b""
                if chunk:
                    screen += chunk.decode("utf-8", "replace")
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                return os.waitstatus_to_exitcode(status), screen
            if time.time() - started > timeout:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"the shell never exited; screen was {screen!r}")
    finally:
        os.close(fd)


@pytest.fixture
def invalid(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(INVALID, encoding="utf-8")
    return path


@pytest.fixture
def valid(tmp_path: Path) -> Path:
    path = tmp_path / "clean.bean"
    path.write_text(VALID, encoding="utf-8")
    return path


def test_strict_refuses_before_the_prompt(tmp_path: Path, invalid: Path) -> None:
    status, screen = _session(tmp_path, invalid, strict=True)

    assert status == 1, screen
    assert REFUSAL in screen
    assert "Pass --allow-errors" in screen
    assert "beanquery>" not in screen, "a refused session must not reach the prompt"
    assert "Traceback" not in screen, "the refusal is a message, not a crash"


def test_quietening_the_banner_does_not_disable_validation(tmp_path: Path, invalid: Path) -> None:
    """The worst shape of the bug: `--no-errors` made an invalid ledger silent."""
    status, screen = _session(tmp_path, invalid, strict=True, query_flags=("--no-errors",))

    assert status == 1, screen
    assert REFUSAL in screen
    assert "beanquery>" not in screen


def test_allow_errors_still_opens_the_session(tmp_path: Path, invalid: Path) -> None:
    """The documented opt-in, and the control that keeps the refusal narrow."""
    status, screen = _session(tmp_path, invalid, strict=True, query_flags=("--allow-errors",))

    assert status == 0, screen
    assert "beanquery>" in screen
    assert "Balance failed" in screen, "the banner still reports why it is partial"
    assert "\n2\n" in screen.replace("\r", ""), "and the session answers"


def test_a_terminal_is_lenient_by_default(tmp_path: Path, invalid: Path) -> None:
    """Without `--strict`, a person at a terminal keeps today's behaviour."""
    status, screen = _session(tmp_path, invalid)

    assert status == 0, screen
    assert "beanquery>" in screen
    assert "\n2\n" in screen.replace("\r", "")


def test_strict_opens_a_clean_ledger(tmp_path: Path, valid: Path) -> None:
    """`--strict` refuses invalid loads, not strict sessions."""
    status, screen = _session(tmp_path, valid, strict=True)

    assert status == 0, screen
    assert "beanquery>" in screen
    assert "\n2\n" in screen.replace("\r", "")


def test_the_one_shot_policy_is_unchanged(tmp_path: Path, invalid: Path) -> None:
    """The control the report used: this path was always right."""
    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "--strict", "--file", str(invalid), "query", "SELECT sum(position)"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 1
    assert REFUSAL in done.stderr
    assert done.stdout == ""


# ---------------------------------------------------------------------------
# `.reload` keeps the policy (w1/039)
#
# The startup gate saw only the first load. `.reload` swapped in whatever the
# file held now, and a strict session then answered from a ledger with a
# failed assertion — silently, under `--no-errors`. The shell now keeps the
# resolved policy and re-checks it before every query, typed or stored.
# ---------------------------------------------------------------------------

BROKEN = VALID + "2026-01-03 balance Assets:Cash 0 USD\n"
STORED = '2026-01-04 query "cash" "SELECT sum(position) AS cash_total WHERE account = \'Assets:Cash\'"\n'
QUERY = b"SELECT sum(position) AS cash_total WHERE account = 'Assets:Cash';\n"
# A rendered table: the header, then its rule. The echoed input line carries
# the alias too, but never a rule directly beneath it.
TABLE = re.compile(r"cash_total\s*\r?\n-{5,}")


def _reload_session(
    tmp_path: Path, ledger: Path, steps: list[tuple[str | None, bytes]], *, query_flags: tuple[str, ...] = ()
) -> tuple[int, str, list[str]]:
    """Open a strict shell and play `steps`, one per prompt.

    Each step optionally rewrites the ledger first, then types its input. The
    screen is returned whole and also split per step, so an assertion can say
    which part of the session printed what.
    """
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        argv = [str(BEA), "--strict", "--file", str(ledger), "query", *query_flags]
        os.execve(str(BEA), argv, _env(tmp_path))
    screen = ""
    marks: list[int] = []
    started = time.time()
    try:
        while True:
            if len(marks) < len(steps) and screen.count("beanquery>") > len(marks):
                text, typed = steps[len(marks)]
                if text is not None:
                    ledger.write_text(text, encoding="utf-8")
                marks.append(len(screen))
                os.write(fd, typed)
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:  # The PTY closes as the child exits.
                    chunk = b""
                if chunk:
                    screen += chunk.decode("utf-8", "replace")
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                bounds = [*marks, len(screen)]
                parts = [screen[start:end] for start, end in zip(bounds, bounds[1:], strict=False)]
                return os.waitstatus_to_exitcode(status), screen, parts
            if time.time() - started > 120:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"the shell never exited; screen was {screen!r}")
    finally:
        os.close(fd)


@pytest.mark.parametrize("query_flags", [(), ("--no-errors",)], ids=["banner", "no-errors"])
def test_strict_refuses_queries_after_an_invalid_reload(
    tmp_path: Path, valid: Path, query_flags: tuple[str, ...]
) -> None:
    broken = BROKEN + STORED
    status, screen, parts = _reload_session(
        tmp_path,
        valid,
        [(broken, b".reload\n"), (None, QUERY), (None, b".run cash\n"), (None, b".exit\n")],
        query_flags=query_flags,
    )

    assert status == 0, screen
    assert "queries are refused" in parts[0], "the reload itself says the session now refuses"
    assert REFUSAL in parts[1] and "Pass --allow-errors" in parts[1]
    assert REFUSAL in parts[2], "a stored query is gated too"
    assert not TABLE.search(screen), "a strict session must not answer from the invalid load"
    assert "Traceback" not in screen
    assert valid.read_text(encoding="utf-8") == broken, "querying never writes the ledger"


def test_a_clean_reload_restores_answers(tmp_path: Path, valid: Path) -> None:
    status, screen, parts = _reload_session(
        tmp_path,
        valid,
        [(BROKEN, b".reload\n"), (None, QUERY), (VALID, b".reload\n"), (None, QUERY), (None, b".exit\n")],
        query_flags=("--no-errors",),
    )

    assert status == 0, screen
    assert REFUSAL in parts[1] and not TABLE.search(parts[1])
    assert "refused" not in parts[2], "a clean reload lifts the refusal"
    assert TABLE.search(parts[3]) and "-10 USD" in parts[3], screen


def test_allow_errors_keeps_answering_after_an_invalid_reload(tmp_path: Path, valid: Path) -> None:
    status, screen, parts = _reload_session(
        tmp_path,
        valid,
        [(BROKEN, b".reload\n"), (None, QUERY), (None, b".exit\n")],
        query_flags=("--allow-errors",),
    )

    assert status == 0, screen
    assert "Balance failed" in parts[0], "the banner still reports why it is partial"
    assert "refused" not in screen
    assert TABLE.search(parts[1]) and "-10 USD" in parts[1], screen
