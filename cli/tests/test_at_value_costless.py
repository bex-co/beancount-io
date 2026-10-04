"""at_value must price costless @ lots when a price exists (w3/241)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Investments:HOOL HOOL
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
2024-03-01 price HOOL 10.5 USD
2024-03-03 * "buy"
  Assets:Investments:HOOL  2 HOOL @ 10.5 USD
  Assets:Bank:Checking
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
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
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_at_value_prices_costless_lots(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    at_value = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "--conversion", "at_value")
    assert at_value.returncode == 0, at_value.stderr
    assert "Investments" in at_value.stdout
    assert "21.0 USD" in at_value.stdout
    # Priced costless lots should not leave bare HOOL on the asset line.
    investments = at_value.stdout.split("Investments", 1)[1].split("Liabilities", 1)[0]
    assert "HOOL" not in investments or "21.0 USD" in investments
    assert "2 HOOL" not in investments

    usd = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "--conversion", "USD")
    assert usd.returncode == 0, usd.stderr
    assert "21.0 USD" in usd.stdout


HEADER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Equity:Opening
2024-01-02 * "Opening"
  Assets:Bank  1000.00 USD
  Equity:Opening
"""

HOOL_BUY = """2024-01-01 open Assets:Hool HOOL
2024-01-03 * "buy"
  Assets:Hool  2 HOOL @ 10.00 USD
  Assets:Bank
"""


def _at_value_assets(tmp_path: Path, ledger_text: str, conversion: str = "at_value") -> dict[str, dict[str, str]]:
    ledger = tmp_path / "ledger.bean"
    ledger.write_text(ledger_text)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "balance", "Assets", "-x", conversion)
    assert result.returncode == 0, result.stderr
    children = json.loads(result.stdout)["data"]["assets"]["children"]
    return {child["account"]: child["balance"] for child in children}


def test_at_value_keeps_operating_currency_when_it_is_quoted(tmp_path: Path) -> None:
    """A `price USD ... CAD` must not revalue USD cash into CAD (w1/050)."""
    ledger_text = (
        HEADER
        + """2024-01-01 open Assets:Cad CAD
2024-01-03 * "CAD"
  Assets:Cad  135.00 CAD
  Equity:Opening
2024-01-31 price USD 1.35 CAD
"""
    )
    balances = _at_value_assets(tmp_path, ledger_text)
    assert balances["Assets:Bank"] == {"USD": "1000.00"}
    # CAD is valued through the inverse USD quote, exactly as `-x USD` does.
    assert balances["Assets:Cad"] == _at_value_assets(tmp_path, ledger_text, "USD")["Assets:Cad"]
    assert set(balances["Assets:Cad"]) == {"USD"}


@pytest.mark.parametrize("eur_first", [True, False])
def test_at_value_prefers_operating_currency_quote(tmp_path: Path, *, eur_first: bool) -> None:
    """Cost-less HOOL is valued in USD whichever quote was seen first (w1/050)."""
    if eur_first:
        prices = "2024-01-05 price HOOL 9.00 EUR\n2024-01-06 price HOOL 11.00 USD\n"
    else:
        prices = "2024-01-05 price HOOL 11.00 USD\n2024-01-06 price HOOL 9.00 EUR\n"
    balances = _at_value_assets(tmp_path, HEADER + HOOL_BUY + prices)
    assert balances["Assets:Hool"] == {"USD": "22.00"}


def test_at_value_leaves_units_without_operating_currency_quote(tmp_path: Path) -> None:
    """With only a non-operating quote, keep units instead of an arbitrary pair (w1/050)."""
    balances = _at_value_assets(tmp_path, HEADER + HOOL_BUY + "2024-01-05 price HOOL 9.00 EUR\n")
    assert balances["Assets:Hool"] == {"HOOL": "2"}
