"""A closed account's emptiness is its inventory, not its converted value (w5/947).

`bea balance` hid a closed account whose converted balance was zero. 10 EUR
against -10 USD is 0 USD at a 1:1 rate, and a share with a zero market quote is
0 USD too; both accounts still hold something, and the units and cost views
showed it. A closed account that holds nothing stays excluded.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

FX = """option "operating_currency" "USD"
2024-01-01 open Assets:Mixed USD,EUR
2024-01-01 open Equity:Opening
2024-01-02 * "Currency balances"
  Assets:Mixed 10.00 EUR
  Equity:Opening -10.00 EUR
  Assets:Mixed -10.00 USD
  Equity:Opening 10.00 USD
{price}2024-02-01 close Assets:Mixed
"""
STOCK = """option "operating_currency" "USD"
2024-01-01 open Assets:Broker HOOL,USD
2024-01-01 open Assets:Cash USD
2024-01-02 * "Buy"
  Assets:Broker 1 HOOL {{100.00 USD}}
  Assets:Cash -100.00 USD
{price}2024-02-01 close Assets:Broker
"""
EMPTY = """option "operating_currency" "USD"
2024-01-01 open Assets:Mixed USD,EUR
2024-01-01 open Equity:Opening
2024-01-02 * "In"
  Assets:Mixed 10.00 EUR
  Equity:Opening -10.00 EUR
2024-01-03 * "Out"
  Assets:Mixed -10.00 EUR
  Equity:Opening 10.00 EUR
2024-02-01 close Assets:Mixed
"""


def _balance(tmp_path: Path, ledger: str, term: str, conversion: str) -> dict[str, object]:
    (tmp_path / "main.bean").write_text(ledger)
    result = _bea(tmp_path, "balance", term, "--time", "2024-02", "--conversion", conversion, "--allow-errors")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("conversion", ["USD", "at_value", "units", "at_cost"])
def test_a_closed_account_cancelling_at_par_is_still_matched(tmp_path: Path, conversion: str) -> None:
    data = _balance(tmp_path, FX.format(price="2024-01-31 price EUR 1.00 USD\n"), "Mixed", conversion)

    assert data["account_filter_empty"] is False
    assert data["assets"] is not None


def test_a_zero_market_price_does_not_hide_a_held_share(tmp_path: Path) -> None:
    data = _balance(tmp_path, STOCK.format(price="2024-01-31 price HOOL 0 USD\n"), "Broker", "USD")

    assert data["account_filter_empty"] is False


def test_a_positive_price_and_an_open_account_are_unchanged(tmp_path: Path) -> None:
    priced = _balance(tmp_path, FX.format(price="2024-01-31 price EUR 1.10 USD\n"), "Mixed", "USD")
    still_open = _balance(
        tmp_path,
        FX.format(price="2024-01-31 price EUR 1.00 USD\n").replace("2024-02-01 close Assets:Mixed\n", ""),
        "Mixed",
        "USD",
    )

    assert priced["account_filter_empty"] is False
    assert still_open["account_filter_empty"] is False


@pytest.mark.parametrize("conversion", ["USD", "units"])
def test_a_genuinely_empty_closed_account_stays_excluded(tmp_path: Path, conversion: str) -> None:
    data = _balance(tmp_path, EMPTY, "Mixed", conversion)

    assert data["account_filter_empty"] is True
