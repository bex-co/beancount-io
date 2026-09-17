"""PRINT with --format csv must be a usage error (w3/242)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Cash  1 USD
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


def test_print_csv_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        'PRINT FROM has_account("Cash")',
        "--format",
        "csv",
    )
    assert result.returncode == 2, result.stderr
    assert "csv" in result.stderr.casefold()
    assert "PRINT" in result.stderr


def test_select_csv_and_print_beancount_still_work(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    csv = _bea(tmp_path, "--file", str(ledger), "query", "SELECT account LIMIT 2", "--format", "csv")
    assert csv.returncode == 0, csv.stderr
    assert "," in csv.stdout or "account" in csv.stdout.casefold()

    printed = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        'PRINT FROM has_account("Cash")',
        "--format",
        "beancount",
    )
    assert printed.returncode == 0, printed.stderr
    assert "Assets:Cash" in printed.stdout
