"""`bea report budget` (w21/m7): budget, actual and variance per period.

Budgets are Fava's `custom "budget"` directives. Hand-computed expectations:
a whole month reads as declared, a child's spending rolls into the budgeted
parent, and a missing budget is `null`, never zero.
"""

from __future__ import annotations

import csv
import io
import json
from decimal import Decimal
from pathlib import Path
from typing import Any

from tests.report_helpers import bea, write_ledger

HEAD = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD,EUR
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Food USD,EUR
2026-01-01 open Expenses:Food:Dining USD
2026-01-01 open Expenses:Rent USD
2026-01-01 open Expenses:Fun USD
2026-01-01 open Expenses:Gifts USD
2026-01-01 open Equity:Opening USD
"""

LEDGER = (
    HEAD
    + """\
2026-01-01 custom "budget" Expenses:Food "monthly" 300.00 USD
2026-01-01 custom "budget" Expenses:Rent "monthly" 1000.00 USD
2026-01-01 custom "budget" Income:Salary "monthly" 3000.00 USD
2026-01-01 custom "budget" Expenses:Gifts "monthly" 0.00 USD
2026-01-02 * "Open"
  Assets:Bank 5000 USD
  Equity:Opening
2026-01-03 * "Pay"
  Assets:Bank 3100 USD
  Income:Salary
2026-01-05 * "Dinner"
  Expenses:Food:Dining 120.50 USD
  Assets:Bank
2026-01-06 * "Groceries abroad"
  Expenses:Food 40.00 EUR
  Assets:Bank
2026-01-06 * "Rent"
  Expenses:Rent 1000 USD
  Assets:Bank
2026-01-07 * "Fun"
  Expenses:Fun 80 USD
  Assets:Bank
2026-01-09 * "Gift"
  Expenses:Gifts 25 USD
  Assets:Bank
2026-01-31 * "Month end"
  Expenses:Food 10.00 USD
  Assets:Bank
"""
)


def _report(argv: list[str], tmp_path: Path, ledger_text: str = LEDGER) -> dict[str, Any]:
    ledger = write_ledger(tmp_path, ledger_text)
    run = bea(["--json", "-f", str(ledger), "report", "budget", *argv], tmp_path)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)["data"]


def _rows(data: dict[str, Any]) -> dict[tuple[str, str], dict[str, Any]]:
    assert len(data["periods"]) == 1
    return {(row["account"], row["currency"]): row for row in data["periods"][0]["rows"]}


def test_a_whole_month_reads_as_declared_with_subtree_actuals(tmp_path: Path) -> None:
    rows = _rows(_report(["-t", "2026-01"], tmp_path))
    food = rows[("Expenses:Food", "USD")]
    # 120.50 at Expenses:Food:Dining + 10.00 on the parent itself.
    assert (food["budget"], food["actual"], food["variance"]) == ("300.00", "130.50", "-169.50")
    rent = rows[("Expenses:Rent", "USD")]
    assert (rent["budget"], rent["actual"], rent["variance"]) == ("1000.00", "1000", "0.00")


def test_income_reads_as_earned_and_a_positive_variance_means_ahead(tmp_path: Path) -> None:
    salary = _rows(_report(["-t", "2026-01"], tmp_path))[("Income:Salary", "USD")]
    assert salary["account_type"] == "income"
    assert (salary["budget"], salary["actual"], salary["variance"]) == ("3000.00", "3100", "100.00")


def test_a_currency_with_no_budget_keeps_budget_and_variance_null(tmp_path: Path) -> None:
    rows = _rows(_report(["-t", "2026-01"], tmp_path))
    euro = rows[("Expenses:Food", "EUR")]
    assert (euro["budget"], euro["actual"], euro["variance"]) == (None, "40.00", None)


def test_an_unbudgeted_account_is_listed_without_a_budget(tmp_path: Path) -> None:
    rows = _rows(_report(["-t", "2026-01"], tmp_path))
    fun = rows[("Expenses:Fun", "USD")]
    assert (fun["status"], fun["budget"], fun["actual"], fun["variance"]) == ("unbudgeted", None, "80", None)
    # A child of a budgeted account is part of that budget, not a separate line.
    assert ("Expenses:Food:Dining", "USD") not in rows


def test_a_zero_budget_is_a_budget_not_a_missing_one(tmp_path: Path) -> None:
    gifts = _rows(_report(["-t", "2026-01"], tmp_path))[("Expenses:Gifts", "USD")]
    assert (gifts["status"], gifts["budget"], gifts["variance"]) == ("budgeted", "0.00", "25.00")


def test_a_budgeted_account_with_no_spending_shows_zero_actual(tmp_path: Path) -> None:
    data = _report(["-t", "2026-02"], tmp_path)
    rent = _rows(data)[("Expenses:Rent", "USD")]
    assert (rent["budget"], rent["actual"], rent["variance"]) == ("1000.00", "0", "-1000.00")


def test_the_last_period_is_prorated_by_day_and_rounded(tmp_path: Path) -> None:
    text = LEDGER + '2026-02-10 * "Late"\n  Expenses:Fun 1 USD\n  Assets:Bank\n'
    data = _report(["-t", "2026-02"], tmp_path, text)
    # A time filter names the whole month: 28 days of a monthly 300.
    assert _rows(data)[("Expenses:Food", "USD")]["budget"] == "300.00"
    whole = _report([], tmp_path, text)
    last = whole["periods"][-1]
    rows = {(r["account"], r["currency"]): r for r in last["rows"]}
    # The ledger ends on 2026-02-10: ten days of February at 300 * 10 / 28.
    assert Decimal(rows[("Expenses:Food", "USD")]["budget"]) == Decimal("107.14")


def test_the_account_filter_narrows_the_rows(tmp_path: Path) -> None:
    rows = _rows(_report(["-t", "2026-01", "-a", "Expenses:Rent"], tmp_path))
    assert {account for account, _ in rows} == {"Expenses:Rent"}


def test_a_ledger_without_budgets_says_so(tmp_path: Path) -> None:
    text = "\n".join(line for line in LEDGER.splitlines() if "custom" not in line) + "\n"
    data = _report(["-t", "2026-01"], tmp_path, text)
    assert data["has_budgets"] is False
    assert all(row["status"] == "unbudgeted" and row["budget"] is None for row in data["periods"][0]["rows"])
    ledger = tmp_path / "main.beancount"
    run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01"], tmp_path)
    assert run.returncode == 0, run.stderr
    assert "No budgets." in run.stdout


def test_an_invalid_budget_directive_is_reported_not_silently_zero(tmp_path: Path) -> None:
    text = LEDGER + '2026-01-01 custom "budget" Expenses:Fun "fortnightly-ish" 50.00 USD\n'
    data = _report(["-t", "2026-01"], tmp_path, text)
    assert data["budget_errors"] == ["Invalid interval for budget entry"]
    assert _rows(data)[("Expenses:Fun", "USD")]["status"] == "unbudgeted"
    run = bea(["-f", str(tmp_path / "main.beancount"), "report", "budget", "-t", "2026-01"], tmp_path)
    assert "Budget directive ignored: Invalid interval" in run.stderr


def test_text_labels_the_gaps(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01"], tmp_path)
    assert run.returncode == 0, run.stderr
    assert "Expenses:Fun (unbudgeted)" in run.stdout
    assert "no budget" in run.stdout


def test_csv_rows_match_the_json_rows(tmp_path: Path) -> None:
    data = _report(["-t", "2026-01"], tmp_path)
    run = bea(
        ["-f", str(tmp_path / "main.beancount"), "report", "budget", "-t", "2026-01", "--format", "csv"], tmp_path
    )
    assert run.returncode == 0, run.stderr
    rows = list(csv.DictReader(io.StringIO(run.stdout)))
    expected = data["periods"][0]["rows"]
    assert [(r["account"], r["currency"], r["budget"], r["actual"], r["variance"]) for r in rows] == [
        (e["account"], e["currency"], e["budget"] or "", e["actual"], e["variance"] or "") for e in expected
    ]
