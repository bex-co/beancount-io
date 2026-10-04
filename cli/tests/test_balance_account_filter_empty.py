"""`bea balance` reports whether its account filter matched anything (w1/126).

`_balances` reused the report metadata's `account_filter_empty`, which is
computed from a report `--account` that `bea balance` never sets, so it read
`false` even when no account matched and every tree was null.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Equity:Opening USD
2024-01-05 * "Opening"
  Assets:Bank  1000 USD
  Equity:Opening
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


@pytest.mark.parametrize(
    ("terms", "empty"),
    [(["Nope"], True), (["Bank"], False), (["Nope", "Bank"], False), ([], False)],
)
def test_account_filter_empty_reflects_the_match(tmp_path: Path, terms: list[str], empty: bool) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bea(tmp_path, "--json", "--file", str(ledger), "balance", *terms)

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(result.stdout)["data"]["account_filter_empty"] is empty


def test_text_says_no_match_once(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bea(tmp_path, "--file", str(ledger), "balance", "Nope")

    assert result.returncode == 0, result.stderr
    assert (result.stdout + result.stderr).count("No accounts match Nope.") == 1
