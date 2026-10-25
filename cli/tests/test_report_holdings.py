"""`bea-engine report --kind holdings`: lot-groups with cost and market value (w22/m3/t001).

Upstream Fava renders holdings client-side, so there is no holdings module
to wrap; the engine composes the vendored tree, costed inventories, and
price map instead. Each group carries units, average cost, cost basis, and
market value; lots without cost are cash and stay out.
"""

from __future__ import annotations

import json
import os
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any

CLI_ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-03 * "Buy more"
  Assets:Brokerage  5 VTI {160 USD}
  Assets:Checking
2026-01-10 price VTI 170 USD
"""

TWO_ACCOUNTS = (
    LEDGER
    + """\
2026-01-01 open Assets:IRA USD,VTI
2026-01-04 * "IRA buy"
  Assets:IRA  20 VTI {140 USD}
  Assets:Checking
"""
)

NOPRICE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
"""

FX = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage EUR,VTI,USD
2026-01-01 open Assets:Checking USD,EUR
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {140 EUR}
  Assets:Checking
2026-01-10 price VTI 150 EUR
2026-01-10 price EUR 1.10 USD
"""

FX_NORATE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage EUR,VTI,USD
2026-01-01 open Assets:Checking USD,EUR
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {140 EUR}
  Assets:Checking
2026-01-10 price VTI 150 EUR
"""

SOLD_OUT = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Gains USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-03 * "Sell it all"
  Assets:Brokerage  -10 VTI {150 USD} @ 160 USD
  Assets:Checking  1600 USD
  Income:Gains  -100 USD
2026-01-10 price VTI 170 USD
"""


def _engine(ledger: Path, *args: str) -> dict[str, Any]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            "holdings",
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True, payload
    return payload["data"]


def _engine_raw(ledger: Path, *args: str) -> tuple[int, dict[str, Any]]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            "holdings",
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    return proc.returncode, json.loads(proc.stdout)


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def test_holdings_hand_computed(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER))
    assert data["group_by"] == "account"
    assert data["valuation"] == "complete"
    (group,) = data["groups"]
    assert group["account"] == "Assets:Brokerage"
    assert group["commodity"] == "VTI"
    assert group["units"] == {"number": "15", "currency": "VTI"}
    assert Decimal(group["average_cost"]["number"]) == Decimal(2300) / Decimal(15)
    assert group["average_cost"]["currency"] == "USD"
    assert group["cost_basis"] == {"number": "2300", "currency": "USD"}
    assert group["market_value"] == {"number": "2550", "currency": "USD"}
    assert group["price"] == {"number": "170", "currency": "USD"}
    assert group["price_date"] == "2026-01-10"
    assert data["totals"] == {"cost_basis": {"USD": "2300"}, "market_value": {"USD": "2550"}}


def test_holdings_leaves_cash_out(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER))
    assert [group["account"] for group in data["groups"]] == ["Assets:Brokerage"]


def test_holdings_group_by_commodity_merges_accounts(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, TWO_ACCOUNTS), "--group-by", "commodity")
    assert data["group_by"] == "commodity"
    (group,) = data["groups"]
    assert group["accounts"] == ["Assets:Brokerage", "Assets:IRA"]
    assert group["units"] == {"number": "35", "currency": "VTI"}
    assert group["cost_basis"] == {"number": "5100", "currency": "USD"}
    assert group["market_value"] == {"number": "5950", "currency": "USD"}


def test_holdings_unpriced_fails_strict(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, NOPRICE))
    assert code == 1
    assert payload["ok"] is False
    assert payload["error"]["result"] == {
        "missing_prices": [{"from": "VTI", "to": "USD"}],
        "missing_price_dates": [{"from": "VTI", "to": "USD", "date": None}],
    }
    assert payload["error"]["details"] == ["VTI has no USD price at any date; valued at cost"]


def test_holdings_unpriced_values_at_cost_when_allowed(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, NOPRICE), "--allow-errors")
    assert data["valuation"] == "partial"
    (group,) = data["groups"]
    assert group["market_value"] == {"number": "1500", "currency": "USD"}
    assert group["price"] is None
    assert group["price_date"] is None
    assert data["missing_price_summary"] == ["VTI has no USD price at any date; valued at cost"]


def test_holdings_converts_to_target_currency(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, FX))
    (group,) = data["groups"]
    assert group["average_cost"] == {"number": "154.00", "currency": "USD"}
    assert group["cost_basis"] == {"number": "1540.00", "currency": "USD"}
    assert group["market_value"] == {"number": "1650.00", "currency": "USD"}
    assert group["price"] == {"number": "165.00", "currency": "USD"}
    assert group["price_date"] == "2026-01-10"


def test_holdings_stays_native_under_units(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, FX), "--conversion", "units")
    (group,) = data["groups"]
    assert group["cost_basis"] == {"number": "1400", "currency": "EUR"}
    assert group["market_value"] == {"number": "1500", "currency": "EUR"}


def test_holdings_missing_conversion_leg(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, FX_NORATE))
    assert code == 1
    assert payload["error"]["result"]["missing_prices"] == [{"from": "EUR", "to": "USD"}]
    data = _engine(_write(tmp_path, FX_NORATE), "--allow-errors")
    assert data["valuation"] == "partial"
    (group,) = data["groups"]
    assert group["cost_basis"] == {"number": "1400", "currency": "EUR"}
    assert group["market_value"] == {"number": "1500", "currency": "EUR"}


def test_holdings_unknown_grouping_is_usage_error(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, LEDGER), "--group-by", "bogus")
    assert code == 2
    assert payload["error"]["message"] == "Unknown grouping 'bogus'. Choose one of: account, commodity."


def test_holdings_account_filter_prunes_counterparties(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LEDGER), "--account", "Assets:Checking")
    assert data["groups"] == []
    assert data["totals"] == {"cost_basis": {}, "market_value": {}}
    assert data["valuation"] == "complete"


def test_holdings_sold_out_position_drops_out(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, SOLD_OUT))
    assert data["groups"] == []


LATE_PRICE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-10 price VTI 170 USD
2026-02-10 price VTI 190 USD
"""


def test_holdings_values_at_the_period_end(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LATE_PRICE)
    whole = _engine(ledger)
    assert whole["groups"][0]["market_value"] == {"number": "1900", "currency": "USD"}
    assert whole["groups"][0]["price_date"] == "2026-02-10"
    january = _engine(ledger, "--time", "2026-01")
    assert january["groups"][0]["market_value"] == {"number": "1700", "currency": "USD"}
    assert january["groups"][0]["price_date"] == "2026-01-10"


MIXED_COST = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage EUR,VTI,USD
2026-01-01 open Assets:Checking USD,EUR
2026-01-02 * "Buy dollars"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-03 * "Buy euros"
  Assets:Brokerage  10 VTI {140 EUR}
  Assets:Checking
2026-01-10 price VTI 170 USD
2026-01-10 price VTI 150 EUR
"""


def test_holdings_splits_cost_currencies(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, MIXED_COST), "--conversion", "units")
    assert [(group["cost_basis"], group["market_value"]) for group in data["groups"]] == [
        ({"number": "1400", "currency": "EUR"}, {"number": "1500", "currency": "EUR"}),
        ({"number": "1500", "currency": "USD"}, {"number": "1700", "currency": "USD"}),
    ]
    assert data["totals"] == {
        "cost_basis": {"EUR": "1400", "USD": "1500"},
        "market_value": {"EUR": "1500", "USD": "1700"},
    }
