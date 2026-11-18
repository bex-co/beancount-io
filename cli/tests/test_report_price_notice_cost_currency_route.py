"""The missing-price notice follows the route the valuation takes (w5/126).

A foreign-listed stock in a home-currency ledger is valued through its cost
currency (ACME → USD → EUR). The notice looked only at the direct ACME/EUR
pair, found nothing, and said "ACME has no EUR price at any date; shown in
units" directly above a balance sheet showing the holding in EUR — and, under
`--json`, as the error detail of a run whose `missing_price_dates` listed
January alone.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]

HEAD = """option "operating_currency" "{home}"
2026-01-01 open Assets:Bank
2026-01-01 open Assets:Broker
2026-01-01 open Equity:Opening

2026-01-02 * "opening"
  Assets:Bank  5000.00 {home}
  Equity:Opening
"""
BUY_ABROAD = """
2026-01-15 * "buy a US stock"
  Assets:Broker  10 ACME {100.00 USD}
  Assets:Bank  -800.00 EUR @@ 1000.00 USD
"""
ACME_QUOTES = """
2026-02-27 price ACME 110.00 USD
2026-03-31 price ACME 120.00 USD
"""
USD_QUOTES = """
2026-02-27 price USD 0.90 EUR
2026-03-31 price USD 0.95 EUR
"""
ROUTED = HEAD.replace("{home}", "EUR") + BUY_ABROAD + ACME_QUOTES + USD_QUOTES
# One leg only: ACME reaches USD, and USD never reaches EUR.
HALF_ROUTED = HEAD.replace("{home}", "EUR") + BUY_ABROAD + ACME_QUOTES
# Both legs are quoted, but a holding without a cost has no cost currency to
# go through, so no row ever converts.
COSTLESS = (
    HEAD.replace("{home}", "EUR")
    + """
2026-01-15 * "a grant of shares"
  Assets:Broker  10 ACME
  Equity:Opening
"""
    + ACME_QUOTES
    + USD_QUOTES
)
SINGLE_HOP = (
    HEAD.replace("{home}", "USD")
    + """
2026-01-15 * "buy a US stock"
  Assets:Broker  10 ACME {100.00 USD}
  Assets:Bank  -1000.00 USD
"""
    + ACME_QUOTES
)

ROUTED_LINE = "ACME → EUR has no price before 2026-02-27; earlier rows shown in ACME"
NEVER_LINE = "ACME has no EUR price at any date; shown in units"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _ledger(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def _partial(tmp_path: Path, ledger: Path, *command: str) -> dict[str, Any]:
    result = _bea(tmp_path, "--json", "--file", str(ledger), *command, "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    data: dict[str, Any] = json.loads(result.stdout)["data"]
    return data


def _refusal(tmp_path: Path, ledger: Path, *command: str) -> dict[str, Any]:
    result = _bea(tmp_path, "--json", "--file", str(ledger), *command)
    assert result.returncode == 1, result.stderr or result.stdout
    error: dict[str, Any] = json.loads(result.stderr)["error"]
    return error


def test_a_holding_valued_through_its_cost_currency_names_the_first_priced_date(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, ROUTED)

    text = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "--allow-errors")
    assert text.returncode == 0, text.stderr
    # The report the notice sits above: the holding is in EUR.
    assert "1,140.00 EUR" in text.stdout
    assert ROUTED_LINE in text.stderr.splitlines()
    assert "at any date" not in text.stderr

    sheet = _partial(tmp_path, ledger, "report", "balance-sheet")
    assert sheet["missing_price_summary"] == [ROUTED_LINE]
    assert sheet["missing_price_dates"] == [{"from": "ACME", "to": "EUR", "date": "2026-01-31"}]

    error = _refusal(tmp_path, ledger, "report", "balance-sheet")
    assert error["details"] == [ROUTED_LINE]
    assert error["result"]["missing_price_dates"] == [{"from": "ACME", "to": "EUR", "date": "2026-01-31"}]


def test_a_holding_no_route_ever_values_keeps_the_at_any_date_wording(tmp_path: Path) -> None:
    for name, text in (("half", HALF_ROUTED), ("costless", COSTLESS)):
        home = tmp_path / name
        home.mkdir()
        ledger = _ledger(home, text)

        sheet = _partial(home, ledger, "report", "balance-sheet")
        assert sheet["missing_price_summary"] == [NEVER_LINE], name
        # Every row is unvalued, the last one included.
        assert {"from": "ACME", "to": "EUR", "date": "2026-03-31"} in sheet["missing_price_dates"], name
        assert _refusal(home, ledger, "report", "balance-sheet")["details"] == [NEVER_LINE], name
        assert _partial(home, ledger, "balance")["missing_price_summary"] == [NEVER_LINE], name


def test_a_directly_quoted_holding_reads_as_before(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, SINGLE_HOP)
    line = "ACME → USD has no price before 2026-02-27; earlier rows shown in ACME"

    assert _partial(tmp_path, ledger, "report", "balance-sheet")["missing_price_summary"] == [line]
    assert _refusal(tmp_path, ledger, "report", "balance-sheet")["details"] == [line]


CAD_CASH = """option "operating_currency" "EUR"
2025-12-01 open Assets:CAD CAD
2025-12-01 open Equity:Opening

2025-12-02 * "Open"
  Assets:CAD  1000.00 CAD
  Equity:Opening

2026-01-01 price CAD 0.75 USD
2026-01-01 price USD 0.90 EUR

2026-02-01 * "Deposit"
  Assets:CAD  10.00 CAD
  Equity:Opening
"""
# A lot already at a cost in the target never routes through the quoted USD.
HOOL_AT_EUR_COST = """option "operating_currency" "EUR"
2025-12-01 open Assets:Broker
2025-12-01 open Equity:Opening

2025-12-02 * "Buy"
  Assets:Broker  5 HOOL {90.00 EUR}
  Equity:Opening

2026-01-01 price HOOL 120 USD
2026-01-01 price USD 0.90 EUR
"""


def test_a_period_before_the_route_names_no_date_for_a_holding_that_never_takes_it(tmp_path: Path) -> None:
    """Both legs of a route exist, but no lot is held at a cost in its middle currency (w5/557)."""
    for name, text, commodity in (("cash", CAD_CASH, "CAD"), ("eur-lot", HOOL_AT_EUR_COST, "HOOL")):
        home = tmp_path / name
        home.mkdir()
        ledger = _ledger(home, text)
        never = f"{commodity} has no EUR price at any date; shown in units"

        assert _partial(home, ledger, "balance", "-t", "2025-12")["missing_price_summary"] == [never], name
        assert _refusal(home, ledger, "report", "balance-sheet", "-t", "2025-12")["details"] == [never], name
        text_run = _bea(home, "--file", str(ledger), "balance", "-t", "2025-12", "--allow-errors")
        assert never in text_run.stderr.splitlines(), text_run.stderr


def test_the_routed_holding_before_its_route_still_names_the_date(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, ROUTED)

    assert ROUTED_LINE in _refusal(tmp_path, ledger, "report", "balance-sheet", "-t", "2026-01")["details"]


SOLD_USD_LOT = """option "operating_currency" "EUR"
2025-01-01 open Assets:Broker
2025-01-01 open Assets:Cash
2025-01-01 open Equity:Opening

2025-02-01 * "Buy at USD cost"
  Assets:Broker  5 HOOL {100.00 USD}
  Assets:Cash

2025-03-01 * "Sell it all"
  Assets:Broker  -5 HOOL {100.00 USD}
  Assets:Cash

2025-12-02 * "Buy at EUR cost"
  Assets:Broker  5 HOOL {90.00 EUR}
  Assets:Cash

2026-01-01 price HOOL 120 USD
2026-01-01 price USD 0.90 EUR
"""
LATER_USD_LOT = """option "operating_currency" "EUR"
2025-01-01 open Assets:Broker
2025-01-01 open Assets:Cash
2025-01-01 open Equity:Opening

2025-12-02 * "Buy at EUR cost"
  Assets:Broker  5 HOOL {90.00 EUR}
  Assets:Cash

2026-02-01 * "Buy at USD cost, after the period"
  Assets:Broker  5 HOOL {100.00 USD}
  Assets:Cash

2026-01-01 price HOOL 120 USD
2026-01-01 price USD 0.90 EUR
"""
SOLD_AND_HELD_USD_LOTS = """option "operating_currency" "EUR"
2025-01-01 open Assets:Broker
2025-01-01 open Assets:Cash
2025-01-01 open Equity:Opening

2025-02-01 * "Buy at USD cost"
  Assets:Broker  5 HOOL {100.00 USD}
  Assets:Cash

2025-03-01 * "Sell it all"
  Assets:Broker  -5 HOOL {100.00 USD}
  Assets:Cash

2025-12-01 * "Buy at USD cost again, and hold it"
  Assets:Broker  5 HOOL {100.00 USD}
  Assets:Cash  -450.00 EUR @@ 500.00 USD

2025-12-02 * "Buy at EUR cost"
  Assets:Broker  5 HOOL {90.00 EUR}
  Assets:Cash

2026-01-01 price HOOL 120 USD
2026-01-01 price USD 0.90 EUR
"""
HOOL_NEVER = "HOOL has no EUR price at any date; shown in units"
HOOL_ROUTED = "HOOL → EUR has no price before 2026-01-01; earlier rows shown in HOOL"
# The mixed ledger pays EUR for its held USD-cost lot, leaving a genuine USD
# conversion residual that stays unvalued in December.
# That ledger also holds a lot at a cost in EUR, which the USD route cannot
# value, so the route is qualified (w5/905).
HOOL_ROUTED_MIXED = (
    HOOL_ROUTED + "; from then only lots held at a cost in USD are valued, "
    "the others still need a direct HOOL → EUR price"
)


@pytest.mark.parametrize(
    ("text", "lines"),
    [
        (SOLD_USD_LOT, [HOOL_NEVER]),
        (LATER_USD_LOT, [HOOL_NEVER]),
        (SOLD_AND_HELD_USD_LOTS, [HOOL_ROUTED_MIXED]),
    ],
    ids=["sold-before-the-row", "bought-after-the-row", "one-held-one-sold"],
)
def test_a_route_counts_only_for_lots_held_unvalued(tmp_path: Path, text: str, lines: list[str]) -> None:
    """A USD-cost lot sold before the row, or bought after it, routes nothing (w5/748)."""
    ledger = _ledger(tmp_path, text)

    assert _partial(tmp_path, ledger, "balance", "-t", "2025-12")["missing_price_summary"] == lines
    # The sheet (w5/789) and the trial balance (w1/287) both fold the clamp's
    # conversion bookings into their adjustment, so neither shows — or warns
    # for — the USD residual of the 2025-12-01 exchange.
    assert _refusal(tmp_path, ledger, "report", "balance-sheet", "-t", "2025-12")["details"] == lines
    shown = _bea(tmp_path, "--file", str(ledger), "balance", "-t", "2025-12", "--allow-errors")
    for line in lines:
        assert line in shown.stderr.splitlines(), shown.stderr
