"""Query CSV must not pad numeric cells for text alignment (w3/254)."""

from __future__ import annotations

import csv
import io
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  3357.83 USD
  Assets:Cash  97.25 USD
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


def test_csv_sum_number_unpadded(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        "--format",
        "csv",
        'SELECT account, sum(number) WHERE account ~ "Assets" GROUP BY 1',
    )
    assert result.returncode == 0, result.stderr
    rows = list(csv.reader(io.StringIO(result.stdout)))
    by_account = {row[0]: row[1] for row in rows[1:]}
    assert by_account["Assets:Cash"] == "97.25"
    assert by_account["Assets:Cash"] == by_account["Assets:Cash"].strip()
    assert " " not in by_account["Assets:Cash"]
