"""Empty custom directives must not be written (w3/232)."""

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


def test_custom_without_value_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    before = LEDGER
    ledger.write_text(before)
    for extra in ([], ["--allow-errors"]):
        result = _bea(
            tmp_path,
            "--json",
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            "2024-03-01",
            "--type",
            "budget",
            *extra,
        )
        assert result.returncode == 2, result.stderr
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage"
        assert "--value" in error["message"]
        assert "pad" in error["message"].casefold() or "value" in error["message"].casefold()
        assert ledger.read_text() == before


def test_custom_with_value_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "custom",
        "--date",
        "2024-03-01",
        "--type",
        "budget",
        "--value",
        "text:x",
    )
    assert result.returncode == 0, result.stderr
    assert 'custom "budget" "x"' in ledger.read_text()
