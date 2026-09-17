"""Refuse absurd format alignment widths that bloat ledgers (w3/331)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-01-02 * "T"
  Expenses:Food 5 USD
  Assets:Cash
"""


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
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_format_rejects_huge_currency_column(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    before = ledger.read_bytes()

    bloated = _bea(tmp_path, "format", "-i", "--currency-column", "99999", str(ledger))
    assert bloated.returncode == 2, bloated.stderr or bloated.stdout
    assert "at most 200" in (bloated.stderr + bloated.stdout)
    assert ledger.read_bytes() == before

    useful = _bea(tmp_path, "format", "-i", "--currency-column", "50", str(ledger))
    assert useful.returncode == 0, useful.stderr or useful.stdout
    assert len(ledger.read_bytes()) < 4096
