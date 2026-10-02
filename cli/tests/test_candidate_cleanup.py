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
import signal
import subprocess
import sys
import textwrap
import time
from concurrent.futures import ThreadPoolExecutor
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


@pytest.mark.parametrize("launch_fails", [False, True], ids=["success", "spawn-error"])
def test_helper_restores_signal_handlers(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, launch_fails: bool) -> None:
    from cli.engine import launch

    command = (
        [str(tmp_path / "missing-engine")]
        if launch_fails
        else [sys.executable, "-c", 'print(\'{"ok": true, "data": {}}\')']
    )
    monkeypatch.setattr(launch, "helper_command", lambda: (command, None))
    previous = [signal.getsignal(number) for number in launch._FORWARDED_SIGNALS]

    if launch_fails:
        with pytest.raises(FileNotFoundError):
            launch.helper_json(["check"])
    else:
        assert launch.helper_json(["check"]) == {}

    assert [signal.getsignal(number) for number in launch._FORWARDED_SIGNALS] == previous


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_worker_thread_helper_keeps_terminal_signal_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sync agent tools run in workers, where Python cannot install signal handlers."""
    from cli.engine import launch

    script = "import json, os\nprint(json.dumps({'ok': True, 'data': {'process_group': os.getpgrp()}}))\n"
    monkeypatch.setattr(launch, "helper_command", lambda: ([sys.executable, "-c", script], None))

    with ThreadPoolExecutor(max_workers=1) as executor:
        result = executor.submit(launch.helper_json, ["check"]).result(timeout=10)

    assert result["process_group"] == os.getpgrp()


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_interrupt_during_spawn_reaches_the_isolated_helper(tmp_path: Path) -> None:
    """The child can exist before Popen returns its handle to the launcher."""
    ready = tmp_path / "child-started"
    signalled = tmp_path / "child-was-signalled"
    engine = tmp_path / "engine.py"
    engine.write_text(
        textwrap.dedent(f"""
            import os, signal, sys, time
            from pathlib import Path

            def interrupted(number, frame):
                Path({str(signalled)!r}).touch()
                sys.exit(0)
            signal.signal(signal.SIGINT, interrupted)
            Path({str(ready)!r}).write_text(str(os.getpid()))
            time.sleep(30)
        """),
        encoding="utf-8",
    )
    driver = tmp_path / "driver.py"
    driver.write_text(
        textwrap.dedent(f"""
            import os, signal, subprocess, sys, time
            from pathlib import Path
            from cli.engine import launch

            real_popen = subprocess.Popen
            def interrupt_before_returning_handle(*args, **kwargs):
                child = real_popen(*args, **kwargs)
                deadline = time.monotonic() + 10
                while not Path({str(ready)!r}).exists():
                    if time.monotonic() >= deadline:
                        child.kill()
                        child.wait()
                        raise RuntimeError('the engine never started')
                    time.sleep(0.005)
                os.killpg(os.getpgrp(), signal.SIGINT)
                return child
            subprocess.Popen = interrupt_before_returning_handle
            launch.helper_command = lambda: ([sys.executable, {str(engine)!r}], None)
            launch.helper_json(['check'])
        """),
        encoding="utf-8",
    )
    frontend = subprocess.Popen(
        [sys.executable, str(driver)],
        env={**os.environ, "PYTHONPATH": str(ROOT / "src")},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        _, err = frontend.communicate(timeout=20)
        assert ready.exists(), err
        assert signalled.exists(), "a signal during Popen left the isolated engine running"
        assert frontend.returncode == -signal.SIGINT, err
    finally:
        if frontend.poll() is None:  # pragma: no cover - only after an unexpected hang
            frontend.kill()
            frontend.communicate(timeout=10)
        if ready.exists() and not signalled.exists():
            # The deliberately broken startup path must not leave its test engine alive.
            try:
                os.kill(int(ready.read_text()), signal.SIGKILL)
            except ProcessLookupError:
                pass


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
@pytest.mark.parametrize("process_group", [False, True], ids=["frontend-pid", "process-group"])
def test_one_interrupt_does_not_interrupt_candidate_cleanup_twice(tmp_path: Path, process_group: bool) -> None:
    """A group interrupt must not reach the engine directly and through forwarding."""
    ready = tmp_path / "child-started"
    cleaning = tmp_path / "cleanup-started"
    release = tmp_path / "release-cleanup"
    ledger = tmp_path / "main.bean"
    ledger.write_text("original ledger\n")
    engine = tmp_path / "engine.py"
    engine.write_text(
        textwrap.dedent(f"""
            import time
            from pathlib import Path
            from bea_engine.ledger.write import candidate_file

            real_unlink = Path.unlink
            def held_unlink(path, *args, **kwargs):
                if path.name.startswith('.bea-'):
                    Path({str(cleaning)!r}).touch()
                    while not Path({str(release)!r}).exists():
                        time.sleep(0.005)
                return real_unlink(path, *args, **kwargs)
            Path.unlink = held_unlink

            with candidate_file(Path({str(ledger)!r}), 'formatted ledger\\n'):
                Path({str(ready)!r}).touch()
                time.sleep(30)
        """),
        encoding="utf-8",
    )
    driver = tmp_path / "driver.py"
    driver.write_text(
        textwrap.dedent(f"""
            import os, signal, subprocess, sys, time
            from pathlib import Path
            from cli.engine import launch

            real_send_signal = subprocess.Popen.send_signal
            def forward_after_cleanup_starts(child, number):
                if {process_group!r} and os.getpgid(child.pid) == os.getpgrp():
                    deadline = time.monotonic() + 10
                    while not Path({str(cleaning)!r}).exists():
                        if time.monotonic() >= deadline:
                            raise RuntimeError('the group signal never reached engine cleanup')
                        time.sleep(0.005)
                real_send_signal(child, number)
                Path({str(release)!r}).touch()
            subprocess.Popen.send_signal = forward_after_cleanup_starts

            launch.helper_command = lambda: ([sys.executable, {str(engine)!r}], None)
            launch.helper_json(['format'])
        """),
        encoding="utf-8",
    )
    frontend = subprocess.Popen(
        [sys.executable, str(driver)],
        env={**os.environ, "PYTHONPATH": str(ROOT / "src")},
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        deadline = time.monotonic() + 30
        while not ready.exists() and frontend.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        assert ready.exists(), "the engine never staged a candidate"
        if process_group:
            os.killpg(frontend.pid, signal.SIGINT)
        else:
            frontend.send_signal(signal.SIGINT)
        _, err = frontend.communicate(timeout=30)
    finally:
        release.touch()
        if frontend.poll() is None:  # pragma: no cover - only after an unexpected hang
            frontend.kill()
            frontend.communicate(timeout=10)

    assert frontend.returncode == -signal.SIGINT, err
    assert cleaning.exists(), "the engine never entered candidate cleanup"
    assert ledger.read_text() == "original ledger\n"
    assert list(tmp_path.glob(".bea-*.tmp")) == []
