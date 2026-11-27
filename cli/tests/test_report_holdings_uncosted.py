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
import re
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


# w1/314: 3 HOOL costed at 30 USD and 2 HOOL bought `@ 40 USD` in one account,
# nothing quoting HOOL. The 2 HOOL joined the costed group and counted in its
# units, but the group was valued at its basis, which they lack, so they fell
# out of the market value: `5 HOOL … 90.00 USD`, "valued at cost". In another
# account they read `2 HOOL`. A costed group only takes them when a quote
# values them, so grouping and account layout no longer change the totals.
UNQUOTED = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Broker2
2026-01-01 open Equity:Opening-Balances USD
2026-01-02 * "Opening"
  Assets:Bank  1000.00 USD
  Equity:Opening-Balances
2026-02-01 * "Buy, lot tracked"
  Assets:Broker  3 HOOL {30.00 USD}
  Assets:Bank   -90.00 USD
2026-02-02 * "Buy, no lot"
  Assets:Broker  2 HOOL @ 40.00 USD
  Assets:Bank   -80.00 USD
"""
IN_UNITS = "HOOL has no USD price at any date; costed lots valued at cost, the rest shown in units"


def _held(data: dict[str, object]) -> list[tuple[str, dict[str, str], dict[str, str] | None]]:
    """Each row's units, market value and cost basis, by units."""
    return sorted(
        (group["units"]["number"], group["market_value"], group["cost_basis"])  # type: ignore[index]
        for group in data["groups"]  # type: ignore[attr-defined]
    )


@pytest.mark.parametrize("group_by", ["account", "commodity"])
@pytest.mark.parametrize("uncosted_in", ["Assets:Broker", "Assets:Broker2"])
def test_unquoted_uncosted_units_keep_their_own_row_in_units(tmp_path: Path, group_by: str, uncosted_in: str) -> None:
    text = UNQUOTED.replace("  Assets:Broker  2 HOOL", f"  {uncosted_in}  2 HOOL")
    data = _data(tmp_path, text, "--allow-errors", "--group-by", group_by)

    assert _held(data) == [
        ("2", {"number": "2", "currency": "HOOL"}, None),
        ("3", {"number": "90.00", "currency": "USD"}, {"number": "90.00", "currency": "USD"}),
    ]
    assert data["totals"] == {"cost_basis": {"USD": "90.00"}, "market_value": {"HOOL": "2", "USD": "90.00"}}
    assert data["cost_basis_complete"] is False
    assert data["missing_prices"] == [{"from": "HOOL", "to": "USD"}]
    assert data["missing_price_summary"] == [IN_UNITS]


def test_unquoted_uncosted_units_in_text_and_csv(tmp_path: Path) -> None:
    ledger = _write(tmp_path, UNQUOTED)
    text = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--allow-errors")
    assert text.returncode == 0, text.stderr
    assert re.search(r"Cost basis:\s+90\.00 USD \(excludes positions without a cost basis\)", text.stdout)
    assert re.search(r"Market value:\s+2 HOOL\s+90\.00 USD", text.stdout)
    assert IN_UNITS in text.stderr

    table = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--allow-errors", "--format", "csv")
    assert table.returncode == 0, table.stderr
    rows = list(csv.DictReader(io.StringIO(table.stdout)))
    assert sorted(
        (row["units"], row["market_value"], row["market_value_currency"], row["cost_basis"]) for row in rows
    ) == [
        ("2", "2", "HOOL", ""),
        ("3", "90.00", "USD", "90.00"),
    ]


def test_unquoted_uncosted_units_strict_hint_names_both_treatments(tmp_path: Path) -> None:
    ledger = _write(tmp_path, UNQUOTED)
    strict = _bea(tmp_path, "--file", str(ledger), "report", "holdings")

    assert strict.returncode == 1
    assert "--allow-errors to value the costed lots at cost and show the rest in units." in strict.stderr
    assert IN_UNITS in strict.stderr


def test_a_quote_only_after_the_period_end_keeps_them_in_units(tmp_path: Path) -> None:
    text = UNQUOTED + "2026-03-15 price HOOL 35.00 USD\n"
    data = _data(tmp_path, text, "--allow-errors", "-t", "2026-02-28")

    assert _held(data)[0] == ("2", {"number": "2", "currency": "HOOL"}, None)
    assert data["missing_price_summary"] == [
        "HOOL → USD has no price before 2026-03-15; "
        "earlier holdings costed lots valued at cost, the rest shown in units"
    ]


@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_a_quote_still_merges_uncosted_units_into_the_costed_group(tmp_path: Path, group_by: str) -> None:
    data = _data(tmp_path, UNQUOTED + "2026-02-15 price HOOL 35.00 USD\n", "--group-by", group_by)

    assert _held(data) == [("5", {"number": "175.00", "currency": "USD"}, None)]
    assert data["valuation"] == "complete"


# w31/141: 212 EUR and 50 GBP held without a cost in a USD ledger, EUR quoted
# in USD and GBP not at all. Read in its own currency, a position is already
# in it, at the price map's 1. The candidates dropped the requested currency
# when it was the commodity and searched only USD: `-x GBP` refused the report
# for a GBP→USD quote it never needed.
OWN_CURRENCY = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Equity:Opening
2026-01-01 open Assets:Euro
2026-01-01 open Assets:Pound
2026-01-01 open Income:Dividends
2026-01-02 * "fund"
  Assets:Bank 1000.00 USD
  Equity:Opening
2026-07-08 * "buy EUR"
  Assets:Euro   200.00 EUR @ 1.10 USD
  Assets:Bank  -220.00 USD
2026-08-10 * "EUR dividend"
  Assets:Euro       12.00 EUR
  Income:Dividends -12.00 EUR
2026-08-20 price EUR 1.20 USD
2026-08-26 * "GBP grant"
  Assets:Pound      50.00 GBP
  Income:Dividends -50.00 GBP
"""


@pytest.mark.parametrize("group_by", ["account", "commodity"])
@pytest.mark.parametrize(
    ("currency", "account", "units"), [("GBP", "Assets:Pound", "50.00"), ("EUR", "Assets:Euro", "212.00")]
)
def test_a_position_in_the_conversion_currency_is_worth_its_units(
    tmp_path: Path, group_by: str, currency: str, account: str, units: str
) -> None:
    data = _data(tmp_path, OWN_CURRENCY, "-x", currency, "-a", account, "--group-by", group_by)

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["market_value"] == {"number": units, "currency": currency}
    assert group["price"] == {"number": "1", "currency": currency}
    assert group["conversion_source"] is None
    assert data["valuation"] == "complete"
    assert data["missing_prices"] == []
