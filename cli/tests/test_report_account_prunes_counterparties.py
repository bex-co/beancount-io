"""report -a prunes counterparties like bea balance (w3/322)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Assets:Savings USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Income:Salary USD
2020-01-15 * "salary"
  Assets:Cash  1000.00 USD
  Income:Salary
2020-06-01 * "food"
  Expenses:Food  25.00 USD
  Assets:Cash
2020-12-01 * "save"
  Assets:Savings  100.00 USD
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
        timeout=30,
    )


def test_report_account_filter_matches_balance_scope(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    balance = _bea(tmp_path, "--json", "--file", str(ledger), "balance", "Cash")
    assert balance.returncode == 0, balance.stderr or balance.stdout
    bal = json.loads(balance.stdout)["data"]
    assert bal["assets"]["balance_children"]["USD"] == "875.00"
    assert bal.get("income") is None or not (bal["income"] or {}).get("children")
    assert bal.get("expenses") is None or not (bal["expenses"] or {}).get("children")

    report = _bea(tmp_path, "--json", "--file", str(ledger), "report", "trial-balance", "-a", "Cash")
    assert report.returncode == 0, report.stderr or report.stdout
    data = json.loads(report.stdout)["data"]
    assert data["assets"]["balance_children"]["USD"] == "875.00"
    assert data.get("income") is None
    assert data.get("expenses") is None
    assert "Savings" not in json.dumps(data.get("assets") or {})
