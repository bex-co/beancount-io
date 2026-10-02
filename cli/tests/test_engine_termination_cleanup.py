"""Forwarded termination signals unwind staged writes and their pickle sidecars."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import textwrap
import time
from pathlib import Path

import pytest

from tests.test_into_glob_create import ROOT, _env

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")


@pytest.fixture
def slow_write(tmp_path: Path) -> tuple[Path, Path, dict[str, str]]:
    books = tmp_path / "books"
    books.mkdir()
    ledger = books / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        'plugin "termination_barrier"\n'
        "2024-01-01 open Assets:Bank USD\n"
        "2024-01-01 open Expenses:Food USD\n"
    )
    ready = tmp_path / "validation-ready.json"
    plugins = tmp_path / "plugins"
    plugins.mkdir()
    (plugins / "termination_barrier.py").write_text(
        textwrap.dedent(
            f"""\
            import json
            import os
            import time
            from pathlib import Path
            from bea_engine.ledger.write import pickle_cache_of

            __plugins__ = ("slow_validation",)

            def slow_validation(entries, options):
                candidate = Path(options["filename"])
                if candidate.name.startswith(".bea-"):
                    sidecar = pickle_cache_of(candidate)
                    sidecar.write_bytes(candidate.read_bytes())
                    ready = Path({str(ready)!r})
                    pending = ready.with_suffix(".pending")
                    pending.write_text(json.dumps({{
                        "pid": os.getpid(),
                        "candidate": str(candidate),
                        "sidecar": str(sidecar),
                    }}))
                    pending.replace(ready)
                    time.sleep(30)
                return entries, []
            """
        )
    )
    env = _env(tmp_path)
    env["PYTHONPATH"] = os.pathsep.join([str(ROOT / "src"), str(plugins)])
    return ledger, ready, env


def _interrupt_during_validation(
    command: list[str], ready: Path, env: dict[str, str], number: int
) -> subprocess.CompletedProcess[str]:
    helper_pid: int | None = None
    with subprocess.Popen(
        command,
        env=env,
        cwd=ready.parent,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    ) as process:
        try:
            deadline = time.monotonic() + 15
            while not ready.exists():
                if process.poll() is not None:
                    out, err = process.communicate()
                    pytest.fail(f"Write exited before staged validation: {process.returncode}\n{out}\n{err}")
                if time.monotonic() >= deadline:
                    pytest.fail("Write never reached staged validation")
                time.sleep(0.02)
            state = json.loads(ready.read_text())
            helper_pid = int(state["pid"])
            candidate = Path(state["candidate"])
            sidecar = Path(state["sidecar"])
            assert candidate.name.startswith(".bea-")
            assert sidecar.name.startswith("..bea-")
            assert sidecar.read_bytes() == candidate.read_bytes()

            process.send_signal(number)
            out, err = process.communicate(timeout=10)

            with pytest.raises(ProcessLookupError):
                os.kill(helper_pid, 0)
            helper_pid = None
            assert out == "", "An interrupted write must not print a success result"
            return subprocess.CompletedProcess(command, process.returncode, out, err)
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.communicate(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.communicate(timeout=5)
            if helper_pid is not None:
                try:
                    os.kill(helper_pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass


@pytest.mark.parametrize("operation", ["add", "import"])
@pytest.mark.parametrize("signal_name", ["SIGTERM", "SIGHUP", "SIGINT"])
def test_frontend_termination_cleans_up_the_real_writing_helper(
    tmp_path: Path, slow_write: tuple[Path, Path, dict[str, str]], operation: str, signal_name: str
) -> None:
    ledger, ready, env = slow_write
    before = {path.name: path.read_bytes() for path in ledger.parent.iterdir()}
    if operation == "add":
        args = [
            "add",
            "transaction",
            "--date",
            "2024-04-01",
            "--narration",
            "Interrupted write",
            "-p",
            "Assets:Bank -2 USD",
            "-p",
            "Expenses:Food 2 USD",
        ]
    else:
        source = tmp_path / "bank.csv"
        source.write_text("Date,Amount,Description\n2024-04-01,-2.00,Interrupted write\n")
        args = [
            "import",
            str(source),
            "--csv",
            "auto",
            "--account",
            "Assets:Bank",
            "--default-account",
            "Expenses:Food",
            "--apply",
        ]
    number = int(getattr(signal, signal_name))

    result = _interrupt_during_validation(
        [sys.executable, "-m", "cli.main", "--no-input", "--file", str(ledger), *args], ready, env, number
    )

    assert result.returncode == -number, result.stderr
    assert {path.name: path.read_bytes() for path in ledger.parent.iterdir()} == before


@pytest.mark.parametrize("signal_name", ["SIGTERM", "SIGHUP"])
def test_direct_engine_termination_unwinds_and_returns_the_shell_signal_status(
    slow_write: tuple[Path, Path, dict[str, str]], signal_name: str
) -> None:
    ledger, ready, env = slow_write
    before = {path.name: path.read_bytes() for path in ledger.parent.iterdir()}
    number = int(getattr(signal, signal_name))

    result = _interrupt_during_validation(
        [
            sys.executable,
            "-m",
            "bea_engine",
            "append",
            "--file",
            str(ledger),
            "--text",
            '2024-04-01 * "Interrupted write"\n  Assets:Bank -2 USD\n  Expenses:Food 2 USD',
        ],
        ready,
        env,
        number,
    )

    assert result.returncode == 128 + number, result.stderr
    assert {path.name: path.read_bytes() for path in ledger.parent.iterdir()} == before
