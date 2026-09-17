"""Missing `.run` stored queries must be usage failures (w3/236)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 query "cash" "SELECT account WHERE account ~ 'Checking'"
2024-01-01 * "seed"
  Assets:Bank:Checking  1 USD
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


def test_run_missing_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    human = _bea(tmp_path, "--file", str(ledger), "query", ".run missing")
    assert human.returncode == 2, human.stderr
    assert "not found" in human.stderr.casefold()
    assert "cash" in human.stderr

    as_json = _bea(tmp_path, "--json", "--file", str(ledger), "query", ".run missing")
    assert as_json.returncode == 2, as_json.stderr
    error = json.loads(as_json.stderr)["error"]
    assert error["category"] == "usage"
    assert "not found" in error["message"].casefold()
    assert "syntax error" not in error["message"].casefold()


def test_run_known_query_succeeds(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", ".run cash")
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip()
