"""The query shell reports bea's own usage errors without a traceback (w3/397).

`do_run` and `on_Print` raise `protocol.UsageError` for ordinary bad input.
Upstream's `cmdloop` catches everything and renders anything it does not
recognize with `traceback.format_exc()`, so typing `.run missing` printed a
Python stack at the prompt — and dropped the `details` line naming the stored
queries that do exist, which the one-shot form shows. `--debug` is the
documented way to ask for a traceback.

One-shot execution has to keep propagating the same exception, because its
exit code and JSON error envelope are built from it. That split is the point
of the fix and is pinned below.

These need a real terminal: the shell only runs with a TTY, so each case is
driven through `pty.fork()`.
"""

from __future__ import annotations

import json
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

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Dinner"
  Assets:Cash -10 USD
  Expenses:Food
2026-01-03 query "cash" "SELECT sum(position) WHERE account = 'Assets:Cash'"
"""

TRACEBACK = "Traceback (most recent call last)"


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


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _shell_session(
    tmp_path: Path, ledger: Path, script: str, timeout: float = 120.0, *, native: bool = False
) -> tuple[int, str]:
    """Type `script` into a real query shell and return its status and screen."""
    argv = ["query", "--source", str(ledger)] if native else ["--file", str(ledger), "query"]
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), *argv], _env(tmp_path))
    screen = ""
    sent = False
    started = time.time()
    try:
        while True:
            if not sent and "beanquery>" in screen:
                os.write(fd, script.encode())
                sent = True
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:
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


def test_a_missing_stored_query_is_reported_with_its_recovery_detail(tmp_path: Path, ledger: Path) -> None:
    status, screen = _shell_session(tmp_path, ledger, ".run missing\n.exit\n")

    assert status == 0
    assert TRACEBACK not in screen
    assert 'query "missing" not found.' in screen
    assert "Stored queries in this ledger: cash." in screen, "the detail the one-shot form shows"


def test_print_under_csv_is_reported_without_a_stack(tmp_path: Path, ledger: Path) -> None:
    status, screen = _shell_session(tmp_path, ledger, ".format csv\nPRINT\n.exit\n")

    assert status == 0
    assert TRACEBACK not in screen
    assert "PRINT renders Beancount directives" in screen


def test_the_session_recovers_and_keeps_working(tmp_path: Path, ledger: Path) -> None:
    """The whole reported session: two mistakes, then real work, then a clean exit."""
    status, screen = _shell_session(
        tmp_path,
        ledger,
        ".run missing\n.run cash\nSELECT broken(\n.format csv\nPRINT\n.format text\nSELECT count(*) AS n;\n.exit\n",
    )

    assert status == 0
    assert TRACEBACK not in screen
    assert "-10 USD" in screen, "the valid stored query still runs"
    assert "\n2\n" in screen.replace("\r", ""), "the final SELECT still counts both entries"
    assert ledger.read_text(encoding="utf-8") == LEDGER


def test_a_native_syntax_error_keeps_its_own_rendering(tmp_path: Path, ledger: Path) -> None:
    """Beanquery renders its own parse errors as short diagnostics; leave them be."""
    status, screen = _shell_session(tmp_path, ledger, "SELECT broken(\n.exit\n")

    assert status == 0
    assert TRACEBACK not in screen
    assert "syntax error" in screen
    assert "^" in screen, "the caret upstream prints under the offending token"


COMPILE_FAILURES = {
    "SELECT DISTINCT tags;": "BQL cannot use DISTINCT or GROUP BY on tags",
    "SELECT account GROUP BY accounts;": "BQL cannot use DISTINCT or GROUP BY on accounts",
    "SELECT (SELECT 1);": "BQL cannot use a subquery in the SELECT list.",
}


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_compile_failures_at_the_prompt_say_what_the_one_shot_says(tmp_path: Path, ledger: Path, native: bool) -> None:
    """Queries Beanquery cannot compile are explained at the prompt, not dumped as stacks (w1/067).

    The translation lived only on the one-shot path, so the shell printed
    `SyntaxError: cannot use starred expression here` and friends.
    """
    script = "".join(f"{line}\n" for line in COMPILE_FAILURES) + "SELECT count(*) AS n;\n.exit\n"
    status, screen = _shell_session(tmp_path, ledger, script, native=native)

    assert status == 0, screen
    assert TRACEBACK not in screen
    for message in COMPILE_FAILURES.values():
        assert message in screen
    assert "\n2\n" in screen.replace("\r", ""), "the session keeps answering afterwards"


def test_a_stored_query_that_cannot_compile_is_explained_too(tmp_path: Path, ledger: Path) -> None:
    ledger.write_text(LEDGER + '2026-01-04 query "sets" "SELECT DISTINCT tags"\n', encoding="utf-8")
    status, screen = _shell_session(tmp_path, ledger, ".run sets\n.exit\n")

    assert status == 0, screen
    assert TRACEBACK not in screen
    assert "BQL cannot use DISTINCT or GROUP BY on tags" in screen


def test_a_native_one_shot_compile_failure_is_a_usage_error(tmp_path: Path, ledger: Path) -> None:
    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "query", "--source", str(ledger), "SELECT DISTINCT tags"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 2, done.stderr
    assert "SyntaxError" not in done.stderr
    assert "BQL cannot use DISTINCT or GROUP BY on tags" in done.stderr


def test_interactive_headers_are_complete_and_narrow_remains_an_explicit_option(tmp_path: Path, ledger: Path) -> None:
    ledger.write_text(
        "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n"
        + "".join(f'2026-01-{day:02} * "Lunch"\n  Assets:Cash -1 USD\n  Expenses:Food 1 USD\n' for day in range(2, 8))
    )
    before = ledger.read_bytes()
    status, screen = _shell_session(
        tmp_path,
        ledger,
        "SELECT count(*);\n.set narrow true\nSELECT count(*);\n.set narrow false\nSELECT count(*);\n.exit\n",
    )

    assert status == 0, screen
    # Match rendered tables, not the echoed SELECT text at the PTY prompt.
    headers = re.findall(r"(?m)^([^\n]+)\n-+\n[ \t]*12[ \t]*\n", screen.replace("\r", ""))
    assert [header.strip() for header in headers] == ["count(*)", "co", "count(*)"], screen
    assert ledger.read_bytes() == before


def test_output_redirection_recovery_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    """w5/006's behaviour, which shares this command boundary."""
    status, screen = _shell_session(tmp_path, ledger, ".output /nonexistent-dir/x.txt\nSELECT count(*) AS n;\n.exit\n")

    assert status == 0
    assert TRACEBACK not in screen
    assert "Cannot write to /nonexistent-dir/x.txt" in screen


def _one_shot(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "query", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_one_shot_still_fails_with_its_exit_code_and_details(tmp_path: Path, ledger: Path) -> None:
    """The split the fix depends on: only the interactive path swallows these."""
    done = _one_shot(tmp_path, ledger, ".run missing")

    assert done.returncode == 2
    assert 'Error: query "missing" not found.' in done.stderr
    assert "Stored queries in this ledger: cash." in done.stderr


def test_the_one_shot_json_envelope_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "query", ".run missing"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 2
    error = json.loads(done.stderr)["error"]
    assert error["category"] == "usage"
    assert error["exit_code"] == 2
    assert error["details"] == ["Stored queries in this ledger: cash."]
