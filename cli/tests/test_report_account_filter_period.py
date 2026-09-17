"""report --account Nomatch keeps the ledger period (w3/292)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Equity:Opening USD
2020-01-02 * "x"
  Assets:Cash 100 USD
  Equity:Opening -100 USD
2020-03-10 * "y"
  Expenses:Food 10 USD
  Assets:Cash -10 USD
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
        timeout=30,
    )


def test_report_nonmatching_account_keeps_period(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    human = _bea(tmp_path, "--file", str(ledger), "report", "income-statement", "-a", "Nomatch")
    assert human.returncode == 0, human.stderr or human.stdout
    assert "no dated activity" not in human.stdout
    assert "2020-01-02 through 2020-03-10" in human.stdout
    assert "No accounts match Nomatch" in (human.stdout + human.stderr)

    payload = _bea(tmp_path, "--json", "--file", str(ledger), "report", "income-statement", "-a", "Nomatch")
    assert payload.returncode == 0, payload.stderr or payload.stdout
    data = json.loads(payload.stdout)["data"]
    assert data["period"]["start"] == "2020-01-02"
    assert data["as_of"] == "2020-03-10"
    assert data["account_filter_empty"] is True

    matched = _bea(tmp_path, "--json", "--file", str(ledger), "report", "income-statement", "-a", "Cash")
    assert matched.returncode == 0, matched.stderr or matched.stdout
    matched_data = json.loads(matched.stdout)["data"]
    assert matched_data["account_filter_empty"] is False
    assert matched_data["period"]["start"] == "2020-01-02"
