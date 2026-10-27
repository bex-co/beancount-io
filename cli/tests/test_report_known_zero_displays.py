"""A holding worth exactly zero reads `0` in every report display, not empty (w5/1055).

Two HOOL at a zero cost (or a zero quote) are a known 0 USD: the trees said
so, but the register's running balance, Balance Sheet and Overview net worth
and their series came back `{}` and printed `—`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 commodity HOOL
2024-01-01 open Assets:Stock HOOL
2024-01-01 open Equity:Gifts USD
2024-01-02 * "Gift"
  Assets:Stock 2 HOOL {{0 USD}}
  Equity:Gifts 0 USD
{price}"""


def _json(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


CASES = [("at_cost", ""), ("at_value", "2024-01-31 price HOOL 0 USD\n"), ("USD", "2024-01-31 price HOOL 0 USD\n")]


@pytest.mark.parametrize(("conversion", "price"), CASES, ids=["zero-cost", "zero-price-value", "zero-price-usd"])
def test_register_balance_sheet_and_overview_keep_the_zero(tmp_path: Path, conversion: str, price: str) -> None:
    text = LEDGER.format(price=price)

    register = _json(tmp_path, text, "report", "register", "Assets:Stock", "--conversion", conversion)
    assert register["rows"][-1]["balance"] == {"USD": "0"}  # type: ignore[index]

    sheet = _json(tmp_path, text, "report", "balance-sheet", "--time", "2024-01", "--conversion", conversion)
    assert sheet["net_worth"] == {"USD": "0"}
    assert sheet["net_worth_series"][-1]["balance"] == {"USD": "0"}  # type: ignore[index]

    overview = _json(tmp_path, text, "report", "overview", "--time", "2024-01", "--conversion", conversion)
    assert overview["totals"]["net_worth"] == {"USD": "0"}  # type: ignore[index]


def test_units_and_empty_positions_stay_as_they_were(tmp_path: Path) -> None:
    text = LEDGER.format(price="")

    register = _json(tmp_path, text, "report", "register", "Assets:Stock", "--conversion", "units")
    assert register["rows"][-1]["balance"] == {"HOOL": "2"}  # type: ignore[index]
