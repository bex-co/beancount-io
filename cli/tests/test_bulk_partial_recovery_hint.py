"""Non-partial bulk add mentions --partial when some rows are recoverable (w3/315)."""

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
2024-01-01 open Equity:Opening USD
"""
ROWS = [
    {
        "date": "2024-09-01",
        "narration": "ok",
        "postings": [
            {"account": "Expenses:Food", "amount": "1 USD"},
            {"account": "Assets:Cash"},
        ],
    },
    {
        "date": "2024-09-02",
        "narration": "badacct",
        "postings": [
            {"account": "Expenses:NoSuch", "amount": "1 USD"},
            {"account": "Assets:Cash"},
        ],
    },
    {
        "date": "2024-09-03",
        "narration": "ok2",
        "postings": [
            {"account": "Expenses:Food", "amount": "2 USD"},
            {"account": "Assets:Cash"},
        ],
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


def test_bulk_ledger_failure_mentions_partial_recovery(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps(ROWS))
    before = ledger.read_text()
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode != 0
    assert ledger.read_text() == before
    raw = result.stdout or result.stderr
    assert raw.strip(), (result.stdout, result.stderr)
    payload = json.loads(raw)
    message = payload["error"]["message"]
    assert "Pass --partial to append the 2 valid rows" in message
    assert payload["error"]["result"]["unwritten_rows"] == [0, 1, 2]
