"""Interval series must reach report as_of when notes post-date txns (w3/349)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Income:Salary USD
2020-01-15 * "pay"
  Assets:Cash  100 USD
  Income:Salary
2020-02-01 * "pay2"
  Assets:Cash  50 USD
  Income:Salary
2020-06-01 note Assets:Cash "later"
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


def test_income_statement_daily_periods_reach_note_as_of(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", "income-statement", "-i", "daily")
    assert result.returncode == 0, result.stderr or result.stdout
    data = json.loads(result.stdout)["data"]
    assert data["as_of"] == "2020-06-01"
    periods = data["periods"]
    assert periods[0]["date"] == "2020-01-15"
    assert periods[-1]["date"] == "2020-06-01"
