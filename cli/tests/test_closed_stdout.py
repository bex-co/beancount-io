"""With stdout closed (`>&-`), a command that succeeded exits 0 (w1/107).

Python sets `sys.stdout` to None when fd 1 is closed. Prints silently go
nowhere, but the final flush called `None.flush()` and reported an
AttributeError with exit 1 — after the write had already landed.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="closes fd 1 via preexec_fn")


def _close_stdout() -> None:
    os.close(1)


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        preexec_fn=_close_stdout,  # noqa: PLW1509 - the point is a child with fd 1 closed
        text=True,
        timeout=120,
    )


@pytest.mark.parametrize("mode", [[], ["--json"]], ids=["human", "json"])
def test_a_write_with_stdout_closed_exits_zero_once(tmp_path: Path, mode: list[str]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Bank USD\n2024-01-01 open Expenses:Food USD\n'
    )

    done = _bea(
        tmp_path,
        *mode,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-02-01",
        "--narration",
        "x",
        "--posting",
        "Expenses:Food 1 USD",
        "--posting",
        "Assets:Bank",
    )

    assert done.returncode == 0, done.stderr
    assert "NoneType" not in done.stderr
    assert ledger.read_text().count('2024-02-01 * "x"') == 1


def test_a_read_with_stdout_closed_exits_zero(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n2024-01-01 open Assets:Bank USD\n')

    done = _bea(tmp_path, "--file", str(ledger), "list", "open")

    assert done.returncode == 0, done.stderr
    assert "NoneType" not in done.stderr
