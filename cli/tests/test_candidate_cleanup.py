"""Staged `.bea-*.tmp` candidates must not outlive the write that made them (w5/014).

Every write stages a full copy of the ledger beside it and drops it in a
`finally`. That cleanup only runs if the engine child is told to stop — and a
supervisor, a container stop or `Popen.terminate()` signals the frontend's pid
alone, leaving a complete copy of the user's books behind on every attempt.

Two mechanisms, tested separately because they cover different failures: the
frontend forwards a termination signal so the child can unwind, and a later
write sweeps candidates old enough that nothing can still own them, which is the
only thing that covers SIGKILL.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

from bea_engine.ledger.write import _ABANDONED_CANDIDATE_SECONDS, sweep_abandoned_candidates

ROOT = Path(__file__).resolve().parents[1]


def _aged(path: Path, seconds: float) -> Path:
    path.touch()
    old = time.time() - seconds
    os.utime(path, (old, old))
    return path


class TestSweepAbandonedCandidates:
    def test_it_removes_a_candidate_no_live_write_could_own(self, tmp_path: Path) -> None:
        stale = _aged(tmp_path / ".bea-abandoned.tmp", _ABANDONED_CANDIDATE_SECONDS * 2)

        sweep_abandoned_candidates(tmp_path)

        assert not stale.exists()

    def test_it_keeps_a_candidate_a_running_write_may_still_be_using(self, tmp_path: Path) -> None:
        """Another bea may be mid-write in the same directory; only age makes this safe."""
        fresh = tmp_path / ".bea-in-flight.tmp"
        fresh.touch()

        sweep_abandoned_candidates(tmp_path)

        assert fresh.exists()

    def test_it_removes_an_abandoned_picklecache_too(self, tmp_path: Path) -> None:
        cache = _aged(tmp_path / ".bea-abandoned.tmp.picklecache", _ABANDONED_CANDIDATE_SECONDS * 2)

        sweep_abandoned_candidates(tmp_path)

        assert not cache.exists()

    def test_it_touches_nothing_else(self, tmp_path: Path) -> None:
        ledger = _aged(tmp_path / "main.bean", _ABANDONED_CANDIDATE_SECONDS * 2)
        hidden = _aged(tmp_path / ".hidden", _ABANDONED_CANDIDATE_SECONDS * 2)
        directory = tmp_path / ".bea-looks-like-one"
        directory.mkdir()

        sweep_abandoned_candidates(tmp_path)

        assert ledger.exists()
        assert hidden.exists()
        assert directory.exists()

    def test_a_directory_it_cannot_read_is_not_an_error(self, tmp_path: Path) -> None:
        """Sweeping is best effort; it must never fail the write that was asked for."""
        sweep_abandoned_candidates(tmp_path / "does-not-exist")


def test_a_write_clears_abandoned_candidates_beside_the_ledger(tmp_path: Path) -> None:
    from typer.testing import CliRunner

    from cli.main import app

    runner = CliRunner()
    created = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", "USD", "--date", "2026-01-01"])
    assert created.exit_code == 0, created.output
    ledger = tmp_path / "main.bean"
    stale = _aged(tmp_path / ".bea-left-by-a-kill.tmp", _ABANDONED_CANDIDATE_SECONDS * 2)
    fresh = tmp_path / ".bea-in-flight.tmp"
    fresh.touch()

    result = runner.invoke(
        app,
        ["--file", str(ledger), "add", "open", "--account", "Expenses:Sweep", "--date", "2026-01-02"],
    )

    assert result.exit_code == 0, result.output
    assert not stale.exists()
    assert fresh.exists()


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_a_terminated_frontend_passes_the_signal_to_the_engine(tmp_path: Path) -> None:
    """Killing the frontend by pid alone used to orphan the child mid-write."""
    ready = tmp_path / "child-started"
    signalled = tmp_path / "child-was-signalled"
    stub = tmp_path / "stub_engine.py"
    stub.write_text(
        "import signal, sys, time\n"
        "from pathlib import Path\n"
        f"def handler(number, frame):\n"
        f"    Path({str(signalled)!r}).write_text(str(number))\n"
        "    sys.exit(0)\n"
        "signal.signal(signal.SIGTERM, handler)\n"
        f"Path({str(ready)!r}).touch()\n"
        "time.sleep(30)\n",
        encoding="utf-8",
    )
    driver = tmp_path / "driver.py"
    driver.write_text(
        "import sys\n"
        f"sys.path.insert(0, {str(ROOT / 'src')!r})\n"
        "from cli.engine import launch\n"
        f"launch.helper_command = lambda: ([sys.executable, {str(stub)!r}], None)\n"
        "launch.helper_json(['check', '--file', 'ignored'])\n",
        encoding="utf-8",
    )

    frontend = subprocess.Popen([sys.executable, str(driver)])
    try:
        deadline = time.time() + 30
        while not ready.exists() and time.time() < deadline:
            time.sleep(0.05)
        assert ready.exists(), "the stub engine never started"
        frontend.terminate()
        frontend.wait(timeout=30)
    finally:
        if frontend.poll() is None:  # pragma: no cover - only on an unexpected hang
            frontend.kill()

    assert signalled.exists(), "the engine child was never told the frontend was stopping"
    assert signalled.read_text() == "15"
