"""CLI --meta true/false must write Beancount boolean metadata (w3/235)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Food:Groceries USD
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


def test_meta_true_false_write_booleans(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-26",
        "--narration",
        "boolmeta",
        "--posting",
        "Expenses:Food:Groceries 1 USD",
        "--posting",
        "Assets:Bank:Checking",
        "--meta",
        "cleared:true",
        "--meta",
        "flag:false",
        "--meta",
        "count:3",
        "--meta",
        "note:trueish",
    )
    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "cleared: TRUE" in text
    assert "flag: FALSE" in text
    assert "count: 3" in text
    assert 'note: "trueish"' in text
    assert 'cleared: "true"' not in text
    assert 'flag: "false"' not in text
