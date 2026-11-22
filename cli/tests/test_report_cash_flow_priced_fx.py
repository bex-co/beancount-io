"""Cash Flow refuses a period whose priced currency exchange it cannot reconcile (w5/1068).

Reading every amount at cost, a `100 EUR @ 1.10 USD` exchange between two cash
accounts vanished from the rows, and the report back-solved an opening of
890 USD / 100 EUR (or "No cash flows") although cash opened at 1000 USD.
The refusal is for a price on a cash leg only: a price on any other leg is
read at its weight, the cash it moved (w1/357,
`test_report_cash_flow_priced_purchase.py`).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

# `Assets:Euro` matches no cash name pattern, so it is declared cash: without
# the role the exchange buys a non-cash asset, which reports (w1/357).
LEDGER = """option "operating_currency" "USD"
2023-12-01 open Assets:Checking USD
2023-12-01 open Assets:Euro EUR
  cash-flow-role: "cash"
2023-12-01 open Equity:Opening USD
2023-12-01 open Expenses:Fees USD
2023-12-01 open Expenses:Travel EUR
2023-12-01 * "Capital"
  Assets:Checking 1000 USD
  Equity:Opening -1000 USD
2024-01-10 * "Buy euros"
  Assets:Euro 100 EUR @ 1.10 USD
  Assets:Checking -{paid} USD
{fee}"""
FEE = "  Expenses:Fees 2 USD\n"
ROUND_TRIP = """2024-01-20 * "Sell euros back"
  Assets:Euro -40 EUR @ 1.20 USD
  Assets:Checking 48 USD
"""
PURCHASE = """2024-01-15 * "Paris taxi"
  Expenses:Travel 20 EUR @ 1.10 USD
  Assets:Checking -22 USD
"""


def _refusal(tmp_path: Path, text: str, *flags: str, as_json: bool = True) -> str:
    ledger = write_ledger(tmp_path, text)
    proc = bea(
        ["--file", str(ledger), *(["--json"] if as_json else []), "report", "cash-flow", "--time", "2024-01", *flags],
        tmp_path,
    )
    assert proc.returncode == 2, proc.stdout
    assert "Opening cash" not in proc.stdout
    message: str = json.loads(proc.stderr)["error"]["message"] if as_json else proc.stderr
    assert "cannot reconcile" in message
    return message


@pytest.mark.parametrize("fee", [True, False], ids=["with-fee", "no-fee"])
@pytest.mark.parametrize("flags", [[], ["--allow-errors"]], ids=["strict", "allow-errors"])
@pytest.mark.parametrize("as_json", [True, False], ids=["json", "human"])
def test_the_unreconcilable_period_is_refused(tmp_path: Path, fee: bool, flags: list[str], as_json: bool) -> None:
    text = LEDGER.format(paid="112" if fee else "110", fee=FEE if fee else "")

    message = _refusal(tmp_path, text, *flags, as_json=as_json)

    assert "Buy euros" in message and "move cash in EUR, USD by a price" in message


def test_a_round_trip_through_foreign_cash_is_refused(tmp_path: Path) -> None:
    message = _refusal(tmp_path, LEDGER.format(paid="110", fee="") + ROUND_TRIP)

    assert "Buy euros" in message and "Sell euros back" in message


def test_the_refusal_names_the_exchange_and_never_a_purchase(tmp_path: Path) -> None:
    # The taxi's price weighs an expense, not cash, so it is no exchange (w1/357).
    message = _refusal(tmp_path, LEDGER.format(paid="110", fee="") + PURCHASE)

    assert "Buy euros" in message
    assert "Paris taxi" not in message


def test_a_period_before_the_exchange_still_reports(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER.format(paid="112", fee=FEE))

    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", "--time", "2023-12"], tmp_path)

    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]
    assert data["closing"] == {"USD": "1000"}
