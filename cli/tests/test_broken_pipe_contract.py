"""`bea … | head` exits 141 without a message, as the exit table promises (w3/378).

Python ignores SIGPIPE, so before the fix a closed reader surfaced as a
`BrokenPipeError` inside the frontend and was reported like any other failure:
`Error: [Errno 32] Broken pipe` and exit 1, or exit 120 when buffered bytes
were still pending and CPython's shutdown flush failed on top of it.

These tests need a real pipe with an unread tail — `CliRunner`'s StringIO can
never raise EPIPE — so every case spawns `bea` for real and closes the read end
early by piping into `head`.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
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


def _ledger(tmp_path: Path) -> Path:
    # Far past the pipe's own 64 KiB buffer in every rendering: output that fits
    # the buffer is written whole and never sees EPIPE, so a small ledger would
    # pass this test against the old behavior too.
    lines = [LEDGER]
    for index in range(3000):
        day = index % 28 + 1
        lines.append(f'2026-02-{day:02d} * "Cafe {index}" "Coffee"\n  Expenses:Food  5.00 USD\n  Assets:Checking\n')
    path = tmp_path / "books.bean"
    path.write_text("".join(lines), encoding="utf-8")
    return path


def _piped_to_closed_reader(tmp_path: Path, *args: str) -> tuple[int, str]:
    """Run `bea <args> | head -n 1` and report bea's own status and stderr."""
    reader = subprocess.Popen(["head", "-n", "1"], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL)
    assert reader.stdin is not None
    bea = subprocess.Popen(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        stdout=reader.stdin,
        stderr=subprocess.PIPE,
        text=True,
    )
    reader.stdin.close()  # Only `head` holds the read end now.
    stderr = bea.communicate(timeout=120)[1]
    reader.wait(timeout=60)
    return bea.returncode, stderr


@pytest.mark.parametrize(
    "args",
    [
        pytest.param(("--file", "books.bean", "list", "transaction", "--limit", "5000"), id="list"),
        pytest.param(("--file", "books.bean", "query", "PRINT"), id="query"),
        pytest.param(("example",), id="example"),
        # Delegated to a child on inherited streams: upstream is Python too, so
        # it reports its own broken stdout as a plain exit 1 and the frontend
        # has to recognize the closed pipe behind it.
        pytest.param(("format", "books.bean"), id="format"),
    ],
)
def test_closed_reader_exits_141_silently(tmp_path: Path, args: tuple[str, ...]) -> None:
    _ledger(tmp_path)
    status, stderr = _piped_to_closed_reader(tmp_path, *args)
    assert status == 141, f"expected the documented closed-pipe status, got {status}; stderr={stderr!r}"
    assert stderr == "", "a closed downstream pipe has nowhere to report to and must stay silent"


def test_reader_that_stays_open_still_gets_every_row(tmp_path: Path) -> None:
    """The control: nothing above may cost a complete run its output or its 0."""
    ledger = _ledger(tmp_path)
    done = subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "list", "transaction"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert done.returncode == 0, done.stderr
    assert "Coffee" in done.stdout


def test_failing_command_still_reports_when_the_reader_is_alive(tmp_path: Path) -> None:
    """A real failure keeps its own exit code — only a closed pipe becomes 141."""
    broken = tmp_path / "broken.bean"
    broken.write_text('2026-01-02 * "no such account"\n  Assets:Missing  1 USD\n', encoding="utf-8")
    failed = subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(broken), "list", "transaction"],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert failed.returncode not in (0, 141)
    assert failed.stderr.strip()
