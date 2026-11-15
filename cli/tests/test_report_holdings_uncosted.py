"""Holdings keep positions bought with a price but no cost (w1/253).

`_holdings` skipped every inventory key without a cost, on the rule that
cost-less lots are cash. Shares recorded as `3 AAPL @ 200 USD` vanished:
`Assets:Plain` printed "No holdings." while the trial balance and the balance
sheet valued it at 510 USD. Cash is now told apart by its commodity: an
uncosted balance in an operating or cost currency stays out, any other
uncosted position is a holding with an unknown basis. A currency something is
only quoted in is not cash (w1/255).
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import pytest

from tests.test_report_holdings_register_frontend import _bea, _write

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Mixed
2024-01-01 open Assets:Plain
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Bank 10000 USD
  Equity:Opening
2024-02-01 * "buy costed"
  Assets:Mixed 5 AAPL {150 USD}
  Assets:Bank -750 USD
2024-02-02 * "buy priced into mixed"
  Assets:Mixed 2 AAPL @ 200 USD
  Assets:Bank -400 USD
2024-02-03 * "buy priced into plain"
  Assets:Plain 3 AAPL @ 200 USD
  Assets:Bank -600 USD
2024-03-01 price AAPL 170 USD
"""

# Cash controls: an uncosted USD and an uncosted EUR balance, EUR an
# operating currency too, beside one costed holding.
CASH = """option "operating_currency" "USD"
option "operating_currency" "EUR"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Euro EUR
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Bank 1000 USD
  Assets:Euro 500 EUR
  Equity:Opening
2024-01-03 * "buy"
  Assets:Broker 2 HOOL {100 USD}
  Assets:Bank -200 USD
2024-01-31 price HOOL 120 USD
"""


def _data(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings", *args)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


def test_priced_lots_are_holdings_valued_at_the_quote(tmp_path: Path) -> None:
    data = _data(tmp_path, LEDGER)

    mixed, plain = data["groups"]  # type: ignore[misc]
    assert mixed["account"] == "Assets:Mixed"
    assert mixed["units"] == {"number": "7", "currency": "AAPL"}
    assert mixed["market_value"] == {"number": "1190", "currency": "USD"}
    assert plain["account"] == "Assets:Plain"
    assert plain["units"] == {"number": "3", "currency": "AAPL"}
    assert plain["market_value"] == {"number": "510", "currency": "USD"}
    assert plain["price"] == {"number": "170", "currency": "USD"}
    # An uncosted lot has no known basis, so neither group has one.
    for group in (mixed, plain):
        assert group["average_cost"] is None
        assert group["cost_basis"] is None
    assert data["totals"] == {"cost_basis": {}, "market_value": {"USD": "1700"}}
    assert data["cost_basis_complete"] is False
    assert data["valuation"] == "complete"


def test_an_account_holding_only_priced_lots_is_not_empty(tmp_path: Path) -> None:
    data = _data(tmp_path, LEDGER, "-a", "Assets:Plain")

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["units"] == {"number": "3", "currency": "AAPL"}


def test_the_commodity_grouping_merges_costed_and_priced_units(tmp_path: Path) -> None:
    data = _data(tmp_path, LEDGER, "--group-by", "commodity")

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["accounts"] == ["Assets:Mixed", "Assets:Plain"]
    assert group["units"] == {"number": "10", "currency": "AAPL"}
    assert group["market_value"] == {"number": "1700", "currency": "USD"}
    assert group["cost_basis"] is None


def test_csv_rows_carry_the_priced_lots(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--format", "csv")
    assert proc.returncode == 0, proc.stderr

    rows = list(csv.DictReader(io.StringIO(proc.stdout)))
    assert [(row["account"], row["units"], row["market_value"]) for row in rows] == [
        ("Assets:Mixed", "7", "1190"),
        ("Assets:Plain", "3", "510"),
    ]
    assert all(row["cost_basis"] == "" and row["average_cost"] == "" for row in rows)


def test_the_text_total_says_some_basis_is_unknown(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr

    assert "Assets:Plain" in proc.stdout
    assert "excludes positions without a cost basis" in proc.stdout
    assert "1,700 USD" in proc.stdout


@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_cash_in_operating_currencies_stays_out(tmp_path: Path, group_by: str) -> None:
    data = _data(tmp_path, CASH, "--group-by", group_by)

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["commodity"] == "HOOL"
    assert group["cost_basis"] == {"number": "200", "currency": "USD"}
    assert data["cost_basis_complete"] is True


def test_without_operating_currencies_cost_and_price_currencies_are_cash(tmp_path: Path) -> None:
    text = LEDGER.replace('option "operating_currency" "USD"\n', "")
    data = _data(tmp_path, text, "-x", "units")

    assert {group["account"] for group in data["groups"]} == {"Assets:Mixed", "Assets:Plain"}  # type: ignore[attr-defined]


def test_an_unquoted_priced_lot_fails_strict_and_stays_in_units_partial(tmp_path: Path) -> None:
    text = LEDGER.replace("2024-03-01 price AAPL 170 USD\n", "").replace(
        "Assets:Mixed 5 AAPL {150 USD}", "Assets:Mixed 5 AAPL @ 150 USD"
    )
    ledger = _write(tmp_path, text)
    strict = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings")
    assert strict.returncode != 0
    assert "AAPL" in strict.stdout + strict.stderr

    data = _data(tmp_path, text, "--allow-errors")
    assert data["valuation"] == "partial"
    assert data["missing_prices"] == [{"from": "AAPL", "to": "USD"}]
    mixed = data["groups"][0]  # type: ignore[index]
    assert mixed["units"] == {"number": "7", "currency": "AAPL"}
    assert mixed["market_value"] == {"number": "7", "currency": "AAPL"}


# w1/255: being quoted in does not make a commodity money. A USD ledger that
# prices ETH in BTC, or swaps BTC for ETH at a BTC price, still holds BTC as
# an investment.
CRYPTO = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Crypto
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Bank 100000 USD
  Equity:Opening
2024-02-01 * "buy btc"
  Assets:Crypto 1 BTC @ 40000 USD
  Assets:Bank -40000 USD
2024-03-01 price BTC 50000 USD
2024-03-01 price ETH 0.05 BTC
"""


def _positions(data: dict[str, object]) -> list[tuple[str, str, dict[str, str]]]:
    return [
        (group["commodity"], group["units"]["number"], group["market_value"])  # type: ignore[index]
        for group in data["groups"]  # type: ignore[attr-defined]
    ]


def test_a_currency_other_commodities_are_quoted_in_is_still_a_holding(tmp_path: Path) -> None:
    data = _data(tmp_path, CRYPTO)

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["account"] == "Assets:Crypto"
    assert group["units"] == {"number": "1", "currency": "BTC"}
    assert group["market_value"] == {"number": "50000", "currency": "USD"}
    assert group["cost_basis"] is None
    assert data["cost_basis_complete"] is False
    assert data["valuation"] == "complete"


def test_a_posting_price_currency_is_still_a_holding(tmp_path: Path) -> None:
    text = CRYPTO.replace(
        "2024-03-01 price BTC",
        '2024-02-15 * "swap"\n  Assets:Crypto 2 ETH @ 0.05 BTC\n  Assets:Crypto -0.1 BTC\n2024-03-01 price BTC',
    )
    data = _data(tmp_path, text)

    assert _positions(data) == [
        ("BTC", "0.9", {"number": "45000.0", "currency": "USD"}),
        ("ETH", "2", {"number": "5000.00", "currency": "USD"}),
    ]
    assert data["totals"] == {"cost_basis": {}, "market_value": {"USD": "50000.00"}}


def test_a_cost_currency_stays_cash_beside_a_quoted_holding(tmp_path: Path) -> None:
    # EUR pays for a lot, so its balance settles holdings and stays out; BTC
    # is only quoted in, so it stays a holding.
    text = CRYPTO.replace(
        "2024-03-01 price BTC",
        "2024-01-01 open Assets:Euro\n"
        '2024-02-10 * "eur"\n  Assets:Euro 1000 EUR @ 1.10 USD\n  Assets:Bank\n'
        '2024-02-11 * "hool"\n  Assets:Crypto 2 HOOL {100 EUR}\n  Assets:Euro\n'
        "2024-03-01 price HOOL 120 EUR\n2024-03-01 price EUR 1.10 USD\n2024-03-01 price BTC",
    )
    data = _data(tmp_path, text)

    assert [(commodity, units) for commodity, units, _ in _positions(data)] == [("BTC", "1"), ("HOOL", "2")]


def test_a_foreign_currency_outside_the_operating_ones_is_a_holding(tmp_path: Path) -> None:
    text = (
        CASH.replace('option "operating_currency" "EUR"\n', "")
        .replace("  Assets:Euro 500 EUR\n", "")
        .replace("2024-01-03", '2024-01-02 * "exchange"\n  Assets:Euro 500 EUR @ 1.10 USD\n  Assets:Bank\n2024-01-03')
        + "2024-01-31 price EUR 1.10 USD\n"
    )
    data = _data(tmp_path, text)

    assert [(commodity, units) for commodity, units, _ in _positions(data)] == [("HOOL", "2"), ("EUR", "500")]
    euro = data["groups"][1]  # type: ignore[index]
    assert euro["market_value"] == {"number": "550.00", "currency": "USD"}
    assert euro["cost_basis"] is None


# w1/256: only balance-sheet positions are holdings. A priced expense in a
# foreign currency is a flow, not a position, while the same uncosted EUR in an
# Assets account still is one (w1/253).
FLOWS = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Wallet
2024-01-01 open Liabilities:Loan
2024-01-01 open Expenses:Travel
2024-01-01 open Income:Refund
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Bank 1000 USD
  Equity:Opening
2024-02-01 * "trip"
  Expenses:Travel 100 EUR @ 1.1 USD
  Assets:Bank
2024-02-02 * "refund"
  Income:Refund -20 GBP @ 1.25 USD
  Assets:Bank
2024-02-03 * "exchange"
  Assets:Wallet 50 EUR @ 1.1 USD
  Assets:Bank
2024-02-04 * "borrow btc"
  Assets:Bank 1000 USD
  Liabilities:Loan -0.02 BTC @ 50000 USD
2024-03-01 price EUR 1.2 USD
2024-03-01 price GBP 1.3 USD
2024-03-01 price BTC 50000 USD
"""


@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_uncosted_flow_balances_are_not_holdings(tmp_path: Path, group_by: str) -> None:
    data = _data(tmp_path, FLOWS, "--group-by", group_by)

    assert sorted((commodity, units) for commodity, units, _ in _positions(data)) == [("BTC", "-0.02"), ("EUR", "50")]
    groups = data["groups"]  # type: ignore[assignment]
    accounts = sorted(group["account"] if group_by == "account" else group["accounts"][0] for group in groups)  # type: ignore[attr-defined,index]
    assert accounts == ["Assets:Wallet", "Liabilities:Loan"]
    assert data["totals"] == {"cost_basis": {}, "market_value": {"USD": "-940.00"}}


def test_an_expense_account_filter_lists_no_holdings(tmp_path: Path) -> None:
    data = _data(tmp_path, FLOWS, "-a", "Expenses:Travel")

    assert data["groups"] == []
