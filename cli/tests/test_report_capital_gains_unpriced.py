"""Capital Gains names each lot reduction it leaves out for want of a price (w1/308).

A sale to cash written without `@` books its gain through the income leg,
but the report skipped every reduction without a price, so its total no
longer tied to the booked gains, and a ledger holding only that sale read
`No sales.` A split or an own-account transfer, which takes the commodity
back in within the same transaction, is still no sale and is not listed.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any

import pytest

from tests.report_helpers import bea, write_ledger

# The note's repro: line 25 is the sale written without a price.
REPRO = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Broker
2024-01-01 open Assets:Broker2
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening

2024-01-02 * "Fund"
  Assets:Bank  10000.00 USD
  Equity:Opening

2024-01-10 * "Buy"
  Assets:Broker  10 AAPL {150.00 USD}
  Assets:Bank

2024-02-01 * "Transfer between own accounts"
  Assets:Broker   -2 AAPL {150.00 USD}
  Assets:Broker2   2 AAPL {150.00 USD}

2024-03-10 * "Sell with price"
  Assets:Broker  -3 AAPL {150.00 USD} @ 170.00 USD
  Assets:Bank  510.00 USD
  Income:Gains

2024-03-11 * "Sell without price"
  Assets:Broker  -5 AAPL {150.00 USD}
  Assets:Bank  900.00 USD
  Income:Gains
"""

SPLIT = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening
2024-01-02 * "Buy"
  Assets:Broker  5 X {100 USD}
  Assets:Bank  -500 USD
2024-02-01 * "Split 2-for-1"
  Assets:Broker  -5 X {100 USD}
  Assets:Broker  10 X {50 USD}
"""

# A NONE-booked short covered without a price (line 12), plus a second
# unpriced sale (line 16) so the note counts more than one.
SHORT = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Short X "NONE"
2024-01-01 open Assets:Long Y
2024-01-01 open Income:Gains USD
2024-03-01 * "Open short"
  Assets:Short  -2 X {60 USD, 2024-03-01}
  Assets:Bank  120 USD
2024-03-02 * "Buy"
  Assets:Long  1 Y {10 USD}
  Assets:Bank
2024-03-05 * "Cover without price"
  Assets:Short  2 X {60 USD, 2024-03-01}
  Assets:Bank  -100 USD
  Income:Gains  -20 USD
2024-03-06 * "Sell without price"
  Assets:Long  -1 Y {10 USD}
  Assets:Bank  12 USD
  Income:Gains  -2 USD
"""


def _run(tmp_path: Path, text: str, *args: str) -> tuple[Path, str]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "report", "capital-gains", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    assert proc.stderr == ""
    return ledger, proc.stdout


def _data(tmp_path: Path, text: str, *args: str) -> tuple[Path, dict[str, Any]]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "capital-gains", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return ledger, json.loads(proc.stdout)["data"]


def test_the_unpriced_sale_is_named_and_the_priced_total_stands(tmp_path: Path) -> None:
    ledger, out = _run(tmp_path, REPRO)

    assert "60.00 USD" in out
    assert f"1 lot reduction without a price is not counted: {ledger}:25 (add @ PRICE to report it as a sale)." in out
    # The note follows the totals rather than standing in for them.
    assert out.index("One year or less:") < out.index("without a price")


def test_json_lists_the_unpriced_sale_and_not_the_transfer(tmp_path: Path) -> None:
    ledger, data = _data(tmp_path, REPRO)

    assert [row["sold"] for row in data["rows"]] == ["2024-03-10"]
    assert data["totals"]["one_year_or_less"] == {"USD": "60.00"}
    assert data["unpriced_reductions"] == [
        {
            "date": "2024-03-11",
            "file": str(ledger),
            "line": 25,
            "account": "Assets:Broker",
            "commodity": "AAPL",
            "acquired": "2024-01-10",
            "quantity": {"number": "5", "currency": "AAPL"},
            "cost": {"number": "150.00", "currency": "USD"},
        }
    ]


def test_an_unpriced_sale_alone_is_not_reported_as_no_sales(tmp_path: Path) -> None:
    ledger, out = _run(tmp_path, REPRO, "--from-date", "2024-03-11")

    assert "No sales." not in out
    assert "No priced sales." in out
    assert f"{ledger}:25" in out


def test_csv_carries_the_unpriced_row_with_empty_proceeds_and_gain(tmp_path: Path) -> None:
    ledger, out = _run(tmp_path, REPRO, "--format", "csv")

    priced, unpriced = csv.DictReader(io.StringIO(out))
    assert priced["gain"] == "60.00" and priced["unpriced_at"] == ""
    assert unpriced == {
        **dict.fromkeys(priced, ""),
        "sold": "2024-03-11",
        "account": "Assets:Broker",
        "commodity": "AAPL",
        "acquired": "2024-01-10",
        "quantity": "5",
        "unpriced_at": f"{ledger}:25",
        "cost": "150.00",
        "cost_currency": "USD",
    }


def test_a_split_is_no_sale_and_is_not_listed(tmp_path: Path) -> None:
    _, data = _data(tmp_path, SPLIT)
    assert data["rows"] == [] and data["unpriced_reductions"] == []

    _, out = _run(tmp_path, SPLIT)
    assert "No sales." in out and "without a price" not in out


def test_an_unpriced_short_cover_is_listed_and_the_note_counts_each(tmp_path: Path) -> None:
    ledger, data = _data(tmp_path, SHORT)
    assert [(item["date"], item["account"], item["line"]) for item in data["unpriced_reductions"]] == [
        ("2024-03-05", "Assets:Short", 12),
        ("2024-03-06", "Assets:Long", 16),
    ]
    assert data["unpriced_reductions"][0]["quantity"] == {"number": "2", "currency": "X"}

    _, out = _run(tmp_path, SHORT)
    assert (
        f"2 lot reductions without a price are not counted: {ledger}:12, {ledger}:16 "
        "(add @ PRICE to report them as sales)."
    ) in out


@pytest.mark.parametrize(
    "args",
    [["--to-date", "2024-03-10"], ["--time", "2024-02"], ["--account", "Broker2"]],
    ids=["to-date", "time", "account"],
)
def test_the_bounds_narrow_the_list_like_the_rows(tmp_path: Path, args: list[str]) -> None:
    _, data = _data(tmp_path, REPRO, *args)
    assert data["unpriced_reductions"] == []


FIFO_ACROSS_LOTS = """\
option "operating_currency" "USD"
option "booking_method" "FIFO"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Gains USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Checking
2026-02-02 * "Buy"
  Assets:Brokerage  10 VTI {120 USD}
  Assets:Checking
2026-03-02 * "Sell across both lots without a price"
  Assets:Brokerage  -15 VTI {}
  Assets:Checking  2250 USD
  Income:Gains
"""


def test_a_sale_booked_across_lots_lists_each_lot_and_names_its_line_once(tmp_path: Path) -> None:
    ledger, data = _data(tmp_path, FIFO_ACROSS_LOTS)
    assert [
        (item["line"], item["quantity"]["number"], item["cost"]["number"]) for item in data["unpriced_reductions"]
    ] == [
        (12, "10", "100"),
        (12, "5", "120"),
    ]

    _, out = _run(tmp_path, FIFO_ACROSS_LOTS)
    assert (
        f"2 lot reductions without a price are not counted: {ledger}:12 (add @ PRICE to report them as sales)." in out
    )
