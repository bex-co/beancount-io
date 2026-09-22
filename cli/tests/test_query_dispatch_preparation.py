"""The same BQL text means the same thing however it is submitted (w3/398).

`_executed` applies bea's pre-execution handling — quoting the reserved table
names that BQL also uses as keywords (w3/246, w3/247) and refusing a zero-day
`OPEN ON … CLOSE ON …` window (w3/372) — but it wraps the *outer* request. For
`.run accounts` that request is the dot command, not the stored SQL, and
interactively typed SQL reached upstream's `execute` directly.

So the same text answered differently depending on how it arrived:
`FROM accounts` counted three accounts directly and four postings through
`.run`, `FROM balances` was a syntax error unquoted, and a zero-day window
returned `(no rows)` instead of saying it spans no days.

The preparation now lives in `PreciseShell.execute`, which is the one place
every BQL path arrives at — dot commands go to `do_*` instead.
"""

from __future__ import annotations

import json
import os
import pty
import select
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

COUNT_ACCOUNTS = "SELECT count(*) AS total FROM accounts"
EMPTY_WINDOW = "SELECT date, narration FROM OPEN ON 2026-01-02 CLOSE ON 2026-01-02 WHERE narration = 'Lunch'"
GOOD_WINDOW = "SELECT date, narration FROM OPEN ON 2026-01-02 CLOSE ON 2026-01-03 WHERE narration = 'Lunch'"

LEDGER = f"""option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-01 open Expenses:Food USD
2026-01-01 * "Opening"
  Assets:Cash  100 USD
  Equity:Opening
2026-01-02 * "Lunch"
  Assets:Cash  -10 USD
  Expenses:Food
2026-01-03 balance Assets:Cash 90 USD
2026-01-10 query "accounts" "{COUNT_ACCOUNTS}"
2026-01-10 query "empty" "{EMPTY_WINDOW}"
"""


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
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


def _query(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "query", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _shell_session(tmp_path: Path, ledger: Path, script: str, timeout: float = 120.0) -> tuple[int, str]:
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), "--file", str(ledger), "query"], _env(tmp_path))
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


def test_a_stored_query_resolves_tables_like_a_direct_one(tmp_path: Path, ledger: Path) -> None:
    """Three accounts either way — `accounts` must not bind to postings."""
    direct = _query(tmp_path, ledger, COUNT_ACCOUNTS)
    assert direct.returncode == 0, direct.stderr
    assert json.loads(direct.stdout)["data"]["rows"] == [[3]]

    stored = _query(tmp_path, ledger, ".run accounts")
    assert stored.returncode == 0, stored.stderr
    assert "3" in json.loads(stored.stdout)["data"]["text"]
    assert "4" not in json.loads(stored.stdout)["data"]["text"]


def test_a_stored_query_refuses_a_zero_day_window(tmp_path: Path, ledger: Path) -> None:
    direct = _query(tmp_path, ledger, EMPTY_WINDOW)
    stored = _query(tmp_path, ledger, ".run empty")

    assert direct.returncode == 2
    assert stored.returncode == 2, stored.stdout
    for done in (direct, stored):
        error = json.loads(done.stderr)["error"]
        assert error["category"] == "usage"
        assert "covers no days" in error["message"]
        assert any("CLOSE ON 2026-01-03" in detail for detail in error["details"])


def test_a_valid_window_still_answers(tmp_path: Path, ledger: Path) -> None:
    """The refusal must be about the zero-day span, not about windows at all."""
    done = _query(tmp_path, ledger, GOOD_WINDOW)

    assert done.returncode == 0, done.stderr
    assert len(json.loads(done.stdout)["data"]["rows"]) == 2


def test_the_shell_resolves_reserved_tables(tmp_path: Path, ledger: Path) -> None:
    """Unquoted and quoted spellings must agree, and `balances` must parse."""
    status, screen = _shell_session(
        tmp_path,
        ledger,
        ".set narrow false\n"
        f"{COUNT_ACCOUNTS}\n"
        'SELECT count(*) AS total FROM "accounts"\n'
        "SELECT * FROM balances\n"
        ".exit\n",
    )

    assert status == 0
    assert screen.count("    3") == 2, f"both spellings should count three accounts: {screen!r}"
    assert "syntax error" not in screen, "`balances` unquoted was a keyword parse error"
    assert "90 USD" in screen, "the real balance assertion"


def test_the_shell_refuses_a_zero_day_window_and_stays_usable(tmp_path: Path, ledger: Path) -> None:
    """The refusal reaches the prompt as a message; the session continues."""
    status, screen = _shell_session(tmp_path, ledger, f"{EMPTY_WINDOW}\n.run empty\nSELECT count(*) AS n;\n.exit\n")

    assert status == 0
    assert "Traceback (most recent call last)" not in screen
    assert screen.count("covers no days") == 2, "typed directly and through .run"
    assert "CLOSE ON 2026-01-03" in screen
    assert "\n4\n" in screen.replace("\r", ""), "the session still answers afterwards"


def test_shell_utilities_and_dot_commands_are_untouched(tmp_path: Path, ledger: Path) -> None:
    """Only BQL goes through `execute`; dot commands must keep working."""
    done = _query(tmp_path, ledger, ".tables")
    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["text"].strip(), "`.tables` still lists something"

    status, screen = _shell_session(tmp_path, ledger, ".run accounts\n.exit\n")
    assert status == 0
    assert "3" in screen


def test_string_literals_survive_preparation(tmp_path: Path, ledger: Path) -> None:
    """Quoting rewrites table names after FROM/JOIN, never text the user asked about."""
    done = _query(tmp_path, ledger, "SELECT narration WHERE narration = 'Lunch'")

    assert done.returncode == 0, done.stderr
    assert [row[0] for row in json.loads(done.stdout)["data"]["rows"]] == ["Lunch", "Lunch"]
