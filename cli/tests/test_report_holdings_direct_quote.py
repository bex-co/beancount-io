"""Holdings values a lot with a quote in the requested currency first (w5/1033).

The market value always went through the lot's cost currency: an older EUR
quote valued 300 USD of shares at 250 USD as `complete`, and without any EUR
quote the strict report refused although a current USD quote existed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_report_holdings_register_frontend import _bea, _write

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Broker HOOL
2026-01-01 open Assets:Cash EUR
2026-01-01 open Equity:Opening EUR
2026-01-02 * "Buy"
  Assets:Broker 2 HOOL {{100 EUR}}
  Assets:Cash -200 EUR
2026-01-31 price EUR 1.25 USD
2026-01-31 price HOOL 150 USD
{older}"""
OLDER = "2026-01-10 price HOOL 100 EUR\n"


def _holdings(tmp_path: Path, text: str, *args: str) -> tuple[int, dict[str, object]]:
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings", "--conversion", "USD", *args)
    return proc.returncode, json.loads(proc.stdout or proc.stderr)


@pytest.mark.parametrize("older", [OLDER, ""], ids=["older-eur-quote", "usd-quote-only"])
@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_the_usd_quote_values_the_lot(tmp_path: Path, older: str, group_by: str) -> None:
    code, payload = _holdings(tmp_path, LEDGER.format(older=older), "--group-by", group_by)

    assert code == 0, payload
    data = payload["data"]
    (group,) = data["groups"]  # type: ignore[index]
    assert group["market_value"] == {"number": "300", "currency": "USD"}
    assert group["cost_basis"] == {"number": "250.00", "currency": "USD"}
    assert group["price"] == {"number": "150", "currency": "USD"}
    assert group["price_date"] == "2026-01-31"
    assert data["valuation"] == "complete"  # type: ignore[index]


def test_a_cost_currency_quote_still_values_a_lot_without_a_usd_quote(tmp_path: Path) -> None:
    text = LEDGER.format(older=OLDER).replace("2026-01-31 price HOOL 150 USD\n", "")

    code, payload = _holdings(tmp_path, text)

    assert code == 0, payload
    (group,) = payload["data"]["groups"]  # type: ignore[index]
    assert group["market_value"] == {"number": "250.00", "currency": "USD"}


NO_RATE = LEDGER.replace("2026-01-31 price EUR 1.25 USD\n", "")


@pytest.mark.parametrize("older", [OLDER, ""], ids=["older-eur-quote", "usd-quote-only"])
@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_a_known_usd_quote_survives_a_missing_basis_rate(tmp_path: Path, older: str, group_by: str) -> None:
    """Only the 200 EUR basis lacks a rate; the market value is a direct 300 USD (w5/1117)."""
    code, payload = _holdings(tmp_path, NO_RATE.format(older=older), "--group-by", group_by, "--allow-errors")

    assert code == 0, payload
    data = payload["data"]
    (group,) = data["groups"]  # type: ignore[index]
    assert group["market_value"] == {"number": "300", "currency": "USD"}
    assert group["cost_basis"] == {"number": "200", "currency": "EUR"}
    assert group["price"] == {"number": "150", "currency": "USD"}
    assert group["price_date"] == "2026-01-31"
    assert data["valuation"] == "partial"  # type: ignore[index]
    assert data["totals"]["market_value"] == {"USD": "300"}  # type: ignore[index]


def test_the_strict_report_still_fails_for_the_unconverted_basis(tmp_path: Path) -> None:
    code, _payload = _holdings(tmp_path, NO_RATE.format(older=""))

    assert code == 1


@pytest.mark.parametrize(("quote", "value"), [("0", "0"), ("-150", "-300")], ids=["zero", "negative"])
def test_a_zero_or_negative_direct_quote_is_still_a_known_quote(tmp_path: Path, quote: str, value: str) -> None:
    text = NO_RATE.format(older="").replace("price HOOL 150 USD", f"price HOOL {quote} USD")

    code, payload = _holdings(tmp_path, text, "--allow-errors")

    assert code == 0, payload
    (group,) = payload["data"]["groups"]  # type: ignore[index]
    assert group["market_value"] == {"number": value, "currency": "USD"}
    assert group["cost_basis"]["currency"] == "EUR"


def test_a_zero_net_unit_group_keeps_its_market_in_the_requested_currency(tmp_path: Path) -> None:
    text = (
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Cash EUR\n"
        '2024-01-01 open Assets:Broker HOOL "NONE"\n'
        "2024-01-01 open Equity:Opening EUR\n"
        '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 EUR\n  Equity:Opening -1000.00 EUR\n'
        '2024-01-02 * "Long"\n  Assets:Broker 1 HOOL {100.00 EUR, 2024-01-02, "Long"}\n  Assets:Cash -100.00 EUR\n'
        '2024-01-03 * "Short"\n  Assets:Broker -1 HOOL {80.00 EUR, 2024-01-03, "Short"}\n  Assets:Cash 80.00 EUR\n'
        "2024-01-31 price HOOL 150.00 USD\n"
    )

    code, payload = _holdings(tmp_path, text, "--allow-errors")

    assert code == 0, payload
    (group,) = payload["data"]["groups"]  # type: ignore[index]
    assert group["market_value"]["currency"] == "USD"
    assert float(group["market_value"]["number"]) == 0
    assert group["price"] == {"number": "150.00", "currency": "USD"}
    assert group["average_cost"] is None
