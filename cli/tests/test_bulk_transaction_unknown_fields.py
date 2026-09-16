"""Bulk transaction JSON must reject unknown top-level fields (w3/225)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Food:Groceries USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_narrative_typo_is_rejected_not_written(ledger: Path) -> None:
    rows = ledger.parent / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-20",
                    "narrative": "Should be narration",
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "units": {"number": "1.00", "currency": "USD"}},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    before = ledger.read_text()
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert any("narrative" in detail and "Extra inputs" in detail for detail in error["details"])
    assert ledger.read_text() == before


def test_documented_narration_row_still_writes(ledger: Path) -> None:
    rows = ledger.parent / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-20",
                    "narration": "Groceries",
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "units": {"number": "1.00", "currency": "USD"}},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert '2024-03-20 * "Groceries"' in ledger.read_text()
