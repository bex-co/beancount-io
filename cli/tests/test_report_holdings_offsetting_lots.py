"""Holdings keep lots that are still held when their units net to zero (w5/947).

`--group-by commodity` summed +2 HOOL long and -2 HOOL short to 0 HOOL and
called the group fully sold: `groups: []`, empty totals, `No holdings.`, and
the -40 USD cost basis vanished. Only a group none of whose lots is held is
left out.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_report_holdings_register_frontend import _bea, _write

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Long HOOL
2026-01-01 open Assets:Short HOOL
2026-01-01 open Assets:Cash USD
2026-01-01 open Income:Gains USD
2026-01-01 open Equity:Opening USD
2026-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
2026-01-02 * "Buy long"
  Assets:Long 2 HOOL {100 USD}
  Assets:Cash -200 USD
2026-01-03 * "Open short"
  Assets:Short -2 HOOL {120 USD}
  Assets:Cash 240 USD
2026-01-31 price HOOL 150 USD
"""
DRAINED = """2026-01-04 * "Close long"
  Assets:Long -2 HOOL {100 USD} @ 150 USD
  Assets:Cash 300 USD
  Income:Gains -100 USD
2026-01-05 * "Cover short"
  Assets:Short 2 HOOL {120 USD} @ 150 USD
  Assets:Cash -300 USD
  Income:Gains 60 USD
"""


def _holdings(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings", *args)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


def test_offsetting_lots_across_accounts_stay_in_a_commodity_group(tmp_path: Path) -> None:
    data = _holdings(tmp_path, LEDGER, "--group-by", "commodity")

    (group,) = data["groups"]  # type: ignore[misc]
    assert group["accounts"] == ["Assets:Long", "Assets:Short"]
    assert group["units"] == {"number": "0", "currency": "HOOL"}
    assert group["average_cost"] is None
    assert group["cost_basis"] == {"number": "-40", "currency": "USD"}
    assert data["totals"] == {"cost_basis": {"USD": "-40"}, "market_value": {"USD": "0"}}


def test_the_account_grouping_totals_agree(tmp_path: Path) -> None:
    data = _holdings(tmp_path, LEDGER)

    assert [group["account"] for group in data["groups"]] == ["Assets:Long", "Assets:Short"]  # type: ignore[attr-defined]
    assert data["totals"] == {"cost_basis": {"USD": "-40"}, "market_value": {"USD": "0"}}


def test_the_human_table_shows_the_zero_unit_group(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--group-by", "commodity")

    assert proc.returncode == 0, proc.stderr
    assert "No holdings." not in proc.stdout
    assert "HOOL" in proc.stdout and "—" in proc.stdout


@pytest.mark.parametrize("group_by", ["account", "commodity"])
def test_lots_actually_sold_and_covered_are_left_out(tmp_path: Path, group_by: str) -> None:
    data = _holdings(tmp_path, LEDGER + DRAINED, "--group-by", group_by)

    assert data["groups"] == []
