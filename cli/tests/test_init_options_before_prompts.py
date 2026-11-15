"""`bea init` checks its options before asking anything, naming the option it refuses (w5/588).

`--date` and `--opening-balance` were validated only after the currency (and
date) questions were answered, and refused as `Invalid value: …` with no
option named, so a newcomer could not tell which input was wrong.
"""

from __future__ import annotations

import os
import pty
import select
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    ("option", "message"),
    [
        (["--date", "2026-13-01"], "--date '2026-13-01': Invalid date '2026-13-01': not a calendar date"),
        (["--opening-balance", "Assets:Nope 10"], "--opening-balance 'Assets:Nope 10': Assets:Nope is not an account"),
        (["--opening-balance", "Assets:Checking 1e3"], "--opening-balance 'Assets:Checking 1e3': Scientific notation"),
        (
            ["--opening-balance", "Assets:Checking 10 USD"],
            "Give the amount without a currency ('ACCOUNT NUMBER'); it is in the operating currency. "
            "To write 'USD', also pass --currency USD.",
        ),
    ],
    ids=["date", "unknown-account", "scientific-notation", "currency-before-it-is-chosen"],
)
def test_a_bad_option_is_refused_before_the_first_question(tmp_path: Path, option: list[str], message: str) -> None:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(sys.executable, [sys.executable, "-m", "cli.main", "init", "books", *option], env)
    screen = b""
    deadline = time.time() + 60
    try:
        while True:
            ready, _, _ = select.select([fd], [], [], 0.2)
            if ready:
                try:
                    screen += os.read(fd, 65536)
                except OSError:
                    pass
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                break
            assert time.time() < deadline, f"init waited at a question first: {screen!r}"
    finally:
        os.close(fd)

    shown = " ".join(screen.decode("utf-8", "replace").split())
    assert os.waitstatus_to_exitcode(status) == 2, shown
    assert message in shown, shown
    assert "Operating currency" not in shown
    assert not (tmp_path / "books").exists()
