"""A filtered report's interval series agree with its headline (w3/395).

w3/322 pruned the statement trees to the filtered accounts, and w3/379 made
that prune honour regexes. The interval series were never narrowed: they came
straight from the chart module, which aggregates every posting under a root.
So one successful report gave two different amounts for the same account on
the same date — Cash headline 800.00 against a January series of 900.00,
because the entry filter keeps whole transactions and the counterparty legs
were still being totalled.

The same extra postings dragged in commodities the filter excluded, so a
Cash-only USD report failed on a missing HOOL quote it had no business
needing.

Unfiltered reports are the control throughout: narrowing by account must not
change what an unfiltered report says.
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
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Savings USD
2026-01-01 open Equity:Opening USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Rent USD
2026-01-02 * "Opening"
  Assets:Cash 1000.00 USD
  Equity:Opening
2026-01-05 * "Split expense"
  Expenses:Food 25.00 USD
  Expenses:Rent 75.00 USD
  Assets:Cash -100.00 USD
2026-01-10 * "Savings transfer"
  Assets:Savings 100.00 USD
  Assets:Cash -100.00 USD
"""

# Cash is funded 1000, spends 100, transfers 100 away: 800. A report filtered
# to Cash that answers 900 has counted the Savings leg it faced.
UNPRICED = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Stock HOOL
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash 1000.00 USD
  Equity:Opening
2026-01-05 * "Buy"
  Assets:Stock 1 HOOL {100.00 USD}
  Assets:Cash -100.00 USD
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
        timeout=120,
    )


def _report(tmp_path: Path, ledger: Path, kind: str, *extra: str) -> dict:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "report", kind, "-t", "2026-01", *extra)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)["data"]


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


@pytest.fixture
def unpriced(tmp_path: Path) -> Path:
    path = tmp_path / "unpriced.bean"
    path.write_text(UNPRICED, encoding="utf-8")
    return path


@pytest.mark.parametrize("account", ["Assets:Cash", "Assets:(Cash|Nope)", "Cash"])
def test_overview_series_agree_with_the_headline(tmp_path: Path, ledger: Path, account: str) -> None:
    """Parent, regex and component spellings of the same filter must all agree."""
    data = _report(tmp_path, ledger, "overview", "-a", account)

    assert data["totals"]["assets"] == {"USD": "800.00"}
    assert [point["balance"] for point in data["series"]["assets"]] == [{"USD": "800.00"}]
    assert data["totals"]["expenses"] == {}
    assert [point["balance"] for point in data["series"]["expenses"]] == [{}]


def test_balance_sheet_net_worth_series_agrees_with_its_headline(tmp_path: Path, ledger: Path) -> None:
    data = _report(tmp_path, ledger, "balance-sheet", "-a", "Assets:Cash")

    assert data["net_worth"] == {"USD": "800.00"}
    assert [point["balance"] for point in data["net_worth_series"]] == [{"USD": "800.00"}]


def test_income_statement_periods_agree_with_their_headline(tmp_path: Path, ledger: Path) -> None:
    """Food is 25.00 of a 100.00 split; the period must not report the Rent leg."""
    data = _report(tmp_path, ledger, "income-statement", "-a", "Expenses:Food")

    assert data["net_profit"] == {"USD": "-25.00"}
    assert [period["net_profit"] for period in data["periods"]] == [{"USD": "-25.00"}]
    assert [period["expenses"] for period in data["periods"]] == [{"USD": "25.00"}]


def test_the_human_table_agrees_too(tmp_path: Path, ledger: Path) -> None:
    """Fixing only JSON would leave the rendered breakdown contradicting itself."""
    done = _bea(tmp_path, "--file", str(ledger), "report", "income-statement", "-t", "2026-01", "-a", "Expenses:Food")

    assert done.returncode == 0, done.stderr
    assert "Net Profit: -25.00 USD" in done.stdout
    assert "100.00 USD" not in done.stdout, "the Rent leg must not appear in the breakdown"


@pytest.mark.parametrize(
    ("kind", "key", "series_key", "expected"),
    [
        ("balance-sheet", "net_worth", "net_worth_series", {"USD": "900.00"}),
        ("overview", None, None, None),
    ],
)
def test_unfiltered_reports_are_unchanged(
    tmp_path: Path, ledger: Path, kind: str, key: str | None, series_key: str | None, expected: dict | None
) -> None:
    """The control: narrowing by account must not move the unfiltered answer."""
    data = _report(tmp_path, ledger, kind)

    if key is not None and series_key is not None:
        assert data[key] == expected
        assert [point["balance"] for point in data[series_key]] == [expected]
    else:
        assert data["totals"]["assets"] == {"USD": "900.00"}
        assert [point["balance"] for point in data["series"]["assets"]] == [{"USD": "900.00"}]
        assert data["totals"]["expenses"] == {"USD": "100.00"}


def test_unfiltered_income_statement_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    data = _report(tmp_path, ledger, "income-statement")

    assert data["net_profit"] == {"USD": "-100.00"}
    assert [period["net_profit"] for period in data["periods"]] == [{"USD": "-100.00"}]


def test_a_filtered_report_does_not_need_an_excluded_commodities_price(tmp_path: Path, unpriced: Path) -> None:
    """Cash is unambiguously 900.00 USD; HOOL is not in scope and has no quote."""
    data = _report(tmp_path, unpriced, "overview", "-a", "Assets:Cash")

    assert data["totals"]["assets"] == {"USD": "900.00"}
    assert [point["balance"] for point in data["series"]["assets"]] == [{"USD": "900.00"}]
    assert data["missing_prices"] == []


@pytest.mark.parametrize("args", [("-a", "Assets:Stock"), ()])
def test_a_commodity_in_scope_still_fails_on_a_missing_price(
    tmp_path: Path, unpriced: Path, args: tuple[str, ...]
) -> None:
    """Strict valuation is the point; only out-of-scope commodities stop mattering."""
    done = _bea(tmp_path, "--json", "--file", str(unpriced), "report", "overview", "-t", "2026-01", *args)

    assert done.returncode == 1
    assert "Missing prices for HOOL" in done.stderr


def test_trial_balance_and_balance_controls_are_unchanged(tmp_path: Path, ledger: Path) -> None:
    """Both were correct before and are the oracle the other reports now match."""
    data = _report(tmp_path, ledger, "trial-balance", "-a", "Assets:Cash")
    assert data["assets"]["balance_children"] == {"USD": "800.00"}

    human = _bea(tmp_path, "--file", str(ledger), "balance", "Assets:Cash")
    assert human.returncode == 0, human.stderr
    assert "800.00 USD" in human.stdout


def test_filtered_balance_sheet_earnings_match_the_income_statement(tmp_path: Path, ledger: Path) -> None:
    """Earnings were summed before the prune, so the two reports disagreed."""
    sheet = _report(tmp_path, ledger, "balance-sheet", "-a", "Expenses:Food")
    statement = _report(tmp_path, ledger, "income-statement", "-a", "Expenses:Food")

    assert sheet["current_earnings"] == {"USD": "25.00"}
    assert sheet["net_profit"] == statement["net_profit"] == {"USD": "-25.00"}


def test_a_filtered_balance_sheet_still_claims_no_equity_reconciliation(tmp_path: Path, ledger: Path) -> None:
    """The existing rule, preserved: a narrowed sheet does not pretend to balance."""
    sheet = _report(tmp_path, ledger, "balance-sheet", "-a", "Expenses:Food")

    assert sheet["equity_reconciled"] is False
    assert sheet["equity_total"] is None
    assert sheet["valuation_adjustment"] is None


def test_unfiltered_earnings_and_reconciliation_are_unchanged(tmp_path: Path, ledger: Path) -> None:
    sheet = _report(tmp_path, ledger, "balance-sheet")

    assert sheet["current_earnings"] == {"USD": "100.00"}
    assert sheet["equity_reconciled"] is True
    assert sheet["equity_total"] == {"USD": "-900.00"}
