"""A parent whose children cancel reports zero, not "no balance" (w3/357)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEAD = """option "operating_currency" "USD"
2020-01-01 open Assets:Investments:FundA
2020-01-01 open Assets:Investments:FundB
2020-01-01 open Assets:Cash USD
2020-01-01 open Equity:Opening

2020-01-02 * "Seed cash"
  Assets:Cash        10000.00 USD
  Equity:Opening
"""
OFFSETTING_COSTS = (
    HEAD
    + """
2020-02-01 * "Buy FundA"
  Assets:Investments:FundA   100 AAA {100.00 USD}
  Assets:Cash             -10000.00 USD

2020-03-01 * "Short FundB"
  Assets:Investments:FundB  -100 BBB {100.00 USD}
  Assets:Cash              10000.00 USD
"""
)
OFFSETTING_UNITS = (
    HEAD
    + """
2020-02-01 * "Long AAA"
  Assets:Investments:FundA   100 AAA {100.00 USD}
  Assets:Cash             -10000.00 USD

2020-03-01 * "Short AAA"
  Assets:Investments:FundB  -100 AAA {100.00 USD}
  Assets:Cash              10000.00 USD
"""
)


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


def _assets(tmp_path: Path, ledger_text: str, conversion: str) -> dict:
    ledger = tmp_path / "main.bean"
    ledger.write_text(ledger_text)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "report", "balance-sheet", "-x", conversion)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]


def _node(tree: dict, account: str) -> dict:
    if tree["account"] == account:
        return tree
    for child in tree["children"]:
        found = _node(child, account)
        if found is not None:
            return found
    return None  # type: ignore[return-value]


def test_offsetting_cost_bases_roll_up_to_zero(tmp_path: Path) -> None:
    data = _assets(tmp_path, OFFSETTING_COSTS, "at_cost")
    investments = _node(data["assets"], "Assets:Investments")
    assert investments["balance_children"] == {"USD": "0"}
    assert _node(data["assets"], "Assets:Investments:FundA")["balance"] == {"USD": "10000.00"}
    assert _node(data["assets"], "Assets:Investments:FundB")["balance"] == {"USD": "-10000.00"}


def test_offsetting_units_roll_up_to_zero(tmp_path: Path) -> None:
    data = _assets(tmp_path, OFFSETTING_UNITS, "units")
    assert _node(data["assets"], "Assets:Investments")["balance_children"] == {"AAA": "0"}


def test_the_text_tree_shows_the_zero(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(OFFSETTING_COSTS)
    result = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "-x", "at_cost")
    assert result.returncode == 0, result.stderr
    line = next(line for line in result.stdout.splitlines() if line.strip().startswith("Investments"))
    assert "0.00 USD" in line


def test_an_account_with_no_balance_still_reads_empty(tmp_path: Path) -> None:
    data = _assets(tmp_path, OFFSETTING_COSTS, "at_cost")
    assert data["liabilities"]["balance_children"] == {}
    # The parent itself holds no postings; only its rollup cancelled.
    assert _node(data["assets"], "Assets:Investments")["balance"] == {}


def test_a_funded_parent_is_unchanged(tmp_path: Path) -> None:
    data = _assets(tmp_path, OFFSETTING_COSTS, "at_cost")
    assert data["assets"]["balance_children"] == {"USD": "10000.00"}


# w1/072: a plain currency nets to zero before conversion sees it, and the
# filtered views recompute totals from the kept children; both read `—`.
PLAIN_CANCEL = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food:Groceries USD
2024-01-01 open Expenses:Food:Refunds USD
2024-01-01 open Equity:Opening
2024-01-02 * "fund"
  Assets:Cash 100.00 USD
  Equity:Opening
2024-01-03 * "buy"
  Expenses:Food:Groceries 10.00 USD
  Assets:Cash
2024-01-04 * "refund"
  Expenses:Food:Refunds -10.00 USD
  Assets:Cash
"""
OFFSETTING_LOTS = """option "operating_currency" "USD"
option "booking_method" "NONE"
2024-01-01 open Assets:Inv:Long
2024-01-01 open Assets:Inv:Short
2024-01-02 * "lots"
  Assets:Inv:Long 5 STK {10.00 USD}
  Assets:Inv:Short -5 STK {10.00 USD}
"""


def _json(tmp_path: Path, ledger_text: str, *args: str) -> dict:
    ledger = tmp_path / "main.bean"
    ledger.write_text(ledger_text)
    result = _bea(tmp_path, "--json", "--file", str(ledger), *args)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]


def test_cancelling_plain_currency_children_roll_up_to_zero(tmp_path: Path) -> None:
    for args in (
        ("report", "income-statement"),
        ("report", "income-statement", "-a", "Expenses:Food"),
        ("balance", "Food"),
    ):
        expenses = _json(tmp_path, PLAIN_CANCEL, *args)["expenses"]
        assert expenses["balance_children"] == {"USD": "0"}, args
        assert _node(expenses, "Expenses:Food")["balance_children"] == {"USD": "0"}, args
        assert _node(expenses, "Expenses:Food:Groceries")["balance_children"] == {"USD": "10.00"}, args


def test_cancelling_lots_roll_up_to_zero_in_filtered_views(tmp_path: Path) -> None:
    for args in (
        ("balance", "Inv", "-x", "at_cost"),
        ("report", "trial-balance", "-a", "Assets:Inv", "-x", "at_cost"),
        ("report", "balance-sheet", "-a", "Assets:Inv", "-x", "at_cost"),
    ):
        assets = _json(tmp_path, OFFSETTING_LOTS, *args)["assets"]
        assert _node(assets, "Assets:Inv")["balance_children"] == {"USD": "0"}, args


def test_the_text_tree_shows_a_plain_currency_zero(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(PLAIN_CANCEL)
    result = _bea(tmp_path, "--file", str(ledger), "report", "income-statement")
    assert result.returncode == 0, result.stderr
    line = next(line for line in result.stdout.splitlines() if line.strip().startswith("Food"))
    assert "0.00 USD" in line
