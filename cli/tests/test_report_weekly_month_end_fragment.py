"""A calendar-month filter's clipped trailing week is a period only when it has entries (w3/375)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2019-12-01 open Assets:Cash USD
2019-12-01 open Income:Job USD
2019-12-01 open Expenses:Food USD

2020-03-03 * "Pay"
  Income:Job    -1000.00 USD
  Assets:Cash    1000.00 USD

2020-03-12 * "Groceries"
  Expenses:Food   50.00 USD
  Assets:Cash    -50.00 USD

2020-12-31 * "Year-end lunch"
  Expenses:Food   20.00 USD
  Assets:Cash    -20.00 USD
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
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _json(tmp_path: Path, *args: str) -> dict:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]


def test_quiet_month_end_fragment_is_not_a_weekly_period(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "income-statement", "-t", "2020-03", "-i", "weekly")
    dates = [period["date"] for period in data["periods"]]
    # 2020-03-30/31 are a Mon-Tue tail of an ISO week running into April, with
    # nothing in them: the March breakdown ends on the last full week instead.
    assert dates[-1] == "2020-03-29"
    assert "2020-03-31" not in dates


def test_month_end_fragment_with_activity_stays(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "income-statement", "-t", "2020-12", "-i", "weekly")
    periods = {period["date"]: period for period in data["periods"]}
    assert "2020-12-31" in periods
    assert periods["2020-12-31"]["expenses"] == {"USD": "20.00"}


def test_balance_series_still_reach_the_as_of_date(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "balance-sheet", "-t", "2020-03", "-i", "weekly")
    assert data["as_of"] == "2020-03-31"
    assert data["net_worth_series"][-1]["date"] == "2020-03-31"


def test_overview_table_keeps_every_valuation_date(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "overview", "-t", "2020-03", "-i", "weekly")
    assert [point["date"] for point in data["series"]["assets"]][-1] == "2020-03-31"
    assert [point["date"] for point in data["series"]["income"]][-1] == "2020-03-29"

    table = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "report", "overview", "-t", "2020-03", "-i", "weekly")
    assert table.returncode == 0, table.stderr
    rows = [line for line in table.stdout.splitlines() if line.startswith("2020-03-")]
    assert rows[-1].startswith("2020-03-31")
    # The balance columns are still filled on the as-of row; the flows are blank.
    assert "950.00 USD" in rows[-1]


def test_a_sole_quiet_fragment_is_still_reported(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "income-statement", "-t", "2020-03-30 - 2020-03-31", "-i", "weekly")
    assert [period["date"] for period in data["periods"]] == ["2020-03-31"]


def test_unfiltered_weekly_series_is_unchanged(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "income-statement", "-i", "weekly")
    dates = [period["date"] for period in data["periods"]]
    # Whole intervals only, so nothing is dropped at either end.
    assert dates[0] == "2020-03-08"
    assert dates[-1] == "2021-01-03"
