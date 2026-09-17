"""`--json query` must not turn shell utilities into BQL syntax errors (w3/234)."""

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


def test_json_shell_utilities_return_text(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    human = _bea(tmp_path, "--file", str(ledger), "query", ".tables")
    assert human.returncode == 0, human.stderr
    assert "entries" in human.stdout

    for utility in (".tables", ".set", ".errors", ".run cash"):
        result = _bea(tmp_path, "--json", "--file", str(ledger), "query", utility)
        assert result.returncode == 0, (utility, result.stderr)
        payload = json.loads(result.stdout)
        text = payload["data"]["text"]
        assert isinstance(text, str) and text.strip(), utility
        assert "syntax error" not in result.stderr.casefold()
        assert "interactive shell" not in result.stderr.casefold()


def test_json_select_still_returns_columns_rows(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT account LIMIT 1")
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert "columns" in payload["data"]
    assert "rows" in payload["data"]
    assert "text" not in payload["data"]
