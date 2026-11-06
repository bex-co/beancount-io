"""A captured `doctor` operation must report an engine killed by a signal (w5/251).

w5/010 made a signal death exit 1 naming the signal, but only for children run
on inherited streams. The `doctor` operations that read their own answer
capture the child instead, and passed its negative return code to the shell:
on a ledger that crashes upstream's parser they exited 245 with nothing on
either stream.

The crash cases use the real zero-divisor input from the report; the stub
engine pins the same for a death that is not upstream's crash.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

DIVIDE_BY_ZERO = """option "operating_currency" "EUR"
2026-01-01 open Assets:Cash EUR
2026-01-01 open Expenses:X EUR

2026-02-01 * "dz" ^lk
  Expenses:X   100/0 EUR
  Assets:Cash
"""

#: Every captured operation, with the operands that follow the ledger.
CAPTURED = [
    ("missing-open", ()),
    ("roundtrip", ()),
    ("linked", ("dz.bean:6",)),
    ("region", ("dz.bean:5:7",)),
    ("directories", (".",)),
]

#: The captured operations that run upstream's own `bean-doctor` script.
NATIVE = ["missing-open", "roundtrip", "directories"]


def _bea(tmp_path: Path, *args: str, engine: Path | None = None) -> subprocess.CompletedProcess[str]:
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
    if engine is not None:
        env["BEA_ENGINE_PYTHON"] = str(engine)
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _stub_engine(tmp_path: Path, signal_name: str) -> Path:
    """An engine whose `bean-doctor` kills itself with `signal_name` and prints nothing."""
    bin_dir = tmp_path / "stub" / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    python = bin_dir / "python3"
    python.symlink_to(sys.executable)
    doctor = bin_dir / "bean-doctor"
    doctor.write_text(
        f"#!{sys.executable}\nimport os, signal\nos.kill(os.getpid(), signal.{signal_name})\n",
        encoding="utf-8",
    )
    doctor.chmod(0o755)
    return python


def _ledger(tmp_path: Path, text: str = DIVIDE_BY_ZERO) -> Path:
    ledger = tmp_path / "dz.bean"
    ledger.write_text(text, encoding="utf-8")
    return ledger


@pytest.mark.parametrize(("op", "operands"), CAPTURED, ids=[op for op, _ in CAPTURED])
def test_a_captured_operation_reports_the_crash(tmp_path: Path, op: str, operands: tuple[str, ...]) -> None:
    _ledger(tmp_path)

    result = _bea(tmp_path, "doctor", op, "dz.bean", *operands)

    # 245 is what the shell makes of -SIGSEGV, outside the documented 0-4 table.
    assert result.returncode == 1, f"exit {result.returncode}"
    assert result.stdout == ""
    assert "was killed by SIGSEGV and produced no result" in result.stderr
    assert "/0" in result.stderr


def test_the_streamed_operation_reports_it_the_same_way(tmp_path: Path) -> None:
    """The control: `context` inherits the streams and never lost the report."""
    _ledger(tmp_path)

    result = _bea(tmp_path, "doctor", "context", "dz.bean", "6")

    assert result.returncode == 1, f"exit {result.returncode}"
    assert "was killed by SIGSEGV and produced no result" in result.stderr


@pytest.mark.parametrize(("op", "operands"), CAPTURED, ids=[op for op, _ in CAPTURED])
def test_a_ledger_that_loads_is_unaffected(tmp_path: Path, op: str, operands: tuple[str, ...]) -> None:
    _ledger(tmp_path, DIVIDE_BY_ZERO.replace("100/0", "100/2"))

    result = _bea(tmp_path, "doctor", op, "dz.bean", *operands)

    assert result.returncode == 0, result.stderr
    assert "killed by" not in result.stderr


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
@pytest.mark.parametrize("op", NATIVE)
def test_a_captured_child_killed_from_outside_is_reported(tmp_path: Path, op: str) -> None:
    _ledger(tmp_path, DIVIDE_BY_ZERO.replace("100/0", "100/2"))
    engine = _stub_engine(tmp_path, "SIGTERM")

    result = _bea(tmp_path, "doctor", op, "dz.bean", ".", engine=engine)

    assert result.returncode == 1, f"exit {result.returncode}"
    assert "was killed by SIGTERM" in result.stderr
    # A kill from outside is not upstream's parser crash.
    # The temp directory's own name can contain "/0" on macOS, so look past it.
    assert "/0" not in result.stderr.replace(str(tmp_path.resolve()), "").replace(str(tmp_path), "")
    assert "out-of-memory" in result.stderr


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
@pytest.mark.parametrize("op", NATIVE)
def test_interrupt_keeps_the_shell_convention_and_stays_quiet(tmp_path: Path, op: str) -> None:
    _ledger(tmp_path, DIVIDE_BY_ZERO.replace("100/0", "100/2"))
    engine = _stub_engine(tmp_path, "SIGINT")

    result = _bea(tmp_path, "doctor", op, "dz.bean", ".", engine=engine)

    assert result.returncode == 128 + int(signal.SIGINT)
    assert "killed by" not in result.stderr
