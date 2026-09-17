"""Mid-period reports must not invent Equity:Opening-Balances (w3/288)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Income:Salary USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening balance"
  Assets:Cash     1000 USD
  Equity:Opening -1000 USD
2024-01-15 * "Grocery"
  Expenses:Food    50 USD
  Assets:Cash     -50 USD
2024-02-01 * "Salary"
  Assets:Cash    2000 USD
  Income:Salary -2000 USD
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


def _equity_accounts(tree: dict | None) -> set[str]:
    found: set[str] = set()

    def walk(node: dict | None) -> None:
        if not node:
            return
        found.add(node["account"])
        for child in node.get("children") or []:
            walk(child)

    walk(tree)
    return found


def test_mid_period_balance_sheet_omits_phantom_opening_balances(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    mid = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "report",
        "balance-sheet",
        "-t",
        "2024-01-15 - 2024-01-15",
    )
    assert mid.returncode == 0, mid.stderr or mid.stdout
    mid_equity = _equity_accounts(json.loads(mid.stdout)["data"]["equity"])
    assert "Equity:Opening" in mid_equity
    assert "Equity:Opening-Balances" not in mid_equity

    balance = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "balance",
        "-t",
        "2024-01-15 - 2024-01-15",
    )
    assert balance.returncode == 0, balance.stderr or balance.stdout
    bal_equity = _equity_accounts(json.loads(balance.stdout)["data"]["equity"])
    assert "Equity:Opening-Balances" not in bal_equity

    anchored = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "report",
        "balance-sheet",
        "-t",
        "2024-01-02 - 2024-01-02",
    )
    assert anchored.returncode == 0, anchored.stderr or anchored.stdout
    assert "Equity:Opening" in _equity_accounts(json.loads(anchored.stdout)["data"]["equity"])
