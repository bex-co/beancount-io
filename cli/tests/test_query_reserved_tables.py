"""Unquoted FROM accounts/balances must hit the real tables (w3/246, w3/247)."""

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
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Cash  10 USD
  Equity:Opening-Balances
2024-03-01 * "buy"
  Expenses:Food  1 USD
  Assets:Cash
2024-03-15 balance Assets:Cash 9 USD
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


def test_from_balances_selects_balance_assertions(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT * FROM balances")
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    names = [c["name"] for c in data["columns"]]
    assert "account" in names
    assert "amount" in names
    assert data["rows"]


def test_from_accounts_is_not_postings(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    accounts = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT count(*) FROM accounts")
    postings = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT count(*) FROM postings")
    assert accounts.returncode == 0, accounts.stderr
    assert postings.returncode == 0, postings.stderr
    account_count = json.loads(accounts.stdout)["data"]["rows"][0][0]
    posting_count = json.loads(postings.stdout)["data"]["rows"][0][0]
    assert account_count == 3
    assert posting_count == 4
    assert account_count != posting_count

    described = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "query",
        "SELECT account, open, close FROM accounts LIMIT 5",
    )
    assert described.returncode == 0, described.stderr
    cols = [c["name"] for c in json.loads(described.stdout)["data"]["columns"]]
    assert cols == ["account", "open", "close"]
