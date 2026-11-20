"""`bea query` text tables show the ledger's precision, not division noise (w1/325).

The text table sized each currency to the most fractional digits of any value
in the result. Beancount divides a `{{100 USD}}` total cost over 3 units into
a 28-digit per-unit cost, and a `3 EUR @@ 10.00 USD` total into a 28-digit
price, so once one of those was in the rows every USD amount printed 26 or 27
decimals. A product's trailing zeros counted too: `12.50 EUR @ 1.10 USD`
infers `-13.7500 USD`, and every USD amount printed four. A currency now shows
the finer of the precision the ledger writes it in and the meaningful digits
of its values. JSON and CSV keep every digit.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import pytest

from bea_engine.query import build_shell
from tests.report_helpers import bea, write_ledger

TOTAL_COST = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Broker
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Bank:Checking  10000.00 USD
  Equity:Opening
2026-01-03 * "Lunch"
  Expenses:Food  12.30 USD
  Assets:Bank:Checking
2026-01-05 * "Buy"
  Assets:Broker  3 HOOL {{100 USD}}
  Assets:Bank:Checking  -100.00 USD
2026-01-10 price HOOL 40.00 USD
"""

TOTAL_PRICE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Travel
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-03 * "Taxi in Paris"
  Expenses:Travel  3 EUR @@ 10.00 USD
  Assets:Bank
"""

PRODUCT = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Travel
2026-01-01 open Liabilities:Card USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-03 * "Coffee in Paris"
  Expenses:Travel  12.50 EUR @ 1.10 USD
  Liabilities:Card
"""

BY_ACCOUNT = "SELECT account, sum(position), sum(weight) GROUP BY account ORDER BY account"
COST_BY_ACCOUNT = "SELECT account, sum(cost(position)) AS c GROUP BY account ORDER BY account"


def _rows(tmp_path: Path, text: str, *args: str) -> dict[str, list[str]]:
    """The text table's rows, keyed by first cell, each split into its whitespace-separated words."""
    ledger = write_ledger(tmp_path, text)
    result = bea(["--file", str(ledger), "query", *args], tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stderr == ""
    lines = result.stdout.splitlines()
    assert set(lines[1]) <= {"-", " "}, result.stdout
    return {line.split()[0]: line.split()[1:] for line in lines[2:]}


def test_a_total_cost_lot_leaves_every_usd_amount_at_cents(tmp_path: Path) -> None:
    rows = _rows(tmp_path, TOTAL_COST, BY_ACCOUNT)

    assert rows == {
        "Assets:Bank:Checking": ["9887.70", "USD", "9887.70", "USD"],
        "Assets:Broker": ["3", "HOOL", "{", "33.33", "USD}", "100.00", "USD"],
        "Equity:Opening": ["-10000.00", "USD", "-10000.00", "USD"],
        "Expenses:Food": ["12.30", "USD", "12.30", "USD"],
    }


@pytest.mark.parametrize("numberify", [False, True], ids=["amounts", "numberified"])
def test_the_cost_of_a_lot_bought_for_100_usd_reads_100_usd(tmp_path: Path, numberify: bool) -> None:
    rows = _rows(tmp_path, TOTAL_COST, *(["-m"] if numberify else []), COST_BY_ACCOUNT)

    unit = [] if numberify else ["USD"]
    assert rows == {
        "Assets:Bank:Checking": ["9887.70", *unit],
        "Assets:Broker": ["100.00", *unit],
        "Equity:Opening": ["-10000.00", *unit],
        "Expenses:Food": ["12.30", *unit],
    }


def test_a_total_price_reads_at_cents(tmp_path: Path) -> None:
    postings = _rows(tmp_path, TOTAL_PRICE, "SELECT account, position, price, weight WHERE date = 2026-01-03")
    totals = _rows(tmp_path, TOTAL_PRICE, "SELECT account, sum(weight) GROUP BY account ORDER BY account")

    assert postings == {
        "Expenses:Travel": ["3", "EUR", "3.33", "USD", "10.00", "USD"],
        "Assets:Bank": ["-10.00", "USD", "-10.00", "USD"],
    }
    assert totals == {
        "Assets:Bank": ["990.00", "USD"],
        "Equity:Opening": ["-1000.00", "USD"],
        "Expenses:Travel": ["10.00", "USD"],
    }


def test_a_products_trailing_zeros_add_no_decimals(tmp_path: Path) -> None:
    rows = _rows(tmp_path, PRODUCT, "SELECT account, sum(position) GROUP BY account ORDER BY account")

    assert rows == {
        "Assets:Bank": ["1000.00", "USD"],
        "Equity:Opening": ["-1000.00", "USD"],
        "Expenses:Travel": ["12.50", "EUR"],
        "Liabilities:Card": ["-13.75", "USD"],
    }


def test_real_digits_still_show(tmp_path: Path) -> None:
    """A computed value's own digits and a written sub-cent amount keep their decimals."""
    text = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Crypto BTC
2026-01-01 open Expenses:Fees USD
2026-01-01 open Equity:Opening
2026-01-02 * "open"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-02 * "coins"
  Assets:Crypto  0.5 BTC
  Equity:Opening
2026-01-03 * "Fee"
  Expenses:Fees  0.0042 USD
  Assets:Bank
2026-01-10 price BTC 61234.56789012 USD
"""
    converted = _rows(tmp_path, text, "SELECT account, convert(sum(position), 'USD') AS v GROUP BY account")
    written = _rows(tmp_path, text, "SELECT account, sum(position) WHERE account ~ '^(Assets:Bank|Expenses)'")

    assert converted["Assets:Crypto"] == ["30617.28394506", "USD"]
    assert written == {"Assets:Bank": ["999.9958", "USD"], "Expenses:Fees": ["0.0042", "USD"]}


def test_a_whole_dollar_ledger_still_shows_its_half_dollar(tmp_path: Path) -> None:
    text = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Bank  1000 USD
  Equity:Opening
2026-01-03 * "Lunch"
  Expenses:Food  12.5 USD
  Assets:Bank
"""
    rows = _rows(tmp_path, text, "SELECT account, sum(position) GROUP BY account ORDER BY account")

    assert rows == {
        "Assets:Bank": ["987.5", "USD"],
        "Equity:Opening": ["-1000.0", "USD"],
        "Expenses:Food": ["12.5", "USD"],
    }


@pytest.mark.parametrize("numberify", [False, True], ids=["amounts", "numberified"])
def test_json_and_csv_keep_every_digit(tmp_path: Path, numberify: bool) -> None:
    ledger = write_ledger(tmp_path, TOTAL_COST)
    flags = ["-m"] if numberify else []
    shown = bea(["--json", "--file", str(ledger), "query", *flags, COST_BY_ACCOUNT], tmp_path)
    csv = bea(["--file", str(ledger), "query", "--format", "csv", *flags, COST_BY_ACCOUNT], tmp_path)

    assert shown.returncode == csv.returncode == 0, shown.stderr + csv.stderr
    rows = dict(json.loads(shown.stdout)["data"]["rows"])
    broker = rows["Assets:Broker"] if numberify else rows["Assets:Broker"][0]["units"]["number"]
    assert broker == "99.99999999999999999999999999"
    assert "Assets:Broker,99.99999999999999999999999999" in csv.stdout


def test_the_shell_reads_the_precision_again_after_a_reload(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("beanquery.shell.readline", None)
    monkeypatch.setattr("beanquery.shell.INIT_FILENAME", str(tmp_path / "no-init"))
    ledger = write_ledger(tmp_path, TOTAL_COST)
    stream = io.StringIO()
    shell = build_shell(ledger, stream)

    shell.onecmd("SELECT sum(cost(position)) WHERE account = 'Assets:Broker'")
    assert "100.00 USD" in stream.getvalue()

    ledger.write_text(TOTAL_COST + "2026-01-11 balance Assets:Bank:Checking 9887.7000 USD\n")
    shell.onecmd(".reload")
    stream.seek(0)
    stream.truncate()
    shell.onecmd("SELECT sum(cost(position)) WHERE account = 'Assets:Broker'")
    assert "100.0000 USD" in stream.getvalue()
