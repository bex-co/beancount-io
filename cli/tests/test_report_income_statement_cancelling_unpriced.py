"""A period's net profit is known when its unpriced income and expense cancel (w5/940).

The headline and the balance sheet judged the combined profit, but each period
row marked its net profit unavailable whenever its income or its expenses held
an unpriced commodity, even when the two cancelled to nothing.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea

HEADER = """option "operating_currency" "USD"
2024-01-01 open Income:Gift GOLD
2024-01-01 open Expenses:Gift GOLD
2024-01-01 open Income:Salary USD
2024-01-01 open Expenses:Fee USD
2024-01-01 open Assets:Cash USD
"""
GIFT = """2024-02-01 * "Gift received and consumed"
  Income:Gift -10.00 GOLD
  Expenses:Gift 10.00 GOLD
"""
WORK = """2024-02-01 * "Work less fee"
  Income:Salary -25.00 USD
  Expenses:Fee 5.00 USD
  Assets:Cash 20.00 USD
"""


def _report(tmp_path: Path, body: str, *args: str, time: str = "2024-02") -> dict[str, object]:
    (tmp_path / "main.bean").write_text(HEADER + body)
    result = _bea(
        tmp_path, "report", "income-statement", "--time", time, "--conversion", "USD", "--allow-errors", *args
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


def test_cancelling_unpriced_commodities_leave_the_known_profit(tmp_path: Path) -> None:
    data = _report(tmp_path, GIFT + WORK)

    assert data["net_profit"] == {"USD": "20.00"}
    assert [period["net_profit"] for period in data["periods"]] == [{"USD": "20.00"}]  # type: ignore[attr-defined]
    assert data["valuation"] == "partial"
    assert data["periods"][0]["income"]["GOLD"] == "-10.00"  # type: ignore[index]


def test_a_period_that_nets_to_nothing_reports_zero(tmp_path: Path) -> None:
    data = _report(tmp_path, GIFT)

    (net,) = (period["net_profit"] for period in data["periods"])  # type: ignore[attr-defined]
    assert set(net) == {"USD"} and float(net["USD"]) == 0


def test_a_residual_unpriced_amount_keeps_the_profit_unavailable(tmp_path: Path) -> None:
    residual = GIFT.replace("Expenses:Gift 10.00 GOLD", "Expenses:Gift 9.00 GOLD") + "  Assets:Cash 1.00 GOLD\n"

    data = _report(tmp_path, residual + WORK)

    assert [period["net_profit"] for period in data["periods"]] == [{"USD": None}]  # type: ignore[attr-defined]


def test_an_income_only_filter_stays_unavailable(tmp_path: Path) -> None:
    data = _report(tmp_path, GIFT + WORK, "--account", "Income")

    assert [period["net_profit"] for period in data["periods"]] == [{"USD": None}]  # type: ignore[attr-defined]


def test_separate_months_keep_their_own_residuals(tmp_path: Path) -> None:
    january = GIFT.replace("2024-02-01", "2024-01-15").replace("Expenses:Gift 10.00 GOLD", "Assets:Cash 10.00 GOLD")
    february = GIFT.replace("Income:Gift -10.00 GOLD", "Assets:Cash -10.00 GOLD")

    data = _report(tmp_path, january + february + WORK, "--interval", "monthly", time="2024-01 - 2024-02")

    profits = {str(period["date"]): period["net_profit"] for period in data["periods"]}  # type: ignore[attr-defined]
    assert profits["2024-01-31"] == {"USD": None}
    assert profits["2024-02-29"] == {"USD": None}
