"""`--json list transaction --account` exposes the postings the filter matched (w3/376)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD

2024-01-05 * "Transfer to checking"
  Assets:Bank:Checking   100.00 USD
  Assets:Cash           -100.00 USD

2024-01-06 * "Lunch"
  Expenses:Food    12.00 USD
  Assets:Cash     -12.00 USD
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


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def test_account_filter_adds_matching_postings(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction", "--account", "Checking")
    assert result.returncode == 0, result.stderr
    rows = json.loads(result.stdout)["data"]
    assert len(rows) == 1
    # The whole entry stays available; the counterparty leg is what makes it readable.
    assert [p["account"] for p in rows[0]["postings"]] == ["Assets:Bank:Checking", "Assets:Cash"]
    assert [p["account"] for p in rows[0]["matching_postings"]] == ["Assets:Bank:Checking"]
    assert rows[0]["matching_postings"][0]["units"] == {"number": "100.00", "currency": "USD"}


def test_matching_postings_agrees_with_the_human_column(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    table = _bea(tmp_path, "--file", str(ledger), "list", "transaction", "--account", "Cash")
    assert table.returncode == 0, table.stderr
    assert "MATCHING POSTING AMOUNTS" in table.stdout
    assert "Assets:Bank:Checking" not in table.stdout

    data = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction", "--account", "Cash")
    assert data.returncode == 0, data.stderr
    rows = json.loads(data.stdout)["data"]
    assert len(rows) == 2
    for row in rows:
        assert [p["account"] for p in row["matching_postings"]] == ["Assets:Cash"]


def test_no_account_filter_keeps_the_envelope_unchanged(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")
    assert result.returncode == 0, result.stderr
    rows = json.loads(result.stdout)["data"]
    assert len(rows) == 2
    for row in rows:
        assert "matching_postings" not in row
        assert len(row["postings"]) == 2
