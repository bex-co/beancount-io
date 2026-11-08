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

import pytest

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


@pytest.mark.parametrize("root,sign", [("Expenses", 1), ("Income", -1)])
@pytest.mark.parametrize("posting", ["10", "10.00"])
def test_declared_budget_cents_survive_whole_unit_actuals(tmp_path: Path, root: str, sign: int, posting: str) -> None:
    account = f"{root}:Food"
    text = (
        HEAD
        + f"""\
2026-01-01 open Income:Food USD
2026-01-01 custom "budget" {account} "monthly" 100.49 USD
2026-01-02 * "Actual"
  {account} {"" if sign == 1 else "-"}{posting} USD
  Assets:Bank
"""
    )
    row = _rows(_report(["-t", "2026-01"], tmp_path, text))[(account, "USD")]
    assert (row["budget"], row["actual"], row["variance"]) == ("100.49", posting, "-90.49")
    ledger = tmp_path / "main.beancount"
    csv_run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01", "--format", "csv"], tmp_path)
    assert csv_run.returncode == 0, csv_run.stderr
    exported = next(csv.DictReader(io.StringIO(csv_run.stdout)))
    assert (exported["budget"], exported["actual"], exported["variance"]) == ("100.49", posting, "-90.49")
    human = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01"], tmp_path)
    assert human.returncode == 0, human.stderr
    assert "100.49 USD" in human.stdout and "-90.49 USD" in human.stdout
    assert ledger.read_text() == text


@pytest.mark.parametrize("with_posting", [False, True])
def test_tiny_declared_budget_survives_zero_or_absent_actuals(tmp_path: Path, with_posting: bool) -> None:
    text = HEAD + '2026-01-01 custom "budget" Expenses:Food "monthly" 0.12345678 USD\n'
    if with_posting:
        text += '2026-01-02 * "Zero"\n  Expenses:Food 0 USD\n  Assets:Bank 0 USD\n'
    row = _rows(_report(["-t", "2026-01"], tmp_path, text))[("Expenses:Food", "USD")]
    assert (row["budget"], row["actual"], row["variance"]) == ("0.12345678", "0", "-0.12345678")
    ledger = tmp_path / "main.beancount"
    run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01", "--format", "csv"], tmp_path)
    assert run.returncode == 0, run.stderr
    exported = next(csv.DictReader(io.StringIO(run.stdout)))
    assert exported["budget"] == "0.12345678" and exported["variance"] == "-0.12345678"


@pytest.mark.parametrize(
    "example,calculated,shown", [("0", "100.49", "100"), ("0.00", "100.49", "100.49"), ("0.000", "100.490", "100.490")]
)
def test_explicit_budget_display_precision_preserves_calculated_value(
    tmp_path: Path, example: str, calculated: str, shown: str
) -> None:
    text = (
        f'option "display_precision" "USD:{example}"\n'
        + HEAD
        + '2026-01-01 custom "budget" Expenses:Food "monthly" 100.49 USD\n'
        + '2026-01-02 * "Food"\n  Expenses:Food 10 USD\n  Assets:Bank\n'
    )
    row = _rows(_report(["-t", "2026-01"], tmp_path, text))[("Expenses:Food", "USD")]
    assert row["budget"] == calculated
    assert Decimal(row["variance"]) == Decimal("-90.49")
    run = bea(["-f", str(tmp_path / "main.beancount"), "report", "budget", "-t", "2026-01"], tmp_path)
    assert run.returncode == 0, run.stderr
    assert f"{shown} USD" in run.stdout
    if example == "0":
        assert "100.49" not in run.stdout


def test_quotes_and_invalid_budgets_do_not_inflate_budget_or_other_report_precision(tmp_path: Path) -> None:
    text = (
        HEAD
        + '2026-01-01 custom "budget" Expenses:Food "monthly" 100.49 USD\n'
        + '2026-01-01 custom "budget" Expenses:Fun "invalid" 1.12345678 USD\n'
        + "2026-01-01 price HOOL 191.12345678 USD\n"
        + '2026-01-02 * "Food"\n  Expenses:Food 10 USD\n  Assets:Bank\n'
    )
    data = _report(["-t", "2026-01"], tmp_path, text)
    assert _rows(data)[("Expenses:Food", "USD")]["budget"] == "100.49"
    assert data["budget_errors"] == ["Invalid interval for budget entry"]
    ledger = tmp_path / "main.beancount"
    budget = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01"], tmp_path)
    assert budget.returncode == 0, budget.stderr
    assert "100.49 USD" in budget.stdout and "100.49000000" not in budget.stdout
    trial = bea(["-f", str(ledger), "report", "trial-balance", "-t", "2026-01"], tmp_path)
    assert trial.returncode == 0, trial.stderr
    assert "10 USD" in trial.stdout and "10.00 USD" not in trial.stdout


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


@pytest.mark.parametrize("root,sign", [("Expenses", 1), ("Income", -1)])
def test_a_child_budget_keeps_direct_parent_activity(tmp_path: Path, root: str, sign: int) -> None:
    parent = f"{root}:Food"
    child = f"{parent}:Dining"
    text = (
        HEAD
        + f"""\
2026-01-01 open Income:Food USD
2026-01-01 open Income:Food:Dining USD
2026-01-02 * "Parent"
  {parent} {sign * 30}.00 USD
  Assets:Bank
2026-01-03 * "Child"
  {child} {sign * 20}.00 USD
  Assets:Bank
2026-01-01 custom "budget" {child} "monthly" 100.00 USD
"""
    )
    data = _report(["-t", "2026-01"], tmp_path, text)
    rows = _rows(data)
    assert rows[(parent, "USD")] == {
        "account": parent,
        "account_type": root.lower(),
        "currency": "USD",
        "budget": None,
        "actual": "30.00",
        "variance": None,
        "status": "unbudgeted",
    }
    assert rows[(child, "USD")]["actual"] == "20.00"
    exact = _rows(_report(["-t", "2026-01", "-a", f"^{parent}$"], tmp_path, text))
    assert exact == {(parent, "USD"): rows[(parent, "USD")]}
    ledger = tmp_path / "main.beancount"
    for output in ([], ["--format", "csv"]):
        run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01", *output], tmp_path)
        assert run.returncode == 0, run.stderr
        assert parent in run.stdout and "30.00" in run.stdout
    # No budget lists both direct balances; a parent budget covers both.
    no_budget = text.rsplit("2026-01-01 custom", 1)[0]
    assert len(_rows(_report(["-t", "2026-01"], tmp_path, no_budget))) == 2
    parent_budget = text.replace(f'custom "budget" {child}', f'custom "budget" {parent}')
    rolled = _rows(_report(["-t", "2026-01"], tmp_path, parent_budget))
    assert list(rolled) == [(parent, "USD")]
    assert rolled[(parent, "USD")]["actual"] == "50.00"


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


@pytest.mark.parametrize("amount", ["100", '"100 USD"', "TRUE"])
def test_malformed_budget_amounts_keep_valid_budgets_and_actuals(tmp_path: Path, amount: str) -> None:
    text = (
        HEAD
        + f"""\
2026-01-01 custom "budget" Expenses:Fun "monthly" {amount}
2026-01-01 custom "budget" Expenses:Rent "monthly" 50.00 USD
2026-01-02 * "Fun"
  Expenses:Fun 30.00 USD
  Assets:Bank
2026-01-03 * "Rent"
  Expenses:Rent 10.00 USD
  Assets:Bank
"""
    )
    data = _report(["-t", "2026-01"], tmp_path, text)
    assert data["budget_errors"] == ["Invalid amount for budget entry: expected NUMBER CURRENCY"]
    rows = _rows(data)
    assert len(rows) == 2
    fun = rows[("Expenses:Fun", "USD")]
    assert (fun["status"], fun["actual"], fun["budget"], fun["variance"]) == ("unbudgeted", "30.00", None, None)
    rent = rows[("Expenses:Rent", "USD")]
    assert (rent["budget"], rent["actual"], rent["variance"]) == ("50.00", "10.00", "-40.00")
    allowed = _report(["-t", "2026-01", "--allow-errors"], tmp_path, text)
    assert allowed["periods"] == data["periods"]
    assert allowed["budget_errors"] == data["budget_errors"]
    ledger = tmp_path / "main.beancount"
    run = bea(["-f", str(ledger), "report", "budget", "-t", "2026-01"], tmp_path)
    assert run.returncode == 0, run.stderr
    assert "Expenses:Fun" in run.stdout and "Expenses:Rent" in run.stdout
    assert run.stderr.count("Budget directive ignored: Invalid amount") == 1
    assert "AttributeError" not in run.stderr
    assert ledger.read_text() == text


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


@pytest.mark.parametrize(
    "declaration,error",
    [
        ('"fortnightly-ish" 100.00 USD', "Invalid interval for budget entry"),
        ('"monthly" 100', "Invalid amount for budget entry: expected NUMBER CURRENCY"),
        (None, None),
    ],
)
def test_ignored_budget_diagnostics_reach_text_and_both_csv_destinations(
    tmp_path: Path, declaration: str | None, error: str | None
) -> None:
    text = (
        HEAD
        + '2026-01-01 custom "budget" Expenses:Rent "monthly" 50.00 USD\n'
        + '2026-01-02 * "Fun"\n  Expenses:Fun 10.00 USD\n  Assets:Bank\n'
    )
    if declaration is not None:
        text += f'2026-01-01 custom "budget" Expenses:Fun {declaration}\n'
    ledger = write_ledger(tmp_path, text)
    base = ["-f", str(ledger), "report", "budget", "-t", "2026-01"]
    structured = bea(["--json", *base], tmp_path)
    assert structured.returncode == 0, structured.stderr
    assert structured.stderr == ""
    data = json.loads(structured.stdout)["data"]
    assert data["budget_errors"] == ([] if error is None else [error])
    expected = data["periods"][0]["rows"]
    assert {row["account"] for row in expected} == {"Expenses:Fun", "Expenses:Rent"}
    exported = tmp_path / "budget.csv"
    csv_stdout = ""
    for options in ([], ["--format", "csv"], ["--output", str(exported)]):
        run = bea([*base, *options], tmp_path)
        assert run.returncode == 0, run.stderr
        if error is None:
            assert run.stderr == ""
        else:
            assert run.stderr.count(f"Budget directive ignored: {error}") == 1
        assert "Budget directive ignored" not in run.stdout
        assert ledger.read_text() == text
        if not options:
            assert "Expenses:Fun" in run.stdout and "50.00 USD" in run.stdout
            continue
        if "--output" in options:
            assert run.stdout == ""
            csv_text = exported.read_text()
            assert csv_text == csv_stdout
        else:
            csv_text = csv_stdout = run.stdout
        rows = list(csv.DictReader(io.StringIO(csv_text)))
        assert [(row["account"], row["budget"], row["actual"], row["variance"]) for row in rows] == [
            (row["account"], row["budget"] or "", row["actual"], row["variance"] or "") for row in expected
        ]


def _proration_text(
    amount: str,
    *,
    root: str = "Expenses",
    start: str = "2026-04-01",
    end: str = "2026-04-15",
    interval: str = "monthly",
) -> str:
    return f"""\
option "operating_currency" "USD"
{start} open Assets:Bank USD
{start} open {root}:Food USD
{start} custom "budget" {root}:Food "{interval}" {amount} USD
{start} * "Actual"
  {root}:Food {"" if root == "Expenses" else "-"}10.00 USD
  Assets:Bank
{end} note Assets:Bank "End"
"""


@pytest.mark.parametrize("explicit_dates", [False, True])
@pytest.mark.parametrize(
    "root,amount,budget,variance",
    [
        ("Expenses", "3000.01", "1500.01", "-1490.01"),
        ("Income", "3000.01", "1500.01", "-1490.01"),
        ("Expenses", "0.01", "0.01", "9.99"),
        ("Expenses", "12345.67", "6172.84", "-6162.84"),
        ("Expenses", "-3000.01", "-1500.01", "1510.01"),
    ],
)
def test_exact_half_budget_shares_round_half_up_in_every_output(
    tmp_path: Path, explicit_dates: bool, root: str, amount: str, budget: str, variance: str
) -> None:
    text = _proration_text(amount, root=root)
    dates = ["--time", "2026-04-01 - 2026-04-15"] if explicit_dates else []
    data = _report(dates, tmp_path, text)
    assert (data["periods"][0]["begin"], data["periods"][0]["end"]) == ("2026-04-01", "2026-04-15")
    row = _rows(data)[(f"{root}:Food", "USD")]
    assert (row["budget"], row["actual"], row["variance"]) == (budget, "10.00", variance)
    ledger = tmp_path / "main.beancount"
    for options in ([], ["--format", "csv"]):
        run = bea(["-f", str(ledger), "report", "budget", *dates, *options], tmp_path)
        assert run.returncode == 0, run.stderr
        if options:
            exported = next(csv.DictReader(io.StringIO(run.stdout)))
            assert (exported["budget"], exported["actual"], exported["variance"]) == (budget, "10.00", variance)
        else:
            assert f"{Decimal(budget):,.2f} USD" in run.stdout
            assert f"{Decimal(variance):,.2f} USD" in run.stdout
        assert ledger.read_text() == text


@pytest.mark.parametrize(
    "start,end,interval,amount,expected",
    [
        ("2026-04-01", "2026-04-14", "monthly", "3000.01", "1400.00"),
        ("2026-04-01", "2026-04-16", "monthly", "3000.01", "1600.01"),
        ("2026-04-01", "2026-04-30", "monthly", "3000.01", "3000.01"),
        ("2026-04-01", "2026-04-15", "monthly", "1.01", "0.51"),
        ("2026-04-01", "2026-04-15", "monthly", "100.01", "50.01"),
        ("2024-02-01", "2024-02-29", "monthly", "123.45", "123.45"),
        ("2026-01-01", "2026-01-31", "monthly", "123.45", "123.45"),
        ("2026-04-01", "2026-04-30", "monthly", "123.45", "123.45"),
        ("2026-04-06", "2026-04-12", "weekly", "123.45", "123.45"),
        ("2026-04-01", "2026-04-01", "daily", "123.45", "123.45"),
        ("2024-01-01", "2024-12-31", "yearly", "123.45", "123.45"),
        ("2026-01-01", "2026-03-31", "quarterly", "123.45", "123.45"),
        ("2026-01-01", "2026-02-14", "quarterly", "3000.01", "1500.01"),
        ("2024-01-01", "2024-07-01", "yearly", "3000.01", "1500.01"),
    ],
)
def test_budget_proration_retains_calendar_and_ordinary_controls(
    tmp_path: Path, start: str, end: str, interval: str, amount: str, expected: str
) -> None:
    text = _proration_text(amount, start=start, end=end, interval=interval)
    data = _report(["--time", f"{start} - {end}", "--interval", interval], tmp_path, text)
    assert _rows(data)[("Expenses:Food", "USD")]["budget"] == expected


@pytest.mark.parametrize("days,units", [(14, 0), (15, 1), (16, 1)])
def test_tiny_near_half_shares_do_not_cross_the_rounding_threshold(tmp_path: Path, days: int, units: int) -> None:
    amount = "0.00000000000000000001"
    text = _proration_text(amount, end="2026-04-30")
    data = _report(["--time", f"2026-04-01 - 2026-04-{days:02}"], tmp_path, text)
    assert _rows(data)[("Expenses:Food", "USD")]["budget"] == f"0.{units:020}"


def test_budget_changes_are_accumulated_before_rounding_once(tmp_path: Path) -> None:
    text = _proration_text("3000.01", end="2026-04-30")
    text += '2026-04-16 custom "budget" Expenses:Food "monthly" 6000.01 USD\n'
    row = _rows(_report(["--time", "2026-04"], tmp_path, text))[("Expenses:Food", "USD")]
    # 1500.005 + 3000.005 = 4500.01; rounding each half first gives 4500.02.
    assert (row["budget"], row["variance"]) == ("4500.01", "-4490.01")


def test_half_shares_keep_each_currencys_precision(tmp_path: Path) -> None:
    text = _proration_text("3000.01").replace("open Assets:Bank USD", "open Assets:Bank USD,EUR")
    text = text.replace("open Expenses:Food USD", "open Expenses:Food USD,EUR")
    text += '2026-04-01 custom "budget" Expenses:Food "monthly" 100.001 EUR\n'
    rows = _rows(_report([], tmp_path, text))
    assert (rows[("Expenses:Food", "USD")]["budget"], rows[("Expenses:Food", "EUR")]["budget"]) == ("1500.01", "50.001")


def test_shared_budget_callers_still_receive_unrounded_decimals() -> None:
    from datetime import date
    from decimal import localcontext

    from fava.modules.budgets import Budget, calculate_budget, calculate_budget_children
    from fava.util.date import INTERVALS

    budgets = {
        "Expenses:Food": [Budget("Expenses:Food", date(2026, 4, 1), INTERVALS["monthly"], Decimal("3000.01"), "USD")]
    }
    for calculate in (calculate_budget, calculate_budget_children):
        amount = calculate(budgets, "Expenses:Food", date(2026, 4, 1), date(2026, 4, 16))["USD"]
        assert isinstance(amount, Decimal)
        assert amount == Decimal("1500.005")
    # An explicitly supplied empty mapping means default two-place rounding;
    # the exact half-up result does not depend on the Decimal context.
    with localcontext() as ctx:
        ctx.prec = 2
        assert calculate_budget(budgets, "Expenses:Food", date(2026, 4, 1), date(2026, 4, 16), precision={})[
            "USD"
        ] == Decimal("1500.01")


def _budget_only_text(account: str = "Expenses:Travel", currency: str = "USD") -> str:
    return (
        'option "operating_currency" "USD"\n'
        f'2026-01-01 custom "budget" {account} "monthly" 100.00 {currency}\n'
        '2026-01-31 event "Anchor" "End"\n'
    )


@pytest.mark.parametrize("currency", ["USD", "EUR"])
@pytest.mark.parametrize("account,pattern", [("Expenses:Travel", "Expenses:Travel"), ("Expenses:Travel2026", "2026")])
def test_budget_only_account_matches_are_nonempty_without_opens_or_postings(
    tmp_path: Path, currency: str, account: str, pattern: str
) -> None:
    text = _budget_only_text(account, currency)
    unfiltered = _report(["-t", "2026-01"], tmp_path, text)
    data = _report(["-t", "2026-01", "-a", pattern], tmp_path, text)
    assert data["account_filter_empty"] is False
    assert data["account_filter_periods"] == []
    assert data["periods"] == unfiltered["periods"]
    assert data["ledger_valid"] is True and data["ledger_errors"] == [] and data["budget_errors"] == []
    assert _rows(data)[(account, currency)] == {
        "account": account,
        "account_type": "expenses",
        "currency": currency,
        "budget": "100.00",
        "actual": "0",
        "variance": "-100.00",
        "status": "budgeted",
    }
    ledger = tmp_path / "main.beancount"
    exported = tmp_path / "budget-only.csv"
    base = ["-f", str(ledger), "report", "budget", "-t", "2026-01", "-a", pattern]
    for options in ([], ["--format", "csv"], ["--output", str(exported)]):
        run = bea([*base, *options], tmp_path)
        assert run.returncode == 0, run.stderr
        assert "No accounts match" not in run.stderr
        if not options:
            assert account in run.stdout and f"100.00 {currency}" in run.stdout
        else:
            if "--output" in options:
                assert run.stdout == ""
            table = exported.read_text() if "--output" in options else run.stdout
            row = next(csv.DictReader(io.StringIO(table)))
            assert (row["account"], row["currency"], row["budget"], row["actual"]) == (account, currency, "100.00", "0")
    # A budget declaration creates a budget row, but never a balance tree.
    trial = bea(["--json", "-f", str(ledger), "report", "trial-balance", "-t", "2026-01", "-a", pattern], tmp_path)
    assert trial.returncode == 0, trial.stderr
    trial_data = json.loads(trial.stdout)["data"]
    assert trial_data["account_filter_empty"] is True
    assert trial_data["account_filter_periods"] == (["2026"] if pattern == "2026" else [])
    assert ledger.read_text() == text


def test_budget_filter_emptiness_tracks_active_dates_and_unmatched_accounts(tmp_path: Path) -> None:
    text = _budget_only_text(currency="EUR")
    # The January declaration remains active in February, without a dated
    # entry in that month. Before its start it contributes no row.
    active = _report(["-t", "2026-02", "-a", "Expenses:Travel"], tmp_path, text)
    assert active["account_filter_empty"] is False
    assert _rows(active)[("Expenses:Travel", "EUR")]["budget"] == "100.00"
    for period, pattern, hints in (
        ("2025-12", "Expenses:Travel", []),
        ("2026-01", "Expenses:Missing", []),
        ("2026-01", "2025", ["2025"]),
    ):
        empty = _report(["-t", period, "-a", pattern], tmp_path, text)
        assert empty["account_filter_empty"] is True
        assert empty["account_filter_periods"] == hints
        assert _rows(empty) == {}
        for options in ([], ["--format", "csv"]):
            run = bea(
                ["-f", str(tmp_path / "main.beancount"), "report", "budget", "-t", period, "-a", pattern, *options],
                tmp_path,
            )
            assert run.returncode == 0, run.stderr
            assert f"No accounts match {pattern}." in run.stderr
    assert (tmp_path / "main.beancount").read_text() == text
