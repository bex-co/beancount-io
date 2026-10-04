"""`--account` interval series cover the whole report period (w1/051).

w3/292 bounded a filtered report's period by the whole ledger, so the headline
and `as_of` reached 2024-03-31. The interval ranges were still cut from the
account-filtered entries, so a Broker series stopped at the Broker's last
transaction (January) while its headline was valued on 2024-03-31, and an
income-statement breakdown for Food ended in January although the report said
"2024-01-05 through 2024-03-31".
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Assets:Broker
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Salary USD
2024-01-01 open Expenses:Food USD
2024-01-05 * "Opening"
  Assets:Bank  1000 USD
  Equity:Opening
2024-01-10 price STK 50 USD
2024-01-10 * "Buy"
  Assets:Broker  10 STK {50 USD}
  Assets:Bank   -500 USD
2024-01-20 * "Lunch"
  Expenses:Food  10 USD
  Assets:Bank
2024-03-15 * "Salary"
  Income:Salary -200 USD
  Assets:Bank
2024-03-31 price STK 70 USD
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


def _report(tmp_path: Path, *args: str) -> dict[str, Any]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", *args)
    assert result.returncode == 0, result.stderr or result.stdout
    data: dict[str, Any] = json.loads(result.stdout)["data"]
    return data


def test_filtered_balance_sheet_series_reaches_as_of(tmp_path: Path) -> None:
    data = _report(tmp_path, "balance-sheet", "-a", "Assets:Broker")

    assert data["as_of"] == "2024-03-31"
    assert data["net_worth"] == {"USD": "700"}
    assert data["net_worth_series"] == [
        {"date": "2024-01-31", "balance": {"USD": "500"}},
        {"date": "2024-02-29", "balance": {"USD": "500"}},
        {"date": "2024-03-31", "balance": {"USD": "700"}},
    ]


def test_filtered_income_statement_periods_cover_the_report_period(tmp_path: Path) -> None:
    data = _report(tmp_path, "income-statement", "-a", "Expenses:Food")

    assert data["period"] == {"start": "2024-01-05", "end_exclusive": "2024-04-01"}
    assert [(row["date"], row["net_profit"]) for row in data["periods"]] == [
        ("2024-01-31", {"USD": "-10"}),
        ("2024-02-29", {"USD": "0"}),
        ("2024-03-31", {"USD": "0"}),
    ]


def test_unfiltered_series_is_unchanged(tmp_path: Path) -> None:
    data = _report(tmp_path, "balance-sheet")

    assert [row["date"] for row in data["net_worth_series"]] == ["2024-01-31", "2024-02-29", "2024-03-31"]
    assert data["net_worth_series"][-1]["balance"] == {"USD": "1390"}
