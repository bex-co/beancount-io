"""Cash Flow reads a non-cash leg a price weighs at its weight, the cash it moved (w1/357).

A 22.00 USD taxi fare stated as `Expenses:Travel 20.00 EUR @ 1.10 USD` and paid
from checking was read in its units, a -20.00 EUR row against -22.00 USD of
cash, so the w5/1068 guard refused the whole period as a currency exchange.
Only a price on a cash leg is an exchange the rows cannot explain
(`test_report_cash_flow_priced_fx.py`).
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from tests.report_helpers import bea, write_ledger

TRIP = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Liabilities:Card USD
2026-01-01 open Equity:Opening-Balances
2026-01-01 open Expenses:Travel

2026-01-01 * "Opening"
  Assets:Checking  5000.00 USD
  Equity:Opening-Balances

2026-01-05 * "Paris hotel, credit card"
  Expenses:Travel   100.00 EUR @ 1.10 USD
  Liabilities:Card -110.00 USD

2026-01-20 * "Pay card"
  Liabilities:Card  110.00 USD
  Assets:Checking  -110.00 USD

2026-02-05 * "Paris taxi, debit card"
  Expenses:Travel    20.00 EUR @ 1.10 USD
  Assets:Checking   -22.00 USD
"""
INVOICE = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Consulting
2026-03-10 * "Client invoice paid"
  Assets:Checking    550.00 USD
  Income:Consulting -500.00 EUR @ 1.10 USD
"""
# `Assets:Euro` is not named like cash, so buying euros there is an investment
# paid from checking, not an exchange between cash accounts.
EURO_ASSET = """option "operating_currency" "USD"
2023-12-01 open Assets:Checking USD
2023-12-01 open Assets:Euro EUR
2023-12-01 open Equity:Opening USD
2023-12-01 open Expenses:Fees USD
2023-12-01 * "Capital"
  Assets:Checking 1000 USD
  Equity:Opening -1000 USD
2024-01-10 * "Buy euros"
  Assets:Euro 100 EUR @ 1.10 USD
  Assets:Checking -112 USD
  Expenses:Fees 2 USD
"""
# The weight is 22.074 USD against 22.07 USD paid: Beancount's tolerance
# accepts the 0.004 USD, and the statement discloses it as rounding.
TOLERANCE = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Equity:Opening
2026-01-01 open Expenses:Travel
2026-01-01 * "Opening"
  Assets:Checking 100.00 USD
  Equity:Opening
2026-02-05 * "Taxi"
  Expenses:Travel 20.00 EUR @ 1.1037 USD
  Assets:Checking -22.07 USD
"""


def _run(tmp_path: Path, text: str, *argv: str) -> str:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), *argv], tmp_path)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return proc.stdout


def _data(tmp_path: Path, text: str, *argv: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads(_run(tmp_path, text, "--json", "report", "cash-flow", *argv))["data"]
    return data


def _numbers(amounts: dict[str, str]) -> dict[str, Decimal]:
    return {currency: Decimal(number) for currency, number in amounts.items()}


def _rows(data: dict[str, Any]) -> dict[str, dict[str, dict[str, Decimal]]]:
    sections: dict[str, list[dict[str, Any]]] = data["sections"]
    return {section: {row["account"]: _numbers(row["amounts"]) for row in rows} for section, rows in sections.items()}


@pytest.mark.parametrize(
    ("time", "opening", "closing", "financing"),
    [
        ("2026-02", "4890.00", "4868.00", {}),
        (
            "2026",
            "0.00",
            "4868.00",
            {"Equity:Opening-Balances": {"USD": Decimal("5000.00")}, "Liabilities:Card": {"USD": Decimal("-110.00")}},
        ),
    ],
    ids=["february", "year"],
)
def test_a_foreign_bill_paid_from_checking_reports_the_cash_paid(
    tmp_path: Path, time: str, opening: str, closing: str, financing: dict[str, dict[str, Decimal]]
) -> None:
    data = _data(tmp_path, TRIP, "--time", time)

    assert _rows(data) == {
        "operating": {"Expenses:Travel": {"USD": Decimal("-22.00")}},
        "investing": {},
        "financing": financing,
    }
    assert data["opening"] == {"USD": opening}
    assert data["closing"] == {"USD": closing}
    assert _numbers(data["net_change"]) == {"USD": Decimal(closing) - Decimal(opening)}
    assert data["rounding_residual"] == {}


def test_the_text_statement_reports_the_cash_paid(tmp_path: Path) -> None:
    out = _run(tmp_path, TRIP, "report", "cash-flow", "--time", "2026-02")

    assert "EUR" not in out
    lines = [" ".join(line.split()) for line in out.splitlines()]
    assert "Expenses:Travel -22.00 USD" in lines
    assert "Net change in cash: -22.00 USD" in lines
    assert "Opening cash: 4,890.00 USD" in lines
    assert "Closing cash: 4,868.00 USD" in lines


def test_the_card_purchase_control_is_unchanged(tmp_path: Path) -> None:
    data = _data(tmp_path, TRIP, "--time", "2026-01")

    assert _rows(data)["operating"] == {}
    assert data["closing"] == {"USD": "4890.00"}


def test_a_foreign_invoice_paid_into_checking_is_an_operating_inflow(tmp_path: Path) -> None:
    data = _data(tmp_path, INVOICE, "--time", "2026-03")

    assert _rows(data)["operating"] == {"Income:Consulting": {"USD": Decimal("550.00")}}
    assert data["closing"] == {"USD": "550.00"}


def test_foreign_currency_bought_into_a_non_cash_account_is_investing(tmp_path: Path) -> None:
    data = _data(tmp_path, EURO_ASSET, "--time", "2024-01")

    assert _rows(data) == {
        "operating": {"Expenses:Fees": {"USD": Decimal("-2")}},
        "investing": {"Assets:Euro": {"USD": Decimal("-110")}},
        "financing": {},
    }
    assert data["opening"] == {"USD": "1000"}
    assert data["closing"] == {"USD": "888"}


def test_a_priced_legs_accepted_tolerance_is_rounding(tmp_path: Path) -> None:
    data = _data(tmp_path, TOLERANCE, "--time", "2026-02")

    assert _rows(data)["operating"] == {"Expenses:Travel": {"USD": Decimal("-22.074")}}
    assert data["opening"] == {"USD": "100.00"}
    assert data["closing"] == {"USD": "77.93"}
    assert _numbers(data["rounding_residual"]) == {"USD": Decimal("0.004")}
