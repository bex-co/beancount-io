"""A report headline is judged at its own date, not by an earlier row's gap (w1/125).

Every interval row fed the valuation, and the headlines read `null` whenever
any row lacked a price. Holding EUR from January with its first quote in
February is ordinary, yet the balance sheet said net worth `null` beside
assets of 155.00 USD and a March series point of 155.00, and the income
statement printed "Net Profit: Unavailable USD" under "Income -55.00 USD".
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

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
LATE = (
    NOPRICE
    + """2026-02-10 price EUR 1.10 USD
2026-03-15 * "Top-up"
  Assets:Bank  0.00 USD
  Equity:Opening
"""
)


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


def _ledger(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def _data(tmp_path: Path, ledger: Path, kind: str) -> dict[str, Any]:
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", kind, "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    data: dict[str, Any] = json.loads(result.stdout)["data"]
    return data


def test_late_first_quote_keeps_the_headlines(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, LATE)

    sheet = _data(tmp_path, ledger, "balance-sheet")
    assert sheet["net_worth"] == {"USD": "155.00"}
    assert sheet["net_profit"] == {"USD": "55.00"}
    assert sheet["net_worth_series"][0] == {"date": "2026-01-31", "balance": {"USD": None}}
    assert sheet["net_worth_series"][-1] == {"date": "2026-03-31", "balance": {"USD": "155.00"}}
    # The rows still say what they could not value.
    assert sheet["valuation"] == "partial"
    assert sheet["missing_price_dates"] == [{"from": "EUR", "to": "USD", "date": "2026-01-31"}]

    statement = _data(tmp_path, ledger, "income-statement")
    assert statement["net_profit"] == {"USD": "55.00"}
    assert statement["periods"][0]["net_profit"] == {"USD": None}

    overview = _data(tmp_path, ledger, "overview")
    assert overview["totals"]["net_worth"] == {"USD": "155.00"}

    text = _bea(tmp_path, "--file", str(ledger), "report", "income-statement", "--allow-errors")
    assert text.returncode == 0, text.stderr
    assert "Net Profit: 55.00 USD" in text.stdout


def test_unpriced_at_as_of_still_nulls_the_headlines(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, NOPRICE)

    assert _data(tmp_path, ledger, "balance-sheet")["net_worth"] == {"USD": None}
    assert _data(tmp_path, ledger, "balance-sheet")["net_profit"] == {"USD": None}
    assert _data(tmp_path, ledger, "income-statement")["net_profit"] == {"USD": None}
    assert _data(tmp_path, ledger, "overview")["totals"]["net_worth"] == {"USD": None}
