"""Accepted rounding is reported as rounding, not as valuation or translation (w1/304).

Two `3.333 USD` legs against `-6.67 USD` leave 0.004 USD, inside the 0.005
tolerance Beancount infers, so `bea check` passes. On a USD-only ledger with no
price the balance sheet and the trial balance printed that 0.004 USD as a
"Valuation/translation adjustment", while the cash flow already called it a
rounding residual. Both statements now carry it on its own `rounding_residual`
line and keep the valuation line for what valuing moves.
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

SPLIT = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Rent USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Opening"
  Assets:Cash  100.00 USD
  Equity:Opening
2024-01-02 * "Split bill"
  Expenses:Food  3.333 USD
  Expenses:Rent  3.333 USD
  Assets:Cash   -6.67 USD
"""
# Holdings, a priced exchange and a split in each month: the market gain and
# the translation stay valuation, the two splits are rounding.
HOLDINGS = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Wallet USD
2024-01-01 open Assets:Euro EUR
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening-Balances
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Rent USD
2024-01-01 price AAPL 100.00 USD
2024-01-01 price EUR 1.10 USD
2024-01-02 * "Opening"
  Assets:Wallet 1000.00 USD
  Equity:Opening-Balances
2024-01-10 * "Buy"
  Assets:Broker 5 AAPL {100.00 USD}
  Assets:Wallet -500.00 USD
2024-01-15 * "Split bill"
  Expenses:Food  3.333 USD
  Expenses:Rent  3.333 USD
  Assets:Wallet   -6.67 USD
2024-01-20 * "Exchange"
  Assets:Euro 90.00 EUR @ 1.10 USD
  Assets:Wallet -99.00 USD
2024-02-15 * "Split bill"
  Expenses:Food  3.333 USD
  Expenses:Rent  3.333 USD
  Assets:Wallet   -6.67 USD
2024-02-28 price AAPL 120.00 USD
2024-02-28 price EUR 1.20 USD
"""
# Dollars bought and spent in January with no EUR price for them: `--time`
# keeps the opening plugs (w5/790), and those absorb January's rounding, so
# only February's 0.002 EUR is in the trees.
KEPT_PLUGS = """\
option "operating_currency" "EUR"
option "conversion_currency" "EUR"
2026-01-01 open Assets:Bank EUR
2026-01-01 open Assets:Wallet EUR, USD
2026-01-01 open Expenses:Food EUR, USD
2026-01-01 open Expenses:Rent EUR
2026-01-01 open Equity:Opening-Balances EUR, USD
2026-01-01 * "Seed"
  Assets:Bank 1000.00 EUR
  Equity:Opening-Balances
2026-01-10 * "Buy USD"
  Assets:Wallet 100.00 USD @ 0.92 EUR
  Assets:Bank
2026-01-12 * "Dinner"
  Expenses:Food 100.00 USD @ 0.92 EUR
  Assets:Wallet -100.00 USD @ 0.92 EUR
2026-01-20 * "Split January"
  Expenses:Food  3.333 EUR
  Expenses:Rent  3.333 EUR
  Assets:Bank   -6.67 EUR
2026-02-20 * "Split February"
  Expenses:Food  1.111 EUR
  Expenses:Rent  1.111 EUR
  Assets:Bank   -2.22 EUR
"""
EXACT = SPLIT.replace("3.333 USD", "3.335 USD")
SECTIONS = ("assets", "liabilities", "equity", "income", "expenses")


def _run(tmp_path: Path, text: str, *argv: str) -> str:
    ledger = write_ledger(tmp_path, text)
    run = bea(["-f", str(ledger), *argv], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    return run.stdout


def _data(tmp_path: Path, text: str, *argv: str) -> dict[str, Any]:
    return dict(json.loads(_run(tmp_path, text, "--json", *argv))["data"])


def _decimals(balance: dict[str, Any] | None) -> dict[str, Decimal]:
    return {currency: Decimal(number) for currency, number in (balance or {}).items() if Decimal(number)}


def _lines(data: dict[str, Any]) -> tuple[dict[str, Decimal], dict[str, Decimal]]:
    """The valuation and rounding lines, zeros dropped."""
    return _decimals(data["valuation_adjustment"]), _decimals(data["rounding_residual"])


def _net(data: dict[str, Any]) -> dict[str, Decimal]:
    """A trial balance's five roots plus both derived lines, per currency, zeros dropped."""
    total: dict[str, Decimal] = defaultdict(Decimal)
    balances = [data[name]["balance_children"] for name in SECTIONS]
    for balance in [*balances, data["valuation_adjustment"], data["rounding_residual"]]:
        for currency, number in balance.items():
            total[currency] += Decimal(number)
    return {currency: number for currency, number in total.items() if number}


def _amount(text: str, label: str) -> str | None:
    """The amount printed on a labelled text line, or None when the line is absent."""
    for line in text.splitlines():
        if line.strip().startswith(label):
            return line.split(":", 1)[1].strip()
    return None


@pytest.mark.parametrize("report", ["balance-sheet", "trial-balance"])
def test_the_split_is_rounding_not_valuation(tmp_path: Path, report: str) -> None:
    data = _data(tmp_path, SPLIT, "report", report)

    assert data["valuation_adjustment"] == {"USD": "0"}
    assert data["rounding_residual"] == {"USD": "0.004"}


def test_the_sheet_still_reconciles_to_the_same_total(tmp_path: Path) -> None:
    data = _data(tmp_path, SPLIT, "report", "balance-sheet")

    assert data["equity_reconciled"] is True
    assert _decimals(data["equity_total"]) == {"USD": Decimal("-93.33")}
    parts = [data["equity"]["balance_children"], data["current_earnings"], data["rounding_residual"]]
    total: dict[str, Decimal] = defaultdict(Decimal)
    for balance in [*parts, data["valuation_adjustment"]]:
        for currency, number in balance.items():
            total[currency] += Decimal(number)
    assert dict(total) == {"USD": Decimal("-93.33")}


def test_the_trial_balance_still_nets_to_zero(tmp_path: Path) -> None:
    assert _net(_data(tmp_path, SPLIT, "report", "trial-balance")) == {}


def test_text_labels_the_amount_as_rounding(tmp_path: Path) -> None:
    sheet = _run(tmp_path, SPLIT, "report", "balance-sheet")
    assert _amount(sheet, "Valuation/translation adjustment (credit):") == "0.000 USD"
    assert _amount(sheet, "Rounding residual (credit):") == "0.004 USD"
    assert _amount(sheet, "Total equity (credit):") == "-93.330 USD"

    for argv in (("report", "trial-balance"), ("balance",)):
        trial = _run(tmp_path, SPLIT, *argv)
        assert _amount(trial, "Valuation/translation adjustment:") is None
        assert _amount(trial, "Rounding residual:") == "0.004 USD"
        lines = trial.splitlines()
        rounding = next(index for index, row in enumerate(lines) if "Rounding residual:" in row)
        assert lines[rounding - 1].strip().startswith("Opening")


@pytest.mark.parametrize("report", ["balance-sheet", "trial-balance"])
def test_csv_carries_a_rounding_row(tmp_path: Path, report: str) -> None:
    rows = list(csv.DictReader(io.StringIO(_run(tmp_path, SPLIT, "report", report, "--format", "csv"))))
    lines = ("valuation_adjustment", "rounding_residual")
    by_section = {row["section"]: row for row in rows if row["section"] in lines}

    assert Decimal(by_section["valuation_adjustment"]["amount"]) == 0
    assert (by_section["rounding_residual"]["currency"], by_section["rounding_residual"]["amount"]) == ("USD", "0.004")


def test_at_cost_the_split_is_still_rounding(tmp_path: Path) -> None:
    data = _data(tmp_path, SPLIT, "report", "trial-balance", "-x", "at_cost")

    assert _lines(data) == ({}, {"USD": Decimal("0.004")})
    assert _net(data) == {}


def test_the_cash_flow_already_agreed_and_is_unchanged(tmp_path: Path) -> None:
    data = _data(tmp_path, SPLIT, "report", "cash-flow")

    assert data["rounding_residual"] == {"USD": "-0.004"}


def test_a_ledger_that_balances_exactly_has_no_rounding_line(tmp_path: Path) -> None:
    for report in ("balance-sheet", "trial-balance"):
        assert _data(tmp_path, EXACT, "report", report)["rounding_residual"] == {"USD": "0"}
        assert "Rounding residual" not in _run(tmp_path, EXACT, "report", report)


def test_a_split_the_ledger_spells_as_arithmetic_reads_as_rounding(tmp_path: Path) -> None:
    # `bea add` refuses `10/3 USD` (w1/313), but a ledger may spell it natively,
    # and Beancount evaluates it to 28 digits on load.
    legs = "  Expenses:Food 10/3 USD\n  Expenses:Rent 10/3 USD\n  Assets:Cash -6.67 USD\n"
    write_ledger(tmp_path, SPLIT.split('2024-01-02 * "Split bill"')[0] + '2024-01-02 * "split"\n' + legs)
    ledger = str(tmp_path / "main.beancount")

    run = bea(["-f", ledger, "--json", "report", "trial-balance"], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    data = json.loads(run.stdout)["data"]
    assert _lines(data) == ({}, {"USD": Decimal("0.003333333333333333333333334")})
    assert _net(data) == {}


@pytest.mark.parametrize("report", ["balance-sheet", "trial-balance"])
@pytest.mark.parametrize("form", [(), ("-t", "2024-02"), ("-x", "at_value")], ids=["usd", "usd-time", "at-value"])
def test_holdings_keep_their_valuation_beside_the_rounding(tmp_path: Path, report: str, form: tuple[str, ...]) -> None:
    data = _data(tmp_path, HOLDINGS, "report", report, *form)

    # The AAPL gain (+100) and the EUR translation (+9) are valuation; both
    # months' splits are rounding, January's carried in by the period's opening.
    assert _lines(data) == ({"USD": Decimal("-109")}, {"USD": Decimal("0.008")})


def test_a_priced_exchange_stays_translation_at_cost(tmp_path: Path) -> None:
    data = _data(tmp_path, HOLDINGS, "report", "trial-balance", "-x", "at_cost", "-t", "2024-02")

    assert _lines(data) == ({"EUR": Decimal("-90"), "USD": Decimal("99")}, {"USD": Decimal("0.008")})
    assert _net(data) == {}


@pytest.mark.parametrize("report", ["balance-sheet", "trial-balance"])
def test_kept_opening_plugs_leave_only_the_periods_rounding(tmp_path: Path, report: str) -> None:
    data = _data(tmp_path, KEPT_PLUGS, "report", report, "-t", "2026-02")

    assert _lines(data) == ({}, {"EUR": Decimal("-0.002")})


@pytest.mark.parametrize(
    "argv",
    [
        ("report", "trial-balance", "-a", "Assets"),
        ("report", "trial-balance", "-x", "units"),
        ("balance", "Cash"),
        ("report", "balance-sheet", "-a", "Assets"),
        ("report", "balance-sheet", "-x", "units"),
    ],
    ids=["trial-account", "trial-units", "balance-terms", "sheet-account", "sheet-units"],
)
def test_the_rounding_line_is_withheld_with_the_valuation_line(tmp_path: Path, argv: tuple[str, ...]) -> None:
    data = _data(tmp_path, SPLIT, *argv)

    assert data["valuation_adjustment"] is None
    assert data["rounding_residual"] is None
    assert "Rounding residual" not in _run(tmp_path, SPLIT, *argv)


def test_loader_errors_withhold_the_rounding_line(tmp_path: Path) -> None:
    unbalanced = '2024-01-05 * "Unbalanced"\n  Assets:Cash 1.00 USD\n  Equity:Opening 2.00 USD\n'
    data = _data(tmp_path, SPLIT + unbalanced, "report", "trial-balance", "--allow-errors")

    assert data["ledger_valid"] is False
    assert data["rounding_residual"] is None
