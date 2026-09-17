"""import ID conflicts must not recommend --duplicates (w3/326)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Bank:Checking USD
2020-01-01 open Expenses:Uncategorized USD
2020-01-01 open Equity:Opening USD
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


def test_import_id_conflict_advice_omits_duplicates_flag(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    first = tmp_path / "a.csv"
    first.write_text("Date,Amount,Description,FitId\n2020-03-01,-12.34,Coffee,ID1\n")
    applied = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "import",
        str(first),
        "--csv",
        "auto",
        "--account",
        "Assets:Bank:Checking",
        "--apply",
        "--duplicates",
        "include",
    )
    assert applied.returncode == 0, applied.stderr or applied.stdout

    second = tmp_path / "b.csv"
    second.write_text("Date,Amount,Description,FitId\n2020-03-01,-99.00,Coffee,ID1\n")
    conflicted = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "import",
        str(second),
        "--csv",
        "auto",
        "--account",
        "Assets:Bank:Checking",
        "--apply",
        "--duplicates",
        "include",
    )
    assert conflicted.returncode == 4
    text = conflicted.stdout + conflicted.stderr
    assert "--duplicates" not in text
    assert "different data" in text.lower() or "different transaction" in text.lower() or "stable ID" in text
