"""Unbalanced stock reductions get a cost-lot hint, not FX (w3/303)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Broker HOOL
2020-01-01 open Assets:Cash USD
2020-01-01 open Equity:Opening USD
2020-01-02 * "buy"
  Assets:Broker 1 HOOL {100 USD}
  Assets:Cash -100 USD
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


def test_stock_reduction_hint_prefers_cost_lot(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-07-03",
        "--narration",
        "sell2",
        "--posting",
        "Assets:Broker -1 HOOL",
        "--posting",
        "Assets:Cash 100 USD",
    )
    assert result.returncode != 0
    text = result.stdout + result.stderr
    assert "{100 USD}" in text or "cost lot" in text.lower() or "market price" in text.lower()
    assert "100 EUR @ 1.08 USD" not in text


def test_true_fx_imbalance_still_gets_fx_hint(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Assets:Cash:EUR EUR\n"
        "2020-01-01 open Equity:Opening USD,EUR\n"
    )
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-07-03",
        "--narration",
        "fx",
        "--posting",
        "Assets:Cash:EUR 100 EUR",
        "--posting",
        "Assets:Cash -108 USD",
    )
    assert result.returncode != 0
    text = result.stdout + result.stderr
    assert "100 EUR @ 1.08 USD" in text
