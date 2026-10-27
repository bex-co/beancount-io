"""`bea report cash-flow` bottom lines against the ledger's actual cash.

Each statement is read through the real CLI and compared with cash summed
independently by BQL over the original postings — opening before the
window's first day, closing before its exclusive end — never only with
`opening + net_change == closing`, which holds by construction when the
opening is derived from the net change.
"""

from __future__ import annotations

import json
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any

from tests.report_helpers import bea, write_ledger


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return bea(["--no-input", "--offline", *args], tmp_path)


def _cash_flow(tmp_path: Path, ledger: Path, *args: str) -> dict[str, Any]:
    proc = _bea(tmp_path, "--json", "--file", str(ledger), "report", "cash-flow", *args)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    data: dict[str, Any] = json.loads(proc.stdout)["data"]
    return data


def _human(tmp_path: Path, ledger: Path, *args: str) -> str:
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", *args)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return proc.stdout


def _amounts(values: dict[str, str]) -> dict[str, Decimal]:
    """Per-currency amounts with zeros dropped, so `{}` and `{"USD": "0"}` agree."""
    return {currency: Decimal(number) for currency, number in values.items() if Decimal(number) != 0}


def _actual_cash(tmp_path: Path, ledger: Path, accounts: list[str], before: str | None) -> dict[str, Decimal]:
    """BQL's sum of these accounts' postings dated before a day (all of them for None)."""
    members = " OR ".join(f"account = '{account}'" for account in accounts)
    where = f"({members})" + (f" AND date < {before}" if before else "")
    proc = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "query",
        f"SELECT currency, SUM(number) AS total WHERE {where} GROUP BY currency ORDER BY currency",
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    rows = json.loads(proc.stdout)["data"]["rows"]
    return {currency: Decimal(total) for currency, total in rows if Decimal(total) != 0}


def _assert_actual(
    tmp_path: Path, ledger: Path, data: dict[str, Any], accounts: list[str], first: str | None, after: str | None
) -> None:
    """Opening, closing and change equal the ledger's own cash at the window's edges."""
    opening = _actual_cash(tmp_path, ledger, accounts, first) if first else {}
    closing = _actual_cash(tmp_path, ledger, accounts, after)
    change = {
        currency: closing.get(currency, Decimal(0)) - opening.get(currency, Decimal(0))
        for currency in set(opening) | set(closing)
    }
    assert _amounts(data["opening"]) == opening
    assert _amounts(data["closing"]) == closing
    assert _amounts(data["net_change"]) == {currency: n for currency, n in change.items() if n}


# Prior capital and salary in January, ordinary February activity with a real
# owner contribution, a March salary, and nothing at all in April (w5/1048).
PRIOR_CASH = """\
option "operating_currency" "USD"
option "operating_currency" "EUR"
2024-01-01 open Assets:Cash USD,EUR
2024-01-01 open Equity:Opening USD,EUR
2024-01-01 open Income:Salary USD,EUR
2024-01-01 open Expenses:Food USD,EUR
2024-01-05 * "Prior capital"
  Assets:Cash      1000 USD
  Equity:Opening  -1000 USD
  Assets:Cash       200 EUR
  Equity:Opening   -200 EUR
2024-01-20 * "Prior salary"
  Assets:Cash     50 USD
  Income:Salary  -50 USD
2024-02-05 * "Salary"
  Assets:Cash     200 USD
  Income:Salary  -200 USD
  Assets:Cash      40 EUR
  Income:Salary   -40 EUR
2024-02-10 * "Food"
  Assets:Cash    -30 USD
  Expenses:Food   30 USD
  Assets:Cash     -5 EUR
  Expenses:Food    5 EUR
2024-02-15 * "Current contribution"
  Assets:Cash      80 USD
  Equity:Opening  -80 USD
  Assets:Cash      15 EUR
  Equity:Opening  -15 EUR
2024-03-05 * "Next salary"
  Assets:Cash     200 USD
  Income:Salary  -200 USD
  Assets:Cash      20 EUR
  Income:Salary   -20 EUR
"""

FEBRUARY_ROWS = {
    "operating": [
        {"account": "Expenses:Food", "amounts": {"USD": "-30", "EUR": "-5"}, "role_source": "heuristic"},
        {"account": "Income:Salary", "amounts": {"USD": "200", "EUR": "40"}, "role_source": "heuristic"},
    ],
    "investing": [],
    "financing": [{"account": "Equity:Opening", "amounts": {"USD": "80", "EUR": "15"}, "role_source": "heuristic"}],
}


def test_time_period_keeps_prior_cash_in_opening(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, PRIOR_CASH)
    exact = _cash_flow(tmp_path, ledger, "--from-date", "2024-02-01", "--to-date", "2024-02-29")
    for args in (
        ("--time", "2024-02"),
        ("--time", "2024-02", "--from-date", "2024-01-01"),
        ("--time", "2024-02", "--from-date", "2024-02-01", "--to-date", "2024-02-29"),
    ):
        data = _cash_flow(tmp_path, ledger, *args)
        assert data["sections"] == FEBRUARY_ROWS, args
        assert _amounts(data["opening"]) == {"USD": Decimal(1050), "EUR": Decimal(200)}, args
        assert _amounts(data["net_change"]) == {"USD": Decimal(250), "EUR": Decimal(50)}, args
        assert _amounts(data["closing"]) == {"USD": Decimal(1300), "EUR": Decimal(250)}, args
        _assert_actual(tmp_path, ledger, data, ["Assets:Cash"], "2024-02-01", "2024-03-01")
        # The same window spelled with exact bounds gives the same money.
        assert data["sections"] == exact["sections"], args
        assert data["cash_accounts"] == exact["cash_accounts"], args
        for key in ("net_change", "opening", "closing"):
            assert _amounts(data[key]) == _amounts(exact[key]), (args, key)


def test_quiet_month_reports_no_flows(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, PRIOR_CASH)
    data = _cash_flow(tmp_path, ledger, "--time", "2024-04")
    assert data["sections"] == {"operating": [], "investing": [], "financing": []}
    assert data["totals"] == {"operating": {}, "investing": {}, "financing": {}}
    assert data["net_change"] == {}
    assert _amounts(data["opening"]) == {"USD": Decimal(1500), "EUR": Decimal(270)}
    assert _amounts(data["closing"]) == {"USD": Decimal(1500), "EUR": Decimal(270)}
    _assert_actual(tmp_path, ledger, data, ["Assets:Cash"], "2024-04-01", "2024-05-01")


def test_first_month_still_counts_its_own_capital(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, PRIOR_CASH)
    data = _cash_flow(tmp_path, ledger, "--time", "2024-01")
    assert data["sections"]["operating"] == [
        {"account": "Income:Salary", "amounts": {"USD": "50"}, "role_source": "heuristic"}
    ]
    assert data["sections"]["financing"] == [
        {"account": "Equity:Opening", "amounts": {"USD": "1000", "EUR": "200"}, "role_source": "heuristic"}
    ]
    assert _amounts(data["opening"]) == {}
    _assert_actual(tmp_path, ledger, data, ["Assets:Cash"], "2024-01-01", "2024-02-01")


def test_time_period_human_figures_are_the_actual_cash(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, PRIOR_CASH)
    february = _human(tmp_path, ledger, "--time", "2024-02")
    assert "Net change in cash:  50 EUR  250 USD" in february
    assert "Opening cash:        200 EUR  1,050 USD" in february
    assert "Closing cash:        250 EUR  1,300 USD" in february
    assert "Total financing:     15 EUR  80 USD" in february
    assert "Earnings" not in february
    april = _human(tmp_path, ledger, "--time", "2024-04")
    assert "No cash flows in this period." in april
    assert "Opening cash:        270 EUR  1,500 USD" in april
    assert "Closing cash:        270 EUR  1,500 USD" in april


def test_maximum_end_date_keeps_closing_cash(tmp_path: Path) -> None:
    """`--to-date 9999-12-31` restricts nothing; it must not empty the closing (w5/1049)."""
    ledger = write_ledger(tmp_path, PRIOR_CASH)
    february = ("--time", "2024-02", "--from-date", "2024-02-01")
    whole: tuple[str, ...] = ()
    for window, first, after, closing in (
        (february, "2024-02-01", "2024-03-01", {"USD": Decimal(1300), "EUR": Decimal(250)}),
        (whole, None, None, {"USD": Decimal(1500), "EUR": Decimal(270)}),
    ):
        data = _cash_flow(tmp_path, ledger, *window, "--to-date", "9999-12-31")
        assert _amounts(data["closing"]) == closing, window
        assert data["cash_accounts"] == [
            {
                "account": "Assets:Cash",
                "balance": {currency: str(number) for currency, number in closing.items()},
                "role_source": "heuristic",
            }
        ]
        _assert_actual(tmp_path, ledger, data, ["Assets:Cash"], first, after)
        # The same statement as no end bound, and as the day before the limit.
        for control in (
            _cash_flow(tmp_path, ledger, *window),
            _cash_flow(tmp_path, ledger, *window, "--to-date", "9999-12-30"),
        ):
            assert data["period"] == control["period"], window
            assert data["as_of"] == control["as_of"], window
            assert data["sections"] == control["sections"], window
            for key in ("net_change", "opening", "closing"):
                assert _amounts(data[key]) == _amounts(control[key]), (window, key)
        human = _human(tmp_path, ledger, *window, "--to-date", "9999-12-31")
        assert human == _human(tmp_path, ledger, *window, "--to-date", "9999-12-30")
        assert f"Closing cash:        {closing['EUR']} EUR  {closing['USD']:,} USD" in human


def test_maximum_end_date_on_an_undated_ledger_stays_empty(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n')
    data = _cash_flow(tmp_path, ledger, "--to-date", "9999-12-31")
    assert data["period"] == {"start": None, "end_exclusive": None}
    assert (data["opening"], data["net_change"], data["closing"]) == ({}, {}, {})
