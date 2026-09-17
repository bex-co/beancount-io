"""Interval series follow the same partial-valuation policy as their headline (w3/374)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MULTI_UNIT = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Assets:Wallet EUR
2020-01-01 open Assets:Crypto BTC
2020-01-01 open Equity:Opening

2020-01-05 * "Seed USD"
  Assets:Cash        100.00 USD
  Equity:Opening

2020-02-05 * "Seed EUR"
  Assets:Wallet       50.00 EUR
  Equity:Opening

2020-03-05 * "Seed BTC"
  Assets:Crypto        0.5 BTC
  Equity:Opening
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
        timeout=60,
    )


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "multi-unit.bean"
    ledger.write_text(MULTI_UNIT)
    return ledger


def test_net_worth_series_is_unavailable_where_the_headline_is(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), "report", "balance-sheet", "--allow-errors")
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["valuation"] == "partial"
    assert data["net_worth"] == {"USD": None}
    series = {point["date"]: point["balance"] for point in data["net_worth_series"]}
    # January held USD only, so it converted; the later months kept EUR/BTC.
    assert series["2020-01-31"] == {"USD": "100.00"}
    assert series["2020-02-29"] == {"USD": None}
    assert series["2020-03-31"] == {"USD": None}


def test_text_never_pairs_an_unavailable_headline_with_per_unit_rows(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "report", "balance-sheet", "--allow-errors")
    assert result.returncode == 0, result.stderr
    assert "Net Worth: Unavailable USD" in result.stdout
    rows = [line for line in result.stdout.splitlines() if line.startswith("2020-0")]
    assert rows[0].startswith("2020-01-31") and "100.00 USD" in rows[0]
    assert all("Unavailable USD" in row for row in rows[1:])
    assert "BTC" not in "\n".join(rows)


def test_units_conversion_keeps_per_unit_series(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(_ledger(tmp_path)),
        "report",
        "balance-sheet",
        "-x",
        "units",
        "--allow-errors",
    )
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["valuation"] == "complete"
    last = data["net_worth_series"][-1]["balance"]
    assert last == {"BTC": "0.5", "EUR": "50.00", "USD": "100.00"}


def test_fully_valued_series_is_untouched(tmp_path: Path) -> None:
    ledger = tmp_path / "priced.bean"
    # Each row is valued at its own date, so the prices must precede the series.
    ledger.write_text(MULTI_UNIT + "\n2020-01-01 price EUR 1.10 USD\n2020-01-01 price BTC 8000.00 USD\n")
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", "balance-sheet")
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["valuation"] == "complete"
    assert all(point["balance"]["USD"] is not None for point in data["net_worth_series"])
