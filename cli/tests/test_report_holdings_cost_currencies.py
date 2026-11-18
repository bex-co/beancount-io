"""Holdings list a commodity once when its lots were costed in two currencies (w1/288).

Ten VT bought at 100 USD and ten at 90 EUR, both valued into USD, listed as
two identical-looking `10 VT` rows, one account or, under `--group-by
commodity`, two. Under a currency conversion they are one holding; without
one each cost currency keeps its own row, told apart by its AVG COST.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from tests.test_report_holdings_register_frontend import _bea, _write

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:EurCash EUR
2024-01-01 open Assets:BrokerA
2024-01-01 open Assets:BrokerB
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Cash 10000 USD
  Assets:EurCash 10000 EUR
  Equity:Opening -10000 USD
  Equity:Opening -10000 EUR
2024-02-01 * "buy usd"
  Assets:BrokerA 10 VT {100 USD}
  Assets:Cash
2024-02-02 * "buy eur"
  Assets:{eur_broker} 10 VT {90 EUR}
  Assets:EurCash
2024-03-01 price VT 110 USD
2024-03-01 price EUR 1.2 USD
"""
ONE_ACCOUNT = LEDGER.replace("{eur_broker}", "BrokerA")
TWO_ACCOUNTS = LEDGER.replace("{eur_broker}", "BrokerB")


def _holdings(tmp_path: Path, text: str, *args: str) -> tuple[int, dict[str, Any]]:
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings", *args)
    return proc.returncode, json.loads(proc.stdout or proc.stderr)


def _number(amount: dict[str, str]) -> tuple[Decimal, str]:
    return Decimal(amount["number"]), amount["currency"]


@pytest.mark.parametrize(
    ("text", "group_by", "scope"),
    [
        (ONE_ACCOUNT, "account", {"account": "Assets:BrokerA"}),
        (TWO_ACCOUNTS, "commodity", {"accounts": ["Assets:BrokerA", "Assets:BrokerB"]}),
    ],
    ids=["one-account", "across-accounts"],
)
def test_lots_costed_in_two_currencies_are_one_holding(
    tmp_path: Path, text: str, group_by: str, scope: dict[str, Any]
) -> None:
    code, payload = _holdings(tmp_path, text, "--group-by", group_by)

    assert code == 0, payload
    data = payload["data"]
    (group,) = data["groups"]
    assert {key: group[key] for key in scope} == scope
    assert group["commodity"] == "VT"
    assert group["units"] == {"number": "20", "currency": "VT"}
    assert _number(group["average_cost"]) == (Decimal(104), "USD")
    assert _number(group["cost_basis"]) == (Decimal(2080), "USD")
    assert _number(group["market_value"]) == (Decimal(2200), "USD")
    assert group["price"] == {"number": "110", "currency": "USD"}
    assert group["price_date"] == "2024-03-01"
    assert data["valuation"] == "complete"
    assert data["cost_basis_complete"] is True


def test_the_text_and_csv_show_one_row(tmp_path: Path) -> None:
    ledger = _write(tmp_path, ONE_ACCOUNT)

    text = _bea(tmp_path, "--file", str(ledger), "report", "holdings")
    table = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--format", "csv")

    assert text.returncode == 0, text.stderr
    (row,) = [line for line in text.stdout.splitlines() if line.startswith("Assets:BrokerA")]
    assert row.split() == ["Assets:BrokerA", "VT", "20", "VT", "104", "USD", "2,080", "USD", "2,200", "USD"]
    assert table.returncode == 0, table.stderr
    (record,) = csv.DictReader(io.StringIO(table.stdout))
    assert (record["units"], record["cost_basis"], record["market_value"]) == ("20", "2080.0", "2200")


@pytest.mark.parametrize("conversion", ["at_cost", "units"])
def test_without_a_currency_each_cost_currency_keeps_its_row(tmp_path: Path, conversion: str) -> None:
    """The bases are in different currencies and cannot be summed."""
    code, payload = _holdings(tmp_path, ONE_ACCOUNT, "--conversion", conversion, "--allow-errors")

    assert code == 0, payload
    groups = payload["data"]["groups"]
    assert [group["units"]["number"] for group in groups] == ["10", "10"]
    assert sorted(_number(group["average_cost"]) for group in groups) == [(Decimal(90), "EUR"), (Decimal(100), "USD")]


def test_a_basis_without_a_rate_keeps_its_own_row(tmp_path: Path) -> None:
    """With no EUR rate the EUR lot's basis stays in EUR, beside a USD market value."""
    code, payload = _holdings(tmp_path, ONE_ACCOUNT.replace("2024-03-01 price EUR 1.2 USD\n", ""), "--allow-errors")

    assert code == 0, payload
    groups = payload["data"]["groups"]
    assert [group["cost_basis"]["currency"] for group in groups] == ["EUR", "USD"]
    assert {group["market_value"]["currency"] for group in groups} == {"USD"}
    assert payload["data"]["totals"]["market_value"] == {"USD": "2200"}


def test_a_lot_in_one_currency_is_a_control(tmp_path: Path) -> None:
    text = ONE_ACCOUNT.replace("10 VT {90 EUR}", "10 VT {90 USD}").replace("Assets:EurCash\n", "Assets:Cash\n", 1)

    # The EUR cash no lot is costed in is a holding of its own: look at the broker.
    code, payload = _holdings(tmp_path, text, "--account", "Assets:BrokerA")

    assert code == 0, payload
    (group,) = payload["data"]["groups"]
    assert group["units"] == {"number": "20", "currency": "VT"}
    assert _number(group["cost_basis"]) == (Decimal(1900), "USD")


def test_an_uncosted_position_joins_the_merged_holding(tmp_path: Path) -> None:
    """With two cost currencies it formed its own row; merged, its unknown basis is the group's (w1/253)."""
    text = ONE_ACCOUNT + '2024-02-03 * "buy priced"\n  Assets:BrokerA 3 VT @ 105 USD\n  Assets:Cash\n'

    code, payload = _holdings(tmp_path, text)

    assert code == 0, payload
    data = payload["data"]
    (group,) = data["groups"]
    assert group["units"] == {"number": "23", "currency": "VT"}
    assert group["average_cost"] is None
    assert group["cost_basis"] is None
    assert _number(group["market_value"]) == (Decimal(2530), "USD")
    assert data["cost_basis_complete"] is False


def _part(price_date: date | None, price_source: Any = None, conversion_source: Any = None) -> dict[str, Any]:
    return {
        "account": "Assets:Broker",
        "commodity": "VT",
        "units": {"number": Decimal(10), "currency": "VT"},
        "average_cost": {"number": Decimal(100), "currency": "USD"},
        "cost_basis": {"number": Decimal(1000), "currency": "USD"},
        "market_value": {"number": Decimal(1100), "currency": "USD"},
        "price": {"number": Decimal(110), "currency": "USD"} if price_date else None,
        "price_date": price_date,
        "price_source": price_source,
        "conversion_source": conversion_source,
    }


def test_the_merge_keeps_the_latest_quote_and_any_stale_source() -> None:
    from bea_engine.report import _merged_holding

    fresh, stale = {"alias": "VT-USD", "freshness": "recent"}, {"alias": "EUR-USD", "freshness": "stale"}
    parts = [_part(None), _part(date(2024, 3, 1), fresh), _part(date(2024, 2, 1), None, stale)]

    merged = _merged_holding(parts, "account")

    assert merged["price_date"] == date(2024, 3, 1)
    assert merged["price_source"] == fresh
    # The market value sums every part, so the leg one of them was valued
    # through still taints it.
    assert merged["conversion_source"] == stale
    assert merged["units"]["number"] == 30
    assert merged["average_cost"] == {"number": Decimal(100), "currency": "USD"}
    assert _merged_holding([parts[0]], "account") is parts[0]
