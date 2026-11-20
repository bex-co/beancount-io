"""`bea query` text tables show the ledger's precision, not division noise (w1/325).

The text table sized each currency to the most fractional digits of any value
in the result. Beancount divides a `{{100 USD}}` total cost over 3 units into
a 28-digit per-unit cost, and a `3 EUR @@ 10.00 USD` total into a 28-digit
price, so once one of those was in the rows every USD amount printed 26 or 27
decimals. A product's trailing zeros counted too: `12.50 EUR @ 1.10 USD`
infers `-13.7500 USD`, and every USD amount printed four. A currency now shows
the finer of the precision the ledger writes it in and the meaningful digits
of its values. JSON and CSV keep every digit.

Each column, and within a position its units and its per-unit cost apart, is
sized by its own values (w1/330): one `{191.559998 USD}` lot or a `price`
column's `1.083721 USD` rate printed every USD amount in the table with six
decimals.
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


def _cells(tmp_path: Path, text: str, *args: str) -> list[list[str]]:
    """The text table's data rows, each split into its whitespace-separated words."""
    ledger = write_ledger(tmp_path, text)
    result = bea(["--file", str(ledger), "query", *args], tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stderr == ""
    lines = result.stdout.splitlines()
    assert set(lines[1]) <= {"-", " "}, result.stdout
    return [line.split() for line in lines[2:]]


# The purchase's quotient weighs 99.99999999999999999999999999 USD; a coffee
# the same day rides on the residue its cash leg leaves (w1/326).
SAME_DAY = (
    TOTAL_COST
    + """\
2026-01-05 * "Coffee"
  Expenses:Food  4.50 USD
  Assets:Bank:Checking
"""
)


def test_a_sum_that_cancels_a_quotient_prints_zero(tmp_path: Path) -> None:
    """`sum(weight)` over a `{{100 USD}}` purchase is -1E-26 USD: zero, unsigned, and no noise beside it (w1/326)."""
    assert _cells(tmp_path, TOTAL_COST, "SELECT sum(weight)") == [["0.00", "USD"]]
    assert _cells(tmp_path, TOTAL_COST, "SELECT sum(weight), sum(position)") == [
        ["0.00", "USD", "3", "HOOL", "{", "33.33", "USD}", "-100.00", "USD"]
    ]
    by_date = _cells(tmp_path, TOTAL_COST, "SELECT date, sum(weight) GROUP BY date ORDER BY date")
    assert by_date[-1] == ["2026-01-05", "0.00", "USD"]


def test_a_residue_beside_a_real_amount_adds_no_decimals(tmp_path: Path) -> None:
    rows = _cells(tmp_path, SAME_DAY, "SELECT date, sum(weight) WHERE account ~ '^Assets' GROUP BY date ORDER BY date")

    assert rows == [
        ["2026-01-02", "10000.00", "USD"],
        ["2026-01-03", "-12.30", "USD"],
        ["2026-01-05", "-4.50", "USD"],
    ]


def test_a_sums_real_digits_and_a_lone_sub_cent_price_keep_their_decimals(tmp_path: Path) -> None:
    """Only a sum's residue is dropped: a satoshi's dollar value and sub-cent prices are real.

    A price is a lone amount, never a sum, so even ten zeros after the point
    leave its digits alone.
    """
    text = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Penny
2026-01-01 open Assets:Meme
2026-01-01 open Assets:Crypto BTC
2026-01-01 open Equity:Opening
2026-01-02 * "open"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-03 * "Pennies"
  Assets:Penny  1000 PENNY @ 0.0042 USD
  Assets:Bank  -4.20 USD
2026-01-03 * "Meme coins"
  Assets:Meme  1000 MEME @ 0.000000000012 USD
  Assets:Bank
2026-01-04 * "A satoshi"
  Assets:Crypto  0.00000001 BTC
  Equity:Opening
2026-01-10 price BTC 61234.56789012 USD
"""
    converted = _cells(tmp_path, text, "SELECT convert(sum(position), 'USD') WHERE account ~ 'Crypto'")
    prices = _cells(tmp_path, text, "SELECT account, price WHERE account ~ 'Penny|Meme' ORDER BY account")

    assert converted == [["0.0006123456789012", "USD"]]
    assert prices == [["Assets:Meme", "0.000000000012", "USD"], ["Assets:Penny", "0.004200000000", "USD"]]


@pytest.mark.parametrize(
    ("number", "digits"),
    [
        ("-0.00000000000000000000000001", 0),
        ("-4.50000000000000000000000001", 1),
        ("4.49999999999999999999999999", 1),
        ("9.99999999999999999999999999", 0),
        ("0.0006123456789012", 16),
        ("30617.28394506", 8),
        ("0.00000000012", 11),
    ],
)
def test_digits_after_a_run_of_ten_zeros_or_nines_are_residue(number: str, digits: int) -> None:
    from decimal import Decimal

    from bea_engine.query import _before_residue

    value = Decimal(number)
    assert _before_residue(value, -int(value.as_tuple().exponent)) == digits


def test_json_and_csv_keep_the_residue(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, TOTAL_COST)
    shown = bea(["--json", "--file", str(ledger), "query", "SELECT sum(weight)"], tmp_path)
    csv = bea(["--file", str(ledger), "query", "--format", "csv", "SELECT sum(weight)"], tmp_path)

    assert shown.returncode == csv.returncode == 0, shown.stderr + csv.stderr
    assert json.loads(shown.stdout)["data"]["rows"] == [
        [[{"units": {"number": "-0.00000000000000000000000001", "currency": "USD"}, "cost": None}]]
    ]
    assert csv.stdout.splitlines() == ["sum(weight)", "-0.00000000000000000000000001 USD"]


# One lot's per-unit cost and one posting's rate carry six decimals; every
# amount the ledger writes has two (w1/330).
PER_UNIT = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Euro EUR
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Bank:Checking  10000.00 USD
  Equity:Opening
2026-01-03 * "Lunch"
  Expenses:Food  12.30 USD
  Assets:Bank:Checking
2026-01-05 * "Buy AAPL"
  Assets:Broker  10 AAPL {191.559998 USD}
  Assets:Bank:Checking  -1915.60 USD
2026-01-06 * "Buy EUR"
  Assets:Euro  100.00 EUR @ 1.083721 USD
  Assets:Bank:Checking  -108.37 USD
"""

JOURNAL = "SELECT date, account, position, price WHERE account ~ 'Checking|Euro|Food'"


def test_a_lots_per_unit_cost_keeps_its_digits_without_lending_them_to_amounts(tmp_path: Path) -> None:
    rows = _rows(tmp_path, PER_UNIT, "SELECT account, sum(position) GROUP BY account ORDER BY account")

    assert rows == {
        "Assets:Bank:Checking": ["7963.73", "USD"],
        "Assets:Broker": ["10", "AAPL", "{", "191.559998", "USD}"],
        "Assets:Euro": ["100.00", "EUR"],
        "Equity:Opening": ["-10000.00", "USD"],
        "Expenses:Food": ["12.30", "USD"],
    }


def test_a_numberified_column_ignores_the_cost_numberify_drops(tmp_path: Path) -> None:
    rows = _rows(tmp_path, PER_UNIT, "-m", "SELECT account, sum(position) GROUP BY account ORDER BY account")

    assert rows == {
        "Assets:Bank:Checking": ["7963.73"],
        "Assets:Broker": ["10"],
        "Assets:Euro": ["100.00"],
        "Equity:Opening": ["-10000.00"],
        "Expenses:Food": ["12.30"],
    }


@pytest.mark.parametrize("numberify", [False, True], ids=["amounts", "numberified"])
def test_a_price_columns_rate_keeps_its_digits_without_lending_them_to_amounts(tmp_path: Path, numberify: bool) -> None:
    rows = _cells(tmp_path, PER_UNIT, *(["-m"] if numberify else []), JOURNAL)

    usd = [] if numberify else ["USD"]
    eur = [] if numberify else ["EUR"]
    assert rows == [
        ["2026-01-02", "Assets:Bank:Checking", "10000.00", *usd],
        ["2026-01-03", "Expenses:Food", "12.30", *usd],
        ["2026-01-03", "Assets:Bank:Checking", "-12.30", *usd],
        ["2026-01-05", "Assets:Bank:Checking", "-1915.60", *usd],
        ["2026-01-06", "Assets:Euro", "100.00", *eur, "1.083721", *usd],
        ["2026-01-06", "Assets:Bank:Checking", "-108.37", *usd],
    ]


def test_json_keeps_the_lots_cost_and_the_rate_exact(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, PER_UNIT)
    query = "SELECT account, position, price WHERE date >= 2026-01-05"
    shown = bea(["--json", "--file", str(ledger), "query", query], tmp_path)

    assert shown.returncode == 0, shown.stderr
    rows = json.loads(shown.stdout)["data"]["rows"]
    assert rows[0][1] == {
        "units": {"number": "10", "currency": "AAPL"},
        "cost": {"number": "191.559998", "currency": "USD", "date": "2026-01-05", "label": None},
    }
    assert rows[1][1]["units"] == {"number": "-1915.60", "currency": "USD"}
    assert rows[2][2] == {"number": "1.083721", "currency": "USD"}


# A `{{100.00 USD}}` lot of 3, whose cash leg Beancount interpolates from the
# 33.33333333333333333333333333 USD unit cost, then a lot at its own cost
# (w1/334). Bare-number columns printed every digit of that quotient.
BARE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker
2026-01-01 open Equity:Opening USD
2026-01-01 * "Start"
  Assets:Cash  1000.00 USD
  Equity:Opening
2026-01-02 * "Buy"
  Assets:Broker  3 HOOL {{100.00 USD}}
  Assets:Cash
2026-01-03 * "Buy2"
  Assets:Broker  2 HOOL {40.00 USD}
  Assets:Cash
2026-01-04 price HOOL 41.00 USD
"""

# The purchase spends all of the cash, but for the quotient's residue.
EMPTIED = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker
2026-01-01 open Equity:Opening USD
2026-01-01 * "Start"
  Assets:Cash  100.00 USD
  Equity:Opening
2026-01-02 * "Buy"
  Assets:Broker  3 HOOL {{100.00 USD}}
  Assets:Cash
"""

BARE_JOURNAL = "SELECT date, account, number, cost_number, position"

# The BQL cookbook's "Open lots at own cost" and "Per-lot market value"
# recipes (docs/skills/bql-cookbook.md), verbatim.
OPEN_LOTS = (
    "SELECT account, currency AS commodity, cost_number, cost_date, sum(number) AS units, "
    "sum(number * cost_number) AS cost, cost_currency WHERE cost_number IS NOT NULL "
    "GROUP BY account, commodity, cost_number, cost_date, cost_currency HAVING sum(number) != 0 "
    "ORDER BY account, commodity, cost_date"
)
LOT_MARKET = (
    "SELECT account, currency AS commodity, cost_date, cost_currency, sum(number) AS units, "
    "sum(number * cost_number) AS cost, sum(number(value(position))) AS market, "
    "sum(number(value(position))) - sum(number * cost_number) AS unrealized "
    "WHERE cost_number IS NOT NULL AND currency(value(position)) = cost_currency "
    "GROUP BY account, commodity, cost_date, cost_currency HAVING sum(number) != 0 "
    "ORDER BY account, commodity, cost_date"
)


def test_a_number_column_reads_a_quotient_at_its_other_values_digits(tmp_path: Path) -> None:
    """The cash leg and the unit cost read as their position cells do; `3` and `1000.00` keep their own digits."""
    ledger = write_ledger(tmp_path, BARE)
    result = bea(["--file", str(ledger), "query", BARE_JOURNAL], tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    lines = result.stdout.splitlines()
    assert [line.split() for line in lines[2:]] == [
        ["2026-01-01", "Assets:Cash", "1000.00", "1000.00", "USD"],
        ["2026-01-01", "Equity:Opening", "-1000.00", "-1000.00", "USD"],
        ["2026-01-02", "Assets:Broker", "3", "33.33", "3", "HOOL", "{", "33.33", "USD}"],
        ["2026-01-02", "Assets:Cash", "-100.00", "-100.00", "USD"],
        ["2026-01-03", "Assets:Broker", "2", "40.00", "2", "HOOL", "{", "40.00", "USD}"],
        ["2026-01-03", "Assets:Cash", "-80.00", "-80.00", "USD"],
    ]
    # Nor does the quotient's width set the column's: `-1000.00` does.
    assert [len(rule) for rule in lines[1].split()][2:4] == [len("-1000.00"), len("cost_number")]


@pytest.mark.parametrize("numberify", [False, True], ids=["amounts", "numberified"])
def test_a_summed_number_reads_at_cents_beside_its_position(tmp_path: Path, numberify: bool) -> None:
    flags = ["-m"] if numberify else []
    query = "SELECT account, sum(position) AS p, sum(number) AS n GROUP BY account ORDER BY account"
    rows = _rows(tmp_path, BARE, *flags, query)

    if numberify:
        assert rows == {
            "Assets:Broker": ["5", "5"],
            "Assets:Cash": ["820.00", "820.00"],
            "Equity:Opening": ["-1000.00", "-1000.00"],
        }
    else:
        assert rows == {
            "Assets:Broker": ["3", "HOOL", "{", "33.33", "USD}", "2", "HOOL", "{", "40.00", "USD}", "5"],
            "Assets:Cash": ["820.00", "USD", "820.00"],
            "Equity:Opening": ["-1000.00", "USD", "-1000.00"],
        }


def test_the_cookbooks_lot_recipes_read_a_100_usd_lot_as_100_usd(tmp_path: Path) -> None:
    assert _cells(tmp_path, BARE, OPEN_LOTS) == [
        ["Assets:Broker", "HOOL", "33.33", "2026-01-02", "3", "100.00", "USD"],
        ["Assets:Broker", "HOOL", "40.00", "2026-01-03", "2", "80.00", "USD"],
    ]
    assert _cells(tmp_path, BARE, LOT_MARKET) == [
        ["Assets:Broker", "HOOL", "2026-01-02", "USD", "3", "100.00", "123.00", "23.00"],
        ["Assets:Broker", "HOOL", "2026-01-03", "USD", "2", "80.00", "82.00", "2.00"],
    ]


def test_a_pivoted_sum_reads_at_cents(tmp_path: Path) -> None:
    query = (
        "SELECT year, account, sum(number) AS n GROUP BY year, account ORDER BY year, account PIVOT BY account, year"
    )

    assert _rows(tmp_path, BARE, query) == {
        "Assets:Broker": ["5"],
        "Assets:Cash": ["820.00"],
        "Equity:Opening": ["-1000.00"],
    }


def test_an_emptied_account_holds_zero_at_the_ledgers_precision(tmp_path: Path) -> None:
    """A sum that is all residue has no other digits to read at, so it takes the ledger's, without a sign."""
    cash = "SELECT sum(number) AS cash, sum(position) AS p WHERE account = 'Assets:Cash'"

    assert _cells(tmp_path, EMPTIED, cash) == [["0.00", "0.00", "USD"]]
    assert _cells(tmp_path, EMPTIED, "SELECT sum(number) WHERE account = 'Assets:Cash'") == [["0.00"]]
    # An exact zero carrying the quotient's 26 places.
    assert _cells(tmp_path, BARE, "SELECT sum(number(weight)) WHERE narration = 'Buy'") == [["0.00"]]


def test_clean_numbers_keep_their_own_digits(tmp_path: Path) -> None:
    """Counts, units and a lone sub-cent rate are not noise; a summed `convert()` keeps its eight decimals."""
    text = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Meme
2026-01-01 open Assets:Crypto BTC
2026-01-01 open Equity:Opening
2026-01-02 * "open"
  Assets:Bank  1000.00 USD
  Equity:Opening
2026-01-03 * "Meme coins"
  Assets:Meme  1000 MEME @ 0.000000000012 USD
  Assets:Bank
2026-01-04 * "A coin"
  Assets:Crypto  1 BTC
  Equity:Opening
2026-01-10 price BTC 61234.56789012 USD
"""
    assert _cells(tmp_path, BARE, "SELECT count(*) AS c, sum(number) AS n WHERE account = 'Assets:Broker'") == [
        ["2", "5"]
    ]
    assert _cells(tmp_path, text, "SELECT number(price) AS rate WHERE account = 'Assets:Meme'") == [["0.000000000012"]]
    converted = "SELECT sum(number(convert(position, 'USD'))) AS v WHERE account = 'Assets:Crypto'"
    assert _cells(tmp_path, text, converted) == [["61234.56789012"]]


def test_stdin_and_an_output_file_read_the_same_digits(tmp_path: Path) -> None:
    import subprocess
    import sys

    from tests.report_helpers import run_env

    ledger = write_ledger(tmp_path, BARE)
    query = "SELECT account, sum(number) AS n GROUP BY account ORDER BY account"
    piped = subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "query"],
        env=run_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=300,
        input=query + "\n",
        check=False,
    )
    written = bea(["--file", str(ledger), "query", "-o", "out.txt", query], tmp_path)

    assert piped.returncode == written.returncode == 0, piped.stderr + written.stderr
    for table in (piped.stdout, (tmp_path / "out.txt").read_text()):
        assert [line.split() for line in table.splitlines()[2:]] == [
            ["Assets:Broker", "5"],
            ["Assets:Cash", "820.00"],
            ["Equity:Opening", "-1000.00"],
        ]


def test_json_and_csv_keep_a_numbers_every_digit(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, BARE)
    query = "SELECT number WHERE narration = 'Buy' AND account = 'Assets:Cash'"
    shown = bea(["--json", "--file", str(ledger), "query", query], tmp_path)
    csv = bea(["--file", str(ledger), "query", "--format", "csv", query], tmp_path)

    assert shown.returncode == csv.returncode == 0, shown.stderr + csv.stderr
    assert json.loads(shown.stdout)["data"]["rows"] == [["-99.99999999999999999999999999"]]
    assert csv.stdout.splitlines() == ["number", "-99.99999999999999999999999999"]


def test_the_shell_reads_a_summed_number_at_cents(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("beanquery.shell.readline", None)
    monkeypatch.setattr("beanquery.shell.INIT_FILENAME", str(tmp_path / "no-init"))
    stream = io.StringIO()
    shell = build_shell(write_ledger(tmp_path, EMPTIED), stream)

    shell.onecmd("SELECT sum(number) AS cash WHERE account = 'Assets:Cash'")
    assert stream.getvalue().split()[-1] == "0.00"


@pytest.mark.parametrize(
    ("number", "summed", "digits"),
    [
        ("-99.99999999999999999999999999", False, 0),
        ("33.33333333333333333333333333", True, 0),
        ("820.0000000000000000000000000", True, 0),
        ("23.00000000000000000000000001", True, 0),
        ("-4.50000000000000000000000001", True, 1),
        ("1000.00", False, 2),
        ("1000.00", True, 2),
        ("3", True, 0),
        ("0.000000000012", False, 12),
        ("0.000000000012", True, 0),
    ],
)
def test_a_numbers_meaningful_digits(number: str, summed: bool, digits: int) -> None:
    from decimal import Decimal

    from bea_engine.query import _meaningful_digits

    assert _meaningful_digits(Decimal(number), summed) == digits
