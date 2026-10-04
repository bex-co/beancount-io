"""Beanquery's init file is replayed through bea's guarded `.output` (w1/142, w1/143).

`bean-query` replays `~/.config/beanquery/init` inside the shell constructor,
before the ledger is attached. Through upstream's unguarded `.output`, an init
line naming the ledger truncated it on a native one-shot (w1/142); through
bea's guarded one, which needs the loaded ledger to know what to protect, any
init `.output` failed every `--file` query with a raw AttributeError (w1/143).
The init file is now replayed once the ledger is loaded, on every path.
"""

from __future__ import annotations

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

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n"
    '2026-01-02 * "Opening"\n  Assets:Cash 1.00 USD\n  Equity:Opening\n'
)
QUERY = "SELECT count(*) AS n"


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
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


def _init(tmp_path: Path, line: str) -> None:
    init = tmp_path / "home" / ".config" / "beanquery" / "init"
    init.parent.mkdir(parents=True, exist_ok=True)
    init.write_text(line + "\n", encoding="utf-8")


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        input=stdin if stdin is not None else "",
        capture_output=True,
        text=True,
        timeout=120,
    )


def _where(ledger: Path, native: bool) -> list[str]:
    return ["query", "--source", str(ledger)] if native else ["--file", str(ledger), "query"]


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
@pytest.mark.parametrize("spelling", ["relative", "absolute"])
def test_an_init_output_onto_the_ledger_is_refused(tmp_path: Path, ledger: Path, native: bool, spelling: str) -> None:
    _init(tmp_path, f".output {ledger.name if spelling == 'relative' else ledger}")

    done = _bea(tmp_path, *_where(ledger, native), QUERY)

    assert done.returncode == 0, done.stderr
    assert ledger.read_text(encoding="utf-8") == LEDGER
    assert "Refusing to write query output" in done.stderr
    assert "AttributeError" not in done.stderr and "'context'" not in done.stderr
    assert "2" in done.stdout, "the query still answers on stdout"


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_an_init_output_onto_the_ledger_is_refused_for_a_query_on_stdin(
    tmp_path: Path, ledger: Path, native: bool
) -> None:
    _init(tmp_path, f".output {ledger}")

    done = _bea(tmp_path, *_where(ledger, native), stdin=QUERY + "\n")

    assert done.returncode == 0, done.stderr
    assert ledger.read_text(encoding="utf-8") == LEDGER


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_an_init_output_elsewhere_still_redirects_the_result(tmp_path: Path, ledger: Path, native: bool) -> None:
    other = tmp_path / "other.txt"
    _init(tmp_path, f".output {other}")

    done = _bea(tmp_path, *_where(ledger, native), QUERY)

    assert done.returncode == 0, done.stderr
    assert "2" in other.read_text(encoding="utf-8")
    assert ledger.read_text(encoding="utf-8") == LEDGER


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_an_explicit_output_outranks_an_init_output(tmp_path: Path, ledger: Path, native: bool) -> None:
    other, export = tmp_path / "other.txt", tmp_path / "export.txt"
    _init(tmp_path, f".output {other}")

    done = _bea(tmp_path, *_where(ledger, native), "-o", str(export), QUERY)

    assert done.returncode == 0, done.stderr
    assert "2" in export.read_text(encoding="utf-8")
    assert "2" not in other.read_text(encoding="utf-8")


def test_the_interactive_shell_refuses_an_init_output_onto_the_ledger(tmp_path: Path, ledger: Path) -> None:
    _init(tmp_path, f".output {ledger}")
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), "--file", str(ledger), "query"], _env(tmp_path))
    screen, sent, started = "", False, time.time()
    try:
        while True:
            if not sent and "beanquery>" in screen:
                os.write(fd, f"{QUERY};\n.exit\n".encode())
                sent = True
            ready, _, _ = select.select([fd], [], [], 0.2)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:
                    chunk = b""
                screen += chunk.decode("utf-8", "replace")
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                break
            if time.time() - started > 60:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"the shell never exited; screen was {screen!r}")
    finally:
        os.close(fd)

    assert os.waitstatus_to_exitcode(status) == 0, screen
    assert "Refusing to write query output" in screen
    assert "\n2\n" in screen.replace("\r", "").replace(" ", "")
    assert ledger.read_text(encoding="utf-8") == LEDGER
