"""Single-letter --meta keys must fail as meta errors, not posting blame (w3/229)."""

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


def test_single_letter_meta_names_the_key(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "short",
        "--posting",
        "Expenses:Food:Groceries 1 USD",
        "--posting",
        "Assets:Bank:Checking",
        "--meta",
        "n:3",
    )
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert "--meta" in error["message"]
    assert "Assets:Checking -30 USD" not in error["message"]
    assert "posting" not in error["message"].casefold()


def test_two_letter_meta_still_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "ok",
        "--posting",
        "Expenses:Food:Groceries 1 USD",
        "--posting",
        "Assets:Bank:Checking",
        "--meta",
        "aa:3",
    )
    assert result.returncode == 0, result.stderr
    assert "aa: 3" in ledger.read_text()
