"""`-o /dev/null` discards a result and `-o /dev/stdout` prints it (w1/103).

Exports are staged beside the destination and swapped in atomically (w3/404),
which for `/dev/null` meant creating a temp file in `/dev` — a raw `[Errno 1]`
— and, where `/dev` is writable, replacing the device with a regular file.
`/dev/stdout` reached the engine, whose stdout is the envelope pipe, and
Typer's default `readable=True` refused it with an internal command line.
"""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import threading
from pathlib import Path

import pytest

from cli.utils import atomic_write

ROOT = Path(__file__).resolve().parents[1]
LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n"
    '2026-01-02 * "Opening"\n  Assets:Cash 1.00 USD\n  Equity:Opening\n'
)


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    return env


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.mark.parametrize(
    "mode",
    [["--format", "text"], ["--format", "csv"], ["--json"]],
    ids=["text", "csv", "json"],
)
def test_query_output_to_dev_null_discards_the_result(tmp_path: Path, ledger: Path, mode: list[str]) -> None:
    globals_, local = (mode, []) if mode == ["--json"] else ([], mode)
    done = _bea(tmp_path, *globals_, "--file", str(ledger), "query", "-o", os.devnull, *local, "SELECT 1 AS n LIMIT 1")

    assert done.returncode == 0, done.stderr
    assert done.stdout == ""
    assert stat.S_ISCHR(os.stat(os.devnull).st_mode)


def test_native_query_output_to_dev_null_discards_the_result(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "query", "--source", str(ledger), "-o", os.devnull, "SELECT 1 AS n LIMIT 1")

    assert done.returncode == 0, done.stderr
    assert done.stdout == ""


@pytest.mark.parametrize("spelling", ["/dev/stdout", "/dev/fd/1"])
@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_query_output_to_stdout_prints_the_result(tmp_path: Path, ledger: Path, spelling: str, native: bool) -> None:
    where = ["query", "--source", str(ledger)] if native else ["--file", str(ledger), "query"]
    done = _bea(tmp_path, *where, "-o", spelling, "-f", "csv", "SELECT 1 AS n LIMIT 1")

    assert done.returncode == 0, done.stderr
    assert done.stdout.splitlines() == ["n", "1"]
    assert "bea-engine" not in done.stderr


def test_json_query_output_to_stdout_is_the_envelope(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "query", "-o", "/dev/stdout", "SELECT 1 AS n LIMIT 1")

    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["rows"] == [[1]]


def test_format_output_to_stdout_on_a_pipe(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "format", "-o", "/dev/stdout", str(ledger))

    assert done.returncode == 0, done.stderr
    assert "open Assets:Cash" in done.stdout


@pytest.mark.skipif(not hasattr(os, "mkfifo"), reason="needs FIFOs")
def test_an_export_into_a_fifo_writes_through_it(tmp_path: Path) -> None:
    """A non-regular destination is written, never replaced by a staged regular file."""
    fifo = tmp_path / "pipe"
    os.mkfifo(fifo)
    received: list[str] = []
    reader = threading.Thread(target=lambda: received.append(fifo.read_text(encoding="utf-8")))
    reader.start()

    atomic_write(fifo, '{"ok": true}\n', export=True)
    reader.join(timeout=10)

    assert received == ['{"ok": true}\n']
    assert stat.S_ISFIFO(fifo.stat().st_mode)
    assert [path.name for path in tmp_path.iterdir()] == ["pipe"]
