"""A valued trial balance nets to zero through its valuation adjustment line (w1/287).

Valued at market, a holding's unrealized gain and a currency's translation
left the five trees unbalanced with no line to carry them: 1,109 USD of assets
against -1,000 USD of equity, exit 0. With `-t` the clamp's conversion booking
added `Equity:Conversions:Current`, so the same entries split equity another
way, and the report pack marked correct books NOT RECONCILED. The trial
balance now derives the balance sheet's adjustment, folds the clamp's booking
into it, and only `units` keeps a residual.
"""

from __future__ import annotations

import csv
import io
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Wallet USD
2024-01-01 open Assets:Euro EUR
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening-Balances
2024-01-02 * "Opening"
  Assets:Wallet 1000.00 USD
  Equity:Opening-Balances
2024-01-10 * "Buy"
  Assets:Broker 5 AAPL {100.00 USD}
  Assets:Wallet -500.00 USD
2024-01-20 * "Exchange"
  Assets:Euro 90.00 EUR @ 1.10 USD
  Assets:Wallet -99.00 USD
2024-01-31 price AAPL 120.00 USD
2024-01-31 price EUR 1.20 USD
"""
PLAIN = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Equity:Opening-Balances
2024-01-01 open Expenses:Food USD
2024-01-02 * "Opening"
  Assets:Bank 1000.00 USD
  Equity:Opening-Balances
2024-01-05 * "Lunch"
  Expenses:Food 12.00 USD
  Assets:Bank
"""
SECTIONS = ("assets", "liabilities", "equity", "income", "expenses")
FORMS = [(), ("-t", "2024-01"), ("-x", "at_cost"), ("-x", "at_cost", "-t", "2024-01")]
EXPECTED = {
    (): {"USD": Decimal("-109")},
    ("-t", "2024-01"): {"USD": Decimal("-109")},
    ("-x", "at_cost"): {"EUR": Decimal("-90"), "USD": Decimal("99")},
    ("-x", "at_cost", "-t", "2024-01"): {"EUR": Decimal("-90"), "USD": Decimal("99")},
}


def _run(tmp_path: Path, *argv: str) -> str:
    run = bea(["-f", str(tmp_path / "main.beancount"), *argv], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    return run.stdout


def _data(tmp_path: Path, *argv: str) -> dict[str, Any]:
    return dict(json.loads(_run(tmp_path, "--json", *argv))["data"])


def _decimals(balance: dict[str, Any] | None) -> dict[str, Decimal]:
    return {currency: Decimal(number) for currency, number in (balance or {}).items() if Decimal(number)}


def _net(data: dict[str, Any]) -> dict[str, Decimal]:
    """The five roots plus the adjustment line, per currency, zeros dropped."""
    total: dict[str, Decimal] = defaultdict(Decimal)
    for balance in [*(data[name]["balance_children"] for name in SECTIONS), data["valuation_adjustment"] or {}]:
        for currency, number in balance.items():
            total[currency] += Decimal(number)
    return {currency: number for currency, number in total.items() if number}


def _accounts(node: dict[str, Any]) -> set[str]:
    found = {node["account"]}
    for child in node["children"]:
        found |= _accounts(child)
    return found


@pytest.mark.parametrize("form", FORMS, ids=["usd", "usd-time", "at-cost", "at-cost-time"])
def test_every_valued_form_nets_to_zero(tmp_path: Path, form: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)
    data = _data(tmp_path, "report", "trial-balance", *form)

    assert _decimals(data["valuation_adjustment"]) == EXPECTED[form]
    assert _net(data) == {}
    # The clamp's conversion booking is folded into the line, not shown twice.
    assert "Equity:Conversions:Current" not in _accounts(data["equity"])
    assert _decimals(data["equity"]["balance_children"]) == {"USD": Decimal("-1000")}


@pytest.mark.parametrize("valuation", [(), ("-x", "at_cost")], ids=["usd", "at-cost"])
def test_time_and_no_time_split_equity_alike(tmp_path: Path, valuation: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)
    plain = _data(tmp_path, "report", "trial-balance", *valuation)
    ranged = _data(tmp_path, "report", "trial-balance", *valuation, "-t", "2024-01")

    assert ranged["equity"] == plain["equity"]
    assert ranged["valuation_adjustment"] == plain["valuation_adjustment"]


@pytest.mark.parametrize("form", [(), ("-t", "2024-01")], ids=["plain", "time"])
def test_the_line_is_the_balance_sheets_adjustment(tmp_path: Path, form: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)
    trial = _data(tmp_path, "report", "trial-balance", *form)
    sheet = _data(tmp_path, "report", "balance-sheet", *form)

    assert sheet["equity_reconciled"] is True
    assert _decimals(trial["valuation_adjustment"]) == _decimals(sheet["valuation_adjustment"])
    assert trial["equity"] == sheet["equity"]


@pytest.mark.parametrize("form", FORMS, ids=["usd", "usd-time", "at-cost", "at-cost-time"])
def test_text_shows_the_line_after_equity(tmp_path: Path, form: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)
    text = _run(tmp_path, "report", "trial-balance", *form)

    amount = "-109.00 USD" if "at_cost" not in form else "-90.00 EUR  99.00 USD"
    lines = text.splitlines()
    line = next(row for row in lines if "Valuation/translation adjustment:" in row)
    assert line.split(":", 1)[1].strip() == amount
    equity = next(index for index, row in enumerate(lines) if row.startswith("  Equity"))
    income = next(index for index, row in enumerate(lines) if row.startswith("  Income"))
    assert equity < lines.index(line) < income
    assert "Conversions" not in text


@pytest.mark.parametrize("form", FORMS, ids=["usd", "usd-time", "at-cost", "at-cost-time"])
def test_csv_rows_net_to_zero(tmp_path: Path, form: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)
    rows = list(csv.DictReader(io.StringIO(_run(tmp_path, "report", "trial-balance", *form, "--format", "csv"))))

    adjustment = [row for row in rows if row["section"] == "valuation_adjustment"]
    assert {row["currency"]: Decimal(row["amount"]) for row in adjustment} == EXPECTED[form]
    total: dict[str, Decimal] = defaultdict(Decimal)
    for row in rows:
        if row["amount"]:
            total[row["currency"]] += Decimal(row["amount"])
    assert {currency: number for currency, number in total.items() if number} == {}


def test_balance_with_no_terms_is_the_same_trial_balance(tmp_path: Path) -> None:
    write_ledger(tmp_path, LEDGER)
    balances = _data(tmp_path, "balance", "-t", "2024-01")
    trial = _data(tmp_path, "report", "trial-balance", "-t", "2024-01")

    assert balances["valuation_adjustment"] == trial["valuation_adjustment"]
    assert _net(balances) == {}
    assert "Valuation/translation adjustment:               -109.00 USD" in _run(tmp_path, "balance")


@pytest.mark.parametrize(
    "argv",
    [
        ("report", "trial-balance", "-a", "Assets"),
        ("report", "trial-balance", "-t", "2024-01", "-a", "Equity"),
        ("balance", "Equity"),
    ],
    ids=["account", "account-time", "balance-terms"],
)
def test_a_scoped_view_has_no_line(tmp_path: Path, argv: tuple[str, ...]) -> None:
    write_ledger(tmp_path, LEDGER)

    assert _data(tmp_path, *argv)["valuation_adjustment"] is None
    assert "Valuation/translation adjustment" not in _run(tmp_path, *argv)


def test_units_keeps_the_conversions_row_and_derives_no_line(tmp_path: Path) -> None:
    write_ledger(tmp_path, LEDGER)
    data = _data(tmp_path, "report", "trial-balance", "-x", "units", "-t", "2024-01")

    assert data["valuation_adjustment"] is None
    assert "Equity:Conversions:Current" in _accounts(data["equity"])
    # Lots at cost cannot net in their own units: the AAPL lot is the residual.
    assert _net(data) == {"AAPL": Decimal("5"), "USD": Decimal("-500")}


def test_loader_errors_withhold_the_line(tmp_path: Path) -> None:
    unbalanced = '2024-01-25 * "Unbalanced"\n  Assets:Wallet 1.00 USD\n  Equity:Opening-Balances 2.00 USD\n'
    write_ledger(tmp_path, LEDGER + unbalanced)
    data = _data(tmp_path, "report", "trial-balance", "--allow-errors")

    assert data["ledger_valid"] is False
    assert data["valuation_adjustment"] is None


def test_a_ledger_without_holdings_nets_with_a_zero_line_shown_only_in_data(tmp_path: Path) -> None:
    write_ledger(tmp_path, PLAIN)
    data = _data(tmp_path, "report", "trial-balance")

    assert data["valuation_adjustment"] == {"USD": "0"}
    assert _net(data) == {}
    assert "Valuation/translation adjustment" not in _run(tmp_path, "report", "trial-balance")
