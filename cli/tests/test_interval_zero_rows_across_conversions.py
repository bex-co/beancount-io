"""A quiet interval row keeps its place in every conversion mode (w3/373)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Income:Job USD
2020-01-01 open Expenses:Food USD

2020-02-05 * "Pay"
  Income:Job    -100.00 USD
  Assets:Cash    100.00 USD

2020-03-10 * "Lunch"
  Expenses:Food   12.00 USD
  Assets:Cash    -12.00 USD

2020-05-10 * "Dinner"
  Expenses:Food   20.00 USD
  Assets:Cash    -20.00 USD
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


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _periods(tmp_path: Path, *extra: str) -> list[dict]:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), "report", "income-statement", *extra)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["periods"]


def test_quiet_month_keeps_its_period_in_both_conversions(tmp_path: Path) -> None:
    default = _periods(tmp_path)
    units = _periods(tmp_path, "-x", "units", "--allow-errors")
    assert [period["date"] for period in default] == [period["date"] for period in units]
    assert "2020-04-30" in [period["date"] for period in default]


def test_currency_conversion_names_its_currency_in_every_row(tmp_path: Path) -> None:
    quiet = next(period for period in _periods(tmp_path) if period["date"] == "2020-04-30")
    assert quiet["net_profit"] == {"USD": "0"}


def test_per_unit_conversion_names_only_commodities_present(tmp_path: Path) -> None:
    quiet = next(
        period for period in _periods(tmp_path, "-x", "units", "--allow-errors") if period["date"] == "2020-04-30"
    )
    # Absent amounts, not an absent period: the row is still there.
    assert quiet["net_profit"] == {}


def test_net_worth_series_spells_zero_the_same_way(tmp_path: Path) -> None:
    ledger = tmp_path / "bs.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Equity:Opening\n"
        '2020-03-05 * "Seed"\n'
        "  Assets:Cash    100.00 USD\n"
        "  Equity:Opening\n"
    )
    for extra, quiet in (((), {"USD": "0"}), (("-x", "units"), {})):
        result = _bea(tmp_path, "--json", "--file", str(ledger), "report", "balance-sheet", "-t", "2020", *extra)
        assert result.returncode == 0, result.stderr
        series = {point["date"]: point["balance"] for point in json.loads(result.stdout)["data"]["net_worth_series"]}
        assert series["2020-01-31"] == quiet, extra
        assert series["2020-03-31"] == {"USD": "100.00"}
