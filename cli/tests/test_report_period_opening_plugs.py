"""A period opens at the ledger's own equity, and its translation reaches the adjustment (w1/296).

`--time` opens a period with Beancount's `<summarize>` transactions: each
account's opening position, then a plug on `Equity:Opening-Balances` at that
position's cost. Foreign cash and shares bought with `@` have no cost, so their
plugs landed on `Opening-Balances` in their own units and were valued at the
closing rate. February's sheet opened at -1,010.00 USD where the ledger holds
-1,000.00 and January closed at -1,000.00, with a 0.00 adjustment for a month
in which EUR rose. The equity tree now leaves the plugs out, so a period splits
equity as the unfiltered report does.
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
2026-01-01 open Assets:Wallet USD
2026-01-01 open Assets:Euro EUR
2026-01-01 open Assets:Broker AAPL
2026-01-01 open Equity:Opening-Balances USD
2026-01-02 * "Opening"
  Assets:Wallet  1000.00 USD
  Equity:Opening-Balances
"""
TAIL = """\
2026-02-28 * "noop"
  Assets:Wallet  0.00 USD
  Assets:Wallet  0.00 USD
"""
CASH = (
    HEAD
    + """\
2026-01-10 * "Exchange"
  Assets:Euro  100.00 EUR @ 1.10 USD
  Assets:Wallet  -110.00 USD
2026-01-10 price EUR 1.10 USD
2026-02-15 price EUR 1.20 USD
"""
    + TAIL
)
SHARES = (
    HEAD
    + """\
2026-01-10 * "Buy"
  Assets:Broker  2 AAPL @ 50.00 USD
  Assets:Wallet  -100.00 USD
2026-01-10 price AAPL 50.00 USD
2026-02-15 price AAPL 60.00 USD
"""
    + TAIL
)
AT_COST = SHARES.replace("2 AAPL @ 50.00 USD", "2 AAPL {50.00 USD}")
# Euros received as a gift before the period: the previous earnings hold a
# currency an asset holds too, so their plug leaves as well.
GIFT = CASH.replace(
    '2026-01-10 * "Exchange"',
    '2026-01-01 open Income:Gift EUR\n2026-01-05 * "Gift"\n  Assets:Euro  50.00 EUR\n  Income:Gift\n'
    '2026-01-10 * "Exchange"',
)
PLAIN = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening-Balances USD
2026-01-02 * "Opening"
  Assets:Bank  1000.00 USD
  Equity:Opening-Balances
2026-01-20 * "Lunch"
  Expenses:Food  12.00 USD
  Assets:Bank
2026-02-20 * "Dinner"
  Expenses:Food  30.00 USD
  Assets:Bank
"""
HELD = {"cash": (CASH, "-10"), "shares": (SHARES, "-20")}
REPORTS = ("balance-sheet", "trial-balance")
PERIOD = ("-t", "2026-02")


def _run(tmp_path: Path, text: str, *argv: str) -> str:
    ledger = write_ledger(tmp_path, text)
    run = bea(["-f", str(ledger), *argv], tmp_path)
    assert run.returncode == 0, run.stdout + run.stderr
    return run.stdout


def _data(tmp_path: Path, text: str, *argv: str) -> dict[str, Any]:
    return dict(json.loads(_run(tmp_path, text, "--json", *argv))["data"])


def _split(data: dict[str, Any]) -> dict[str, Any]:
    """The equity split: the tree, the adjustment and, on a sheet, the total."""
    return {key: data.get(key) for key in ("equity", "valuation_adjustment", "equity_total")}


def _opening(data: dict[str, Any]) -> dict[str, str]:
    node = next(child for child in data["equity"]["children"] if child["account"] == "Equity:Opening-Balances")
    return dict(node["balance"])


def _equity_lines(text: str) -> list[str]:
    """The text report's equity block: the tree and its derived lines."""
    lines = text.splitlines()
    start = next(index for index, line in enumerate(lines) if line.startswith("  Equity"))
    end = lines.index("", start)
    return lines[start:end]


def _equity_rows(text: str) -> list[dict[str, str]]:
    rows = csv.DictReader(io.StringIO(text))
    return [row for row in rows if row["section"] in ("equity", "valuation_adjustment", "equity_total")]


@pytest.mark.parametrize("report", REPORTS)
@pytest.mark.parametrize("holding", sorted(HELD))
def test_a_period_splits_equity_as_the_whole_ledger_does(tmp_path: Path, holding: str, report: str) -> None:
    text, adjustment = HELD[holding]
    plain = _data(tmp_path, text, "report", report)
    ranged = _data(tmp_path, text, "report", report, *PERIOD)

    assert _split(ranged) == _split(plain)
    assert {currency: Decimal(number) for currency, number in _opening(ranged).items()} == {"USD": Decimal("-1000")}
    assert Decimal(ranged["valuation_adjustment"]["USD"]) == Decimal(adjustment)


@pytest.mark.parametrize("report", REPORTS)
@pytest.mark.parametrize("holding", sorted(HELD))
def test_text_and_csv_split_equity_alike(tmp_path: Path, holding: str, report: str) -> None:
    text, _ = HELD[holding]

    plain = _run(tmp_path, text, "report", report)
    ranged = _run(tmp_path, text, "report", report, *PERIOD)
    assert _equity_lines(ranged) == _equity_lines(plain)
    assert "Opening-Balances                              -1,000.00 USD" in ranged

    plain_csv = _run(tmp_path, text, "report", report, "--format", "csv")
    ranged_csv = _run(tmp_path, text, "report", report, *PERIOD, "--format", "csv")
    assert _equity_rows(ranged_csv) == _equity_rows(plain_csv)


def test_february_opens_where_january_closed(tmp_path: Path) -> None:
    january = _data(tmp_path, CASH, "report", "balance-sheet", "-t", "2026-01")
    february = _data(tmp_path, CASH, "report", "balance-sheet", *PERIOD)

    assert february["equity"] == january["equity"]
    assert january["valuation_adjustment"] == {"USD": "0"}
    assert february["valuation_adjustment"] == {"USD": "-10.0000"}


def test_balance_reads_the_ledgers_opening_equity(tmp_path: Path) -> None:
    text = _run(tmp_path, CASH, "balance", "Opening", *PERIOD)

    assert "Opening-Balances                              -1,000.00 USD" in text
    assert "1,010" not in text


def test_earlier_earnings_in_a_held_currency_split_alike(tmp_path: Path) -> None:
    plain = _data(tmp_path, GIFT, "report", "balance-sheet")
    ranged = _data(tmp_path, GIFT, "report", "balance-sheet", *PERIOD)

    # Only current versus previous earnings move with the period.
    assert _opening(ranged) == _opening(plain)
    assert ranged["valuation_adjustment"] == plain["valuation_adjustment"]
    assert ranged["equity_total"] == plain["equity_total"]


@pytest.mark.parametrize("text", [AT_COST, PLAIN], ids=["at-cost", "usd-only"])
@pytest.mark.parametrize("report", REPORTS)
def test_costed_and_single_currency_books_are_unchanged(tmp_path: Path, text: str, report: str) -> None:
    plain = _data(tmp_path, text, "report", report)
    ranged = _data(tmp_path, text, "report", report, *PERIOD)

    assert _opening(ranged) == _opening(plain) == {"USD": "-1000.00"}
    assert ranged["valuation_adjustment"] == plain["valuation_adjustment"]


def test_units_keeps_the_clamps_trees(tmp_path: Path) -> None:
    data = _data(tmp_path, CASH, "report", "trial-balance", "-x", "units", *PERIOD)

    assert data["valuation_adjustment"] is None
    assert {currency: Decimal(number) for currency, number in _opening(data).items()} == {
        "EUR": Decimal("-100"),
        "USD": Decimal("-890"),
    }
