"""A period's income and expenses have one value, whatever the interval (w1/m49).

The income statement valued its account trees and `Net Profit` at the as-of
rate and its interval rows at each interval's end. With EUR at 1.00 USD for
January's trip and 2.00 USD for February's, the trees read `Travel 400.00
USD` above monthly rows of 100.00 + 200.00, a yearly row read 400.00, and the
balance sheet's earnings 400.00 with no adjustment. Every income and expenses
posting is now valued on its own date, in the trees and the rows alike, and
balances keep the as-of rate: the valuation line takes the difference.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from tests.report_helpers import bea, write_ledger

TRAVEL = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Euro EUR
2026-01-01 open Expenses:Travel EUR
2026-01-01 open Equity:Opening EUR
2026-01-01 price EUR 1.00 USD
2026-01-02 * "Opening"
  Assets:Euro  1000.00 EUR
  Equity:Opening
2026-01-15 * "Trip one"
  Expenses:Travel  100.00 EUR
  Assets:Euro
2026-02-01 price EUR 2.00 USD
2026-02-15 * "Trip two"
  Expenses:Travel  100.00 EUR
  Assets:Euro
"""
# The same trips at a rate that never moves: a working control.
STEADY = TRAVEL.replace("2026-02-01 price EUR 2.00 USD\n", "")
# Shares held at cost given away: worth 500 on the day, 600 by the end.
CHARITY = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Broker VOO
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Charity VOO
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash  4000 USD
  Equity:Opening
2026-01-03 * "Buy"
  Assets:Broker  10 VOO {400 USD}
  Assets:Cash  -4000 USD
2026-02-01 price VOO 500 USD
2026-02-10 * "Donate"
  Expenses:Charity  5 VOO {400 USD}
  Assets:Broker  -5 VOO {400 USD}
2026-03-01 price VOO 600 USD
"""


def _data(tmp_path: Path, text: str, *argv: str) -> dict[str, Any]:
    run = bea(["-f", str(write_ledger(tmp_path, text)), "--json", *argv], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    return dict(json.loads(run.stdout)["data"])


def _text(tmp_path: Path, text: str, *argv: str) -> str:
    run = bea(["-f", str(write_ledger(tmp_path, text)), *argv], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    return run.stdout


def _usd(balance: dict[str, str] | None) -> Decimal:
    assert balance is not None and set(balance) == {"USD"}, balance
    return Decimal(balance["USD"])


@pytest.mark.parametrize(
    ("interval", "rows"),
    [("monthly", [-100, -200]), ("weekly", [-100, -200]), ("yearly", [-300])],
)
def test_the_rows_add_up_to_the_headline_at_every_interval(tmp_path: Path, interval: str, rows: list[int]) -> None:
    data = _data(tmp_path, TRAVEL, "report", "income-statement", "-i", interval)

    assert _usd(data["expenses"]["balance_children"]) == 300
    assert _usd(data["net_profit"]) == -300
    # Quiet weeks read zero; the trips' rows are each worth their own day's rate.
    assert [profit for period in data["periods"] if (profit := _usd(period["net_profit"]))] == rows
    assert sum(_usd(period["expenses"]) for period in data["periods"]) == 300

    text = _text(tmp_path, TRAVEL, "report", "income-statement", "-i", interval)
    assert "    Travel                                        300.00 USD" in text
    assert "Net Profit: -300.00 USD" in text


def test_the_overview_reads_the_same_flows(tmp_path: Path) -> None:
    data = _data(tmp_path, TRAVEL, "report", "overview")

    assert _usd(data["totals"]["expenses"]) == 300
    assert [_usd(point["balance"]) for point in data["series"]["expenses"]] == [100, 200]
    # Balances keep the as-of rate: 800 EUR at 2.00 USD.
    assert _usd(data["totals"]["assets"]) == 1600


def test_the_balance_sheet_moves_the_translation_into_the_adjustment(tmp_path: Path) -> None:
    data = _data(tmp_path, TRAVEL, "report", "balance-sheet")

    assert _usd(data["current_earnings"]) == 300
    assert _usd(data["net_profit"]) == -300
    assert _usd(data["valuation_adjustment"]) == 100
    assert _usd(data["equity_total"]) == -1600
    assert _usd(data["net_worth"]) == 1600
    assert data["equity_reconciled"] is True

    text = _text(tmp_path, TRAVEL, "report", "balance-sheet")
    assert "Current-period earnings (credit):               300.00 USD" in text
    assert "Valuation/translation adjustment (credit):      100.00 USD" in text
    assert "the same period's Net Profit is -300.00 USD" in text


@pytest.mark.parametrize("argv", [("report", "trial-balance"), ("balance",)], ids=["trial-balance", "balance"])
def test_the_trial_balance_nets_through_the_valuation_line(tmp_path: Path, argv: tuple[str, ...]) -> None:
    data = _data(tmp_path, TRAVEL, *argv)

    assert _usd(data["expenses"]["balance_children"]) == 300
    assert _usd(data["valuation_adjustment"]) == 100
    roots = ("assets", "liabilities", "equity", "income", "expenses")
    total = sum(Decimal(data[root]["balance_children"].get("USD", 0)) for root in roots)
    assert total + _usd(data["valuation_adjustment"]) == 0


def test_a_rate_that_never_moves_reads_as_before(tmp_path: Path) -> None:
    statement = _data(tmp_path, STEADY, "report", "income-statement")
    sheet = _data(tmp_path, STEADY, "report", "balance-sheet")

    assert _usd(statement["expenses"]["balance_children"]) == 200
    assert [_usd(period["expenses"]) for period in statement["periods"]] == [100, 100]
    assert _usd(sheet["current_earnings"]) == 200
    assert _usd(sheet["valuation_adjustment"]) == 0


@pytest.mark.parametrize("conversion", ["units", "at_cost"])
def test_per_unit_conversions_are_unchanged(tmp_path: Path, conversion: str) -> None:
    data = _data(tmp_path, TRAVEL, "report", "income-statement", "-x", conversion)

    assert data["expenses"]["balance_children"] == {"EUR": "200.00"}
    assert [period["expenses"] for period in data["periods"]] == [{"EUR": "100.00"}, {"EUR": "100.00"}]


@pytest.mark.parametrize("conversion", ["USD", "at_value"])
def test_shares_given_away_are_worth_their_price_on_the_day(tmp_path: Path, conversion: str) -> None:
    data = _data(tmp_path, CHARITY, "report", "income-statement", "-x", conversion, "--allow-errors")

    # 5 VOO at the 2026-02-01 price of 500, not the later 600.
    assert _usd(data["expenses"]["balance_children"]) == 2500
    assert sum(_usd(period["expenses"]) for period in data["periods"] if period["expenses"]) == 2500


def test_a_period_and_an_account_filter_value_the_same_way(tmp_path: Path) -> None:
    february = _data(tmp_path, TRAVEL, "report", "income-statement", "-t", "2026-02")
    filtered = _data(tmp_path, TRAVEL, "report", "income-statement", "--account", "Expenses:Travel")

    assert _usd(february["expenses"]["balance_children"]) == 200
    assert _usd(filtered["expenses"]["balance_children"]) == 300
    assert [_usd(period["expenses"]) for period in filtered["periods"]] == [100, 200]


def test_a_flow_with_no_price_on_its_day_keeps_its_commodity(tmp_path: Path) -> None:
    # The first quote comes after January's trip: no later quote values it.
    late = TRAVEL.replace("2026-01-01 price EUR 1.00 USD\n", "")
    data = _data(tmp_path, late, "report", "income-statement", "--allow-errors")

    assert data["expenses"]["balance_children"] == {"EUR": "100.00", "USD": "200.0000"}
    assert [period["expenses"] for period in data["periods"]] == [{"EUR": "100.00"}, {"USD": "200.0000"}]
    assert data["net_profit"] == {"USD": None}
    # The day it needs a price on is its own.
    assert data["missing_price_dates"] == [{"from": "EUR", "to": "USD", "date": "2026-01-15"}]
