"""A parent register keeps same-day rows in the order the ledger books them (w5/1056).

Rows were grouped by child account and then sorted by date, so a payment
first in the file was shown second with a running balance the parent never
held, and a start-of-day assertion could follow a payment.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

BASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Bank:Alpha USD
2024-01-01 open Assets:Bank:Zeta USD
2024-01-01 open Equity:Opening USD
2024-01-01 open Expenses:Food USD
2024-01-01 * "Capital"
  Assets:Bank:Alpha 50 USD
  Assets:Bank:Zeta 100 USD
  Equity:Opening -150 USD
2024-01-02 * "First payment"
  Assets:Bank:Zeta -10 USD
  Expenses:Food 10 USD
{middle}2024-01-02 * "Second payment"
  Assets:Bank:Alpha -20 USD
  Expenses:Food 20 USD
"""
TRANSFER = """2024-01-02 * "Move savings"
  Assets:Bank:Zeta -25 USD
  Assets:Bank:Alpha 25 USD
"""


def _rows(tmp_path: Path, text: str) -> list[tuple[str, str, Decimal]]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "register", "Assets:Bank"], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return [
        (row["narration"] or row["entry"], row["account"], Decimal(row["balance"]["USD"]))
        for row in json.loads(proc.stdout)["data"]["rows"]
    ]


@pytest.mark.parametrize("transfer", [False, True], ids=["payments", "with-transfer"])
def test_same_day_rows_follow_the_ledger(tmp_path: Path, transfer: bool) -> None:
    rows = _rows(tmp_path, BASE.format(middle=TRANSFER if transfer else ""))

    balances = [balance for *_, balance in rows]
    narrations = [narration for narration, *_ in rows]
    if transfer:
        assert narrations == ["Capital", "Capital", "First payment", "Move savings", "Move savings", "Second payment"]
        assert balances == [Decimal(50), Decimal(150), Decimal(140), Decimal(115), Decimal(140), Decimal(120)]
    else:
        assert narrations == ["Capital", "Capital", "First payment", "Second payment"]
        assert balances == [Decimal(50), Decimal(150), Decimal(140), Decimal(120)]


def test_a_start_of_day_assertion_shows_the_parent_balance_then(tmp_path: Path) -> None:
    text = BASE.format(middle="") + "2024-01-02 balance Assets:Bank:Alpha 50 USD\n"

    rows = _rows(tmp_path, text)

    (assertion,) = [row for row in rows if row[0] == "balance"]
    assert assertion[2] == Decimal(150)
