"""Non-partial bulk add must not overstate --partial write counts (w3/231)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Food:Groceries USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
"""
ROWS = [
    {
        "date": "2024-03-20",
        "narration": "ok",
        "postings": [
            {"account": "Expenses:Food:Groceries", "amount": "1 USD"},
            {"account": "Assets:Bank:Checking"},
        ],
    },
    {
        "date": "nope",
        "narration": "bad date",
        "postings": [
            {"account": "Expenses:Food:Groceries", "amount": "1 USD"},
            {"account": "Assets:Bank:Checking"},
        ],
    },
    {
        "date": "2024-03-22",
        "narration": "unbal",
        "postings": [{"account": "Expenses:Food:Groceries", "amount": "1 USD"}],
    },
]


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


def test_non_partial_does_not_promise_two_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps(ROWS))
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert "2 valid" not in error["message"]
    assert "schema-valid" in error["message"] or "may still reject" in error["message"]
    assert error["result"]["rejected_rows"] == [1]

    partial = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows), "--partial")
    assert partial.returncode == 1, partial.stderr
    pdata = json.loads(partial.stderr)["error"]
    assert pdata["result"]["written"] == 1
    assert set(pdata["result"]["rejected_rows"]) == {1, 2}
