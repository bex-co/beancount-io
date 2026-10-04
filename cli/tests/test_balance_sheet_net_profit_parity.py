"""The balance sheet's `net_profit` is the income statement's `net_profit` (w1/124).

The balance sheet emitted its earnings raw — per-commodity under a currency
conversion, `{}` with no activity — while the income statement applied the
partial-valuation rule: the requested currency is always named, `null` when
part of the profit could not be valued, zero when there is none.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]

NOPRICE = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Euro EUR
2026-01-01 open Income:Consult EUR
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Bank  100 USD
  Equity:Opening
2026-01-10 * "Consult"
  Assets:Euro  50 EUR
  Income:Consult
"""
OPENS = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Income:Consult USD
"""
PRICED = NOPRICE + "2026-01-10 price EUR 1.10 USD\n"
# First quoted after the January row: a row-only gap (w1/125).
LATE = NOPRICE + "2026-02-10 price EUR 1.10 USD\n"

LEDGERS = {"noprice": NOPRICE, "opens": OPENS, "priced": PRICED, "late": LATE}


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


def _data(tmp_path: Path, ledger: Path, *args: str) -> dict[str, Any]:
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", *args, "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    data: dict[str, Any] = json.loads(result.stdout)["data"]
    return data


@pytest.mark.parametrize("name", sorted(LEDGERS))
@pytest.mark.parametrize("conversion", [None, "units"])
def test_balance_sheet_net_profit_equals_income_statement(tmp_path: Path, name: str, conversion: str | None) -> None:
    ledger = tmp_path / f"{name}.bean"
    ledger.write_text(LEDGERS[name])
    extra = ("-x", conversion) if conversion else ()

    sheet = _data(tmp_path, ledger, "balance-sheet", *extra)
    statement = _data(tmp_path, ledger, "income-statement", *extra)

    assert sheet["net_profit"] == statement["net_profit"]


def test_partial_and_empty_profits_read_like_the_income_statement(tmp_path: Path) -> None:
    noprice = tmp_path / "noprice.bean"
    noprice.write_text(NOPRICE)
    opens = tmp_path / "opens.bean"
    opens.write_text(OPENS)

    partial = _data(tmp_path, noprice, "balance-sheet")
    assert partial["net_profit"] == {"USD": None}
    assert partial["current_earnings"] == {"USD": None}

    quiet = _data(tmp_path, opens, "balance-sheet")
    assert quiet["net_profit"] == {"USD": "0"}
    assert quiet["current_earnings"] == {"USD": "0"}

    text = _bea(tmp_path, "--file", str(noprice), "report", "balance-sheet", "--allow-errors")
    assert text.returncode == 0, text.stderr
    assert "Net Profit is Unavailable USD" in text.stdout
    assert "50 EUR" not in text.stdout.split("Net Profit is", 1)[1]

    units = _data(tmp_path, noprice, "balance-sheet", "-x", "units")
    assert units["net_profit"] == {"EUR": "50"}
    assert units["current_earnings"] == {"EUR": "-50"}
