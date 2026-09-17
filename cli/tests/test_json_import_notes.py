"""`--json import` must retain notes and effective date_format (w3/238)."""

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
2024-01-01 open Expenses:Uncategorized USD
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
        timeout=60,
    )


def test_json_import_keeps_category_notes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    source = tmp_path / "cat.csv"
    source.write_text("Date,Description,Amount,Category\n2024-03-10,X,-4.50,Groceries\n")
    result = _bea(
        tmp_path,
        "--no-input",
        "--json",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "date=Date,amount=Amount,narration=Description,category=Category",
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    notes = " ".join(data.get("notes") or [])
    assert "not an account" in notes.casefold() or "Uncategorized" in notes
    assert data.get("date_format")


def test_json_import_keeps_ambiguous_date_notes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    source = tmp_path / "amb.csv"
    source.write_text("date,amount,description\n01/02/2024,-1.00,A\n03/04/2024,-2.00,B\n")
    result = _bea(
        tmp_path,
        "--no-input",
        "--json",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "auto",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food:Groceries",
    )
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    notes = " ".join(data.get("notes") or [])
    assert notes.strip()
    assert "%m/%d/%Y" in notes or data.get("date_format") == "%m/%d/%Y"
    assert data.get("date_format") == "%m/%d/%Y"
