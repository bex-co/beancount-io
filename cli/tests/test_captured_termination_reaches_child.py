"""Stopping `bea` stops a child whose output it captures (w5/437).

w5/208 passed SIGTERM and SIGHUP on to children on inherited streams, but
`capture_native` (`example`, `treeify`, doctor's captured operations) and the
cloud `git clone` were bare `subprocess.run` calls: a signal aimed at `bea`
alone left them running, and an orphaned clone finished in the background.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

from tests.test_into_glob_create import ROOT, _env
from tests.test_native_termination_reaches_child import _alive, slow_load  # noqa: F401

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")


def _start(argv: list[str], env: dict[str, str], cwd: Path) -> subprocess.Popen[str]:
    # Its own session, so the signal reaches the frontend and nothing else.
    return subprocess.Popen(
        [sys.executable, "-m", "cli.main", *argv],
        env=env,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )


def _stop_and_expect_no_survivor(process: subprocess.Popen[str], child_pid: int, number: int) -> None:
    try:
        process.send_signal(number)
        assert process.wait(timeout=15) == -number
        deadline = time.monotonic() + 2
        while _alive(child_pid) and time.monotonic() < deadline:
            time.sleep(0.05)
        assert not _alive(child_pid), "The captured child outlived the frontend that started it"
    finally:
        if process.poll() is None:
            process.kill()
        if _alive(child_pid):
            subprocess.run(["kill", "-9", str(child_pid)], check=False)


@pytest.mark.parametrize("op", ["missing-open", "roundtrip"])
@pytest.mark.parametrize("signal_name", ["SIGTERM", "SIGHUP"])
def test_a_captured_doctor_child_is_stopped_with_the_frontend(
    slow_load: tuple[Path, Path, dict[str, str]],  # noqa: F811
    op: str,
    signal_name: str,
) -> None:
    ledger, ready, env = slow_load
    env["LOAD_BARRIER_PROGRAM"] = "bean-doctor"
    with _start(["doctor", op, str(ledger)], env, ledger.parent) as process:
        deadline = time.monotonic() + 60
        while not ready.exists():
            if process.poll() is not None:
                pytest.fail(f"bea exited before bean-doctor loaded: {process.communicate()}")
            if time.monotonic() >= deadline:
                pytest.fail("bean-doctor never started loading")
            time.sleep(0.02)
        _stop_and_expect_no_survivor(process, int(ready.read_text()), int(getattr(signal, signal_name)))


def test_bean_example_is_stopped_with_the_frontend(tmp_path: Path) -> None:
    # Park the real native child at startup. Process-list polling can miss it,
    # and an arbitrary long generated history can finish (or fail validation)
    # before this test observes it.
    ready = tmp_path / "example.pid"
    startup = tmp_path / "startup"
    startup.mkdir()
    (startup / "sitecustomize.py").write_text(
        "import os, sys, time\n"
        "from pathlib import Path\n"
        "if any(Path(arg).name == 'bean-example' for arg in sys.orig_argv):\n"
        f"    ready = Path({str(ready)!r})\n"
        "    pending = ready.with_suffix('.pending')\n"
        "    pending.write_text(str(os.getpid()))\n"
        "    pending.replace(ready)\n"
        "    time.sleep(30)\n"
    )
    env = _env(tmp_path)
    env["PYTHONPATH"] = os.pathsep.join([str(ROOT / "src"), str(startup)])
    with _start(["example", "--seed", "1", "-o", "out.bean"], env, tmp_path) as process:
        deadline = time.monotonic() + 60
        while not ready.exists():
            if process.poll() is not None:
                pytest.fail(f"bea exited before bean-example started: {process.communicate()}")
            if time.monotonic() >= deadline:
                pytest.fail("bean-example never started")
            time.sleep(0.05)
        _stop_and_expect_no_survivor(process, int(ready.read_text()), signal.SIGTERM)
    assert not (tmp_path / "out.bean").exists()
