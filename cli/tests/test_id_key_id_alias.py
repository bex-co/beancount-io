"""`--id-key id` must still dedupe CSV bank_id metadata (w3/237)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Uncategorized USD
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


def test_id_key_id_aliases_bank_id_conflict(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    a = tmp_path / "a.csv"
    b = tmp_path / "b.csv"
    a.write_text("Date,Description,Amount,ID\n2024-03-10,Cafe,-4.50,id1\n")
    b.write_text("Date,Description,Amount,ID\n2024-03-11,Other,-9.99,id1\n")
    csv = "date=Date,amount=Amount,narration=Description,id=ID"

    first = _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(a),
        "--csv",
        csv,
        "--account",
        "Assets:Bank:Checking",
        "--id-key",
        "id",
        "--apply",
    )
    assert first.returncode == 0, first.stderr
    text = ledger.read_text()
    assert 'bank_id: "id1"' in text
    assert 'import-id: "bank:id1"' in text

    second = _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(b),
        "--csv",
        csv,
        "--account",
        "Assets:Bank:Checking",
        "--id-key",
        "id",
        "--apply",
    )
    assert second.returncode == 4, (second.returncode, second.stdout, second.stderr)
    assert ledger.read_text().count('bank_id: "id1"') == 1
