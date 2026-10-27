"""Capital Gains reports what each posting actually closed, long or short (w5/1035).

Only negative postings counted as sales: a short cover (or a payment settling
a costed EUR payable) was never reported, and the negative posting that opened
the short was reported as a two-unit sale at zero gain.
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
