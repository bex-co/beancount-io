"""Human tables honor the ledger's display precision and bound conversions (w3/304, w3/365)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

from cli.commands.report import _quantize

ROOT = Path(__file__).resolve().parents[1]
WHOLE = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 * "whole"
  Expenses:Food  10 USD
  Assets:Checking
"""
CENTS = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 * "cents"
  Expenses:Food  10.50 USD
  Assets:Checking
"""
CONVERT = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-02 price HOOL 3 USD
2024-01-02 * "whole"
  Expenses:Food  10 USD
  Assets:Checking
"""


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "whole.bean").write_text(WHOLE)
    (tmp_path / "cents.bean").write_text(CENTS)
    (tmp_path / "conv.bean").write_text(CONVERT)
    return tmp_path


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
        timeout=30,
    )


def test_zero_fraction_ledger_renders_whole_numbers(books: Path) -> None:
    result = _bea(books, "--file", str(books / "whole.bean"), "balance")

    assert result.returncode == 0, result.stderr
    assert "10 USD" in result.stdout
    assert "10.00 USD" not in result.stdout


def test_cents_ledger_still_renders_cents(books: Path) -> None:
    result = _bea(books, "--file", str(books / "cents.bean"), "balance")

    assert result.returncode == 0, result.stderr
    assert "10.50 USD" in result.stdout


def test_conversion_to_an_unknown_currency_is_bounded(books: Path) -> None:
    result = _bea(books, "--file", str(books / "conv.bean"), "report", "balance-sheet", "--conversion", "HOOL")

    assert result.returncode == 0, result.stderr
    assert "3.33 HOOL" in result.stdout
    assert "3.3333" not in result.stdout


def test_conversion_json_stays_exact(books: Path) -> None:
    result = _bea(
        books,
        "--json",
        "--file",
        str(books / "conv.bean"),
        "report",
        "balance-sheet",
        "--conversion",
        "HOOL",
    )

    assert result.returncode == 0, result.stderr
    net_worth = json.loads(result.stdout)["data"]["net_worth"]
    assert net_worth == {"HOOL": "-3.333333333333333333333333333"}


def test_quantize_without_precision_passes_values_through() -> None:
    assert _quantize(Decimal("4.9050"), "USD", None) == Decimal("4.9050")


@pytest.mark.parametrize("spelling", ["NaN", "Infinity", "-Infinity"])
def test_quantize_passes_non_finite_values_through(spelling: str) -> None:
    """Rounding a non-finite value would raise, so it reaches the table as is."""
    number = Decimal(spelling)

    assert _quantize(number, "USD", {"USD": 2}) is number


QUOTED = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening
2024-01-01 open Expenses:Food USD
2024-01-02 * "Seed"
  Assets:Bank  1000.00 USD
  Equity:Opening  -1000.00 USD
2024-01-03 * "Lunch"
  Expenses:Food  12.50 USD
  Assets:Bank  -12.50 USD
2024-01-04 * "Dinner"
  Expenses:Food  20.25 USD
  Assets:Bank  -20.25 USD
2024-01-05 * "Buy"
  Assets:Broker  2 AAPL {187.25 USD}
  Assets:Bank  -374.50 USD
2024-01-31 price AAPL 191.559998 USD
"""


def test_a_long_price_quote_does_not_widen_amounts(tmp_path: Path) -> None:
    """A quote is a rate, not money anyone holds: cents stay cents (w1/052)."""
    ledger = tmp_path / "quoted.bean"
    ledger.write_text(QUOTED)

    statement = _bea(tmp_path, "--file", str(ledger), "report", "income-statement")
    assert statement.returncode == 0, statement.stderr
    assert "32.75 USD" in statement.stdout
    assert "32.750000" not in statement.stdout

    balance = _bea(tmp_path, "--file", str(ledger), "balance", "Bank")
    assert balance.returncode == 0, balance.stderr
    assert "592.75 USD" in balance.stdout
    assert "592.750000" not in balance.stdout

    exact = _bea(tmp_path, "--json", "--file", str(ledger), "report", "balance-sheet")
    assert exact.returncode == 0, exact.stderr
    assert json.loads(exact.stdout)["data"]["net_worth"] == {"USD": "975.869996"}


def test_display_precision_option_still_wins(tmp_path: Path) -> None:
    ledger = tmp_path / "quoted.bean"
    ledger.write_text('option "display_precision" "USD:0.001"\n' + QUOTED)

    result = _bea(tmp_path, "--file", str(ledger), "balance", "Bank")

    assert result.returncode == 0, result.stderr
    assert "592.750 USD" in result.stdout


def test_whole_dollars_with_one_cents_posting_keep_cents(tmp_path: Path) -> None:
    ledger = tmp_path / "mixed.bean"
    ledger.write_text(WHOLE + '2024-01-03 * "cents"\n  Expenses:Food  0.25 USD\n  Assets:Checking\n')

    result = _bea(tmp_path, "--file", str(ledger), "balance", "Food")

    assert result.returncode == 0, result.stderr
    assert "10.25 USD" in result.stdout
