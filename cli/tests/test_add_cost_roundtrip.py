"""add transaction cost JSON must round-trip into add transactions (w3/240)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Investments:HOOL HOOL
2024-01-01 open Equity:Opening-Balances USD
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


def test_add_transaction_cost_round_trips_to_bulk(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-02",
        "--narration",
        "buy",
        "--posting",
        "Assets:Investments:HOOL 5 HOOL {10.00 USD}",
        "--posting",
        "Assets:Bank:Checking -50 USD",
    )
    assert added.returncode == 0, added.stderr
    directive = json.loads(added.stdout)["data"]["directive"]
    cost = directive["postings"][0]["cost"]
    assert "number" in cost
    assert "number_per" not in cost
    assert cost["number"] == "10.00"
    assert cost["currency"] == "USD"

    # Fresh ledger so bulk add is not a duplicate of the first write.
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    row = {
        "date": directive["date"],
        "narration": directive["narration"],
        "postings": directive["postings"],
    }
    rows.write_text(json.dumps([row]))
    bulk = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert bulk.returncode == 0, bulk.stderr
    assert "{10.00 USD}" in ledger.read_text() or "{10 USD}" in ledger.read_text()
