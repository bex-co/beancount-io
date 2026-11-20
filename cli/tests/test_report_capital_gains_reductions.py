"""Capital Gains reports what each posting actually closed, long or short (w5/1035).

Only negative postings counted as sales: a short cover (or a payment settling
a costed EUR payable) was never reported, and the negative posting that opened
the short was reported as a two-unit sale at zero gain. A `"NONE"`-booked sale
that names a lot's cost but not its date closes the account's net holding,
though no held lot has its exact key (w1/323).
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

SHORT = """option "operating_currency" "USD"
2026-01-01 open Assets:Stock HOOL "NONE"
2026-01-01 open Assets:Cash USD
2026-01-01 open Income:Gains USD
2026-01-02 * "Open short"
  Assets:Stock -2 HOOL {{100 USD, 2026-01-02}}
  Assets:Cash 200 USD
{cover}"""
COVER = """2026-01-20 * "Cover one"
  Assets:Stock 1 HOOL {{100 USD, 2026-01-02}} @ {price} USD
  Assets:Cash -{price} USD
  Income:Gains {booked} USD
"""
PAYABLE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD,EUR
2024-01-01 open Liabilities:Payable USD,EUR
2024-01-01 open Expenses:Services USD,EUR
2024-01-01 open Expenses:FX USD,EUR
2024-01-01 open Equity:Opening USD,EUR
2024-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
2024-01-02 * "Invoice"
  Liabilities:Payable -100 EUR {1.20 USD}
  Expenses:Services 120 USD
2024-01-03 * "First payment"
  Liabilities:Payable 60 EUR {1.20 USD, 2024-01-02} @ 1.25 USD
  Assets:Cash -75 USD
  Expenses:FX 3 USD
2024-01-04 * "Final payment"
  Liabilities:Payable 40 EUR {1.20 USD, 2024-01-02} @@ 52 USD
  Assets:Cash -52 USD
  Expenses:FX 4 USD
"""


def _gains(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "capital-gains", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize(("price", "gain"), [("80", "20"), ("120", "-20")], ids=["gain", "loss"])
@pytest.mark.parametrize(
    "args",
    [[], ["--from-date", "2026-01-20", "--to-date", "2026-01-20"], ["--time", "2026-01"], ["--account", "Stock"]],
    ids=["whole", "bounded", "time", "account"],
)
def test_a_short_cover_is_the_one_realized_row(tmp_path: Path, price: str, gain: str, args: list[str]) -> None:
    booked = str(-Decimal(gain))
    data = _gains(tmp_path, SHORT.format(cover=COVER.format(price=price, booked=booked)), *args)

    (row,) = data["rows"]  # type: ignore[misc]
    assert row["sold"] == "2026-01-20" and row["quantity"] == {"number": "1", "currency": "HOOL"}
    assert row["proceeds"] == {"number": "100", "currency": "USD"}
    assert row["basis"] == {"number": price, "currency": "USD"}
    assert row["gain"] == {"number": gain, "currency": "USD"}
    assert data["totals"]["one_year_or_less"] == {"USD": gain}  # type: ignore[index]


def test_opening_a_short_realizes_nothing(tmp_path: Path) -> None:
    assert _gains(tmp_path, SHORT.format(cover=""))["rows"] == []


def test_settling_a_costed_payable_reports_its_exchange_loss(tmp_path: Path) -> None:
    data = _gains(tmp_path, PAYABLE)

    gains = [row["gain"]["number"] for row in data["rows"]]  # type: ignore[attr-defined]
    assert gains == ["-3.00", "-4.00"]
    assert data["totals"]["one_year_or_less"] == {"USD": "-7.00"}  # type: ignore[index]


WIDE_SHORT = """option "operating_currency" "USD"
2024-01-01 open Assets:Token TOKEN "NONE"
2024-01-01 open Equity:Opening USD
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Gains USD
2024-01-02 * "Open"
  Assets:Token {opening} TOKEN {{0 USD, 2024-01-02}}
  Equity:Opening 0 USD
2024-01-03 * "Close"
  Assets:Token {closing} TOKEN {{0 USD, 2024-01-02}} @ 0 USD
  Assets:Cash 0 USD
  Income:Gains 0 USD
"""


@pytest.mark.parametrize(
    ("opening", "closing", "expected"),
    [
        # A partial cover leaves 2e-18 short; the 29-digit magnitude must not round up.
        ("-12345678901.12345678901234568", "12345678901.123456789012345678", "12345678901.123456789012345678"),
        # A sale crossing into a tiny short closes only the original long holding.
        ("12345678901.123456789012345678", "-12345678901.12345678901234568", "12345678901.123456789012345678"),
    ],
)
def test_clip_keeps_exact_native_magnitudes(tmp_path: Path, opening: str, closing: str, expected: str) -> None:
    data = _gains(tmp_path, WIDE_SHORT.format(opening=opening, closing=closing))
    (row,) = data["rows"]  # type: ignore[index]
    assert Decimal(row["quantity"]["number"]) == Decimal(expected)


# w1/323. `"NONE"` booking matches no lot: a sale naming the lot's cost but
# not its date is dated its own day, so its exact key held nothing and the
# report read the 500 USD it booked as a short opening — `No sales.`.
NONE_SALE = """option "operating_currency" "USD"
2025-01-01 open Assets:Cash USD
2025-01-01 open Assets:Broker "{booking}"
2025-01-01 open Income:Gains USD
2025-01-01 open Equity:Opening USD
2025-01-01 * "Fund"
  Assets:Cash 10000 USD
  Equity:Opening
2025-01-10 * "Buy"
  Assets:Broker 10 ABC {{100 USD}}
  Assets:Cash -1000 USD
2025-03-10 * "Buy"
  Assets:Broker 10 ABC {{150 USD}}
  Assets:Cash -1500 USD
{sales}"""
SALE = """{date} * "Sell"
  Assets:Broker -{quantity} ABC {{{cost}}} {price}
  Assets:Cash {cash} USD
  Income:Gains
"""


def _sale(cost: str, quantity: int = 5, date: str = "2026-02-01", price: str = "@ 200 USD") -> str:
    return SALE.format(date=date, quantity=quantity, cost=cost, price=price, cash=quantity * 200)


def _booked(tmp_path: Path) -> str:
    """What the ledger booked to `Income:Gains`, negated: the tie-out the rows must meet."""
    proc = bea(
        [
            "--file",
            str(tmp_path / "main.beancount"),
            "--json",
            "query",
            "SELECT -sum(number) AS gain WHERE account = 'Income:Gains'",
        ],
        tmp_path,
    )
    assert proc.returncode == 0, proc.stderr
    ((gain,),) = json.loads(proc.stdout)["data"]["rows"]
    return str(gain)


@pytest.mark.parametrize(
    ("booking", "cost"),
    [("NONE", "100 USD"), ("NONE", "100 USD, 2025-01-10"), ("FIFO", "100 USD")],
    ids=["none-undated", "none-dated", "fifo"],
)
def test_a_none_sale_naming_the_cost_reports_the_lot_it_named(tmp_path: Path, booking: str, cost: str) -> None:
    data = _gains(tmp_path, NONE_SALE.format(booking=booking, sales=_sale(cost)))

    (row,) = data["rows"]  # type: ignore[misc]
    assert row["acquired"] == "2025-01-10" and row["sold"] == "2026-02-01" and row["long_held"] is True
    assert row["quantity"] == {"number": "5", "currency": "ABC"}
    assert row["proceeds"] == {"number": "1000", "currency": "USD"}
    assert row["basis"] == {"number": "500", "currency": "USD"}
    assert row["gain"] == {"number": "500", "currency": "USD"}
    assert data["totals"] == {"one_year_or_less": {}, "more_than_one_year": {"USD": "500"}, "holding_unknown": {}}
    assert _booked(tmp_path) == "500"


def test_a_none_sale_at_an_average_cost_has_an_unknown_holding(tmp_path: Path) -> None:
    data = _gains(tmp_path, NONE_SALE.format(booking="NONE", sales=_sale("125 USD")))

    (row,) = data["rows"]  # type: ignore[misc]
    assert row["acquired"] is None and row["held_days"] is None and row["long_held"] is None
    assert row["quantity"] == {"number": "5", "currency": "ABC"}
    assert row["basis"] == {"number": "625", "currency": "USD"}
    assert row["gain"] == {"number": "375", "currency": "USD"}
    assert data["totals"] == {"one_year_or_less": {}, "more_than_one_year": {}, "holding_unknown": {"USD": "375"}}
    assert _booked(tmp_path) == "375"


def test_none_sales_reduce_the_net_holding_and_its_excess_opens_a_short(tmp_path: Path) -> None:
    # The second same-day sale shares the first's key, a lot on its own side;
    # the third outruns the 10 ABC left, and only those close; the fourth
    # finds the account already short, so it closes nothing.
    sales = (
        _sale("100 USD") * 2 + _sale("150 USD", quantity=15, date="2026-03-01") + _sale("100 USD", date="2026-03-02")
    )
    data = _gains(tmp_path, NONE_SALE.format(booking="NONE", sales=sales))

    rows = [(row["acquired"], row["sold"], row["quantity"]["number"], row["gain"]["number"]) for row in data["rows"]]  # type: ignore[attr-defined]
    assert rows == [
        ("2025-01-10", "2026-02-01", "5", "500"),
        ("2025-01-10", "2026-02-01", "5", "500"),
        ("2025-03-10", "2026-03-01", "10", "500"),
    ]


def test_an_undated_none_cover_closes_the_short_it_names(tmp_path: Path) -> None:
    cover = COVER.replace("{{100 USD, 2026-01-02}}", "{{100 USD}}").format(price="80", booked="-20")
    data = _gains(tmp_path, SHORT.format(cover=cover))

    (row,) = data["rows"]  # type: ignore[misc]
    assert row["acquired"] == "2026-01-02" and row["sold"] == "2026-01-20"
    assert row["proceeds"] == {"number": "100", "currency": "USD"}
    assert row["basis"] == {"number": "80", "currency": "USD"}
    assert row["gain"] == {"number": "20", "currency": "USD"}


def test_an_unpriced_undated_none_sale_is_named_not_dropped(tmp_path: Path) -> None:
    data = _gains(tmp_path, NONE_SALE.format(booking="NONE", sales=_sale("100 USD", price="")))

    assert data["rows"] == []
    (item,) = data["unpriced_reductions"]  # type: ignore[misc]
    assert item["acquired"] == "2025-01-10" and item["quantity"] == {"number": "5", "currency": "ABC"}
    assert item["cost"] == {"number": "100", "currency": "USD"}


LABELLED = """option "operating_currency" "USD"
2025-01-01 open Assets:Broker "NONE"
2025-01-01 open Assets:Cash USD
2025-01-01 open Income:Gains USD
2025-01-10 * "Buy"
  Assets:Broker 10 ABC {{100 USD, "a"}}
  Assets:Cash -1000 USD
2025-06-10 * "Buy"
  Assets:Broker 10 ABC {{100 USD, "b"}}
  Assets:Cash -1000 USD
2026-01-05 * "Sell"
  Assets:Broker -5 ABC {{100 USD{label}}} @ 200 USD
  Assets:Cash 1000 USD
  Income:Gains
"""


@pytest.mark.parametrize(("label", "acquired"), [(', "b"', "2025-06-10"), ("", None)], ids=["named", "ambiguous"])
def test_a_none_sale_takes_the_one_lot_its_cost_and_label_name(
    tmp_path: Path, label: str, acquired: str | None
) -> None:
    (row,) = _gains(tmp_path, LABELLED.format(label=label))["rows"]  # type: ignore[misc]
    assert row["acquired"] == acquired and row["gain"] == {"number": "500", "currency": "USD"}
