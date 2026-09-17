"""Bulk JSON meta may use bare numbers; coerce to Decimal (w3/230)."""

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


def test_bare_json_number_meta_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-21",
                    "narration": "tm",
                    "meta": {"count": 1, "rate": 1.5, "cleared": True},
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "amount": "1 USD"},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 0, result.stderr
    assert "Unexpected value" not in result.stderr
    text = ledger.read_text()
    assert "count:" in text and "rate:" in text and "cleared:" in text
