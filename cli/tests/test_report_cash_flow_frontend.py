"""`bea report cash-flow` text and JSON (w21/m4/t004).

Sections render per activity with subtotals, then the net/opening/closing
cash lines and the cash-accounts answer; --json carries the same figures.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Bank:Savings USD
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD
2026-01-05 * "Opening"
  Assets:Bank:Checking  4000.00 USD
  Equity:Opening
2026-01-06 * "Salary"
  Assets:Bank:Checking  3000.00 USD
  Income:Salary        -3000.00 USD
2026-01-10 * "Groceries"
  Assets:Bank:Checking  -78.20 USD
  Expenses:Food           78.20 USD
2026-01-15 * "Transfer to savings"
  Assets:Bank:Checking  -500.00 USD
  Assets:Bank:Savings    500.00 USD
"""

WEIRD_ROLE = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Assets:Weird USD
  cash-flow-role: "Cash"
2026-01-01 open Income:Salary USD
2026-01-05 * "Seed"
  Assets:Bank:Checking  1000.00 USD
  Income:Salary
2026-01-08 * "Weird one"
  Assets:Weird  10.00 USD
  Assets:Bank:Checking
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return bea(list(args), tmp_path)


def test_cash_flow_text_table(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    assert "Cash Flow — 2026-01-05 through 2026-01-15" in proc.stdout
    assert "Valuation: at_cost; account: all" in proc.stdout
    assert "positive for an inflow" in proc.stdout
    assert "Operating" in proc.stdout
    assert "Income:Salary" in proc.stdout
    assert "Financing" in proc.stdout
    assert "Investing" not in proc.stdout
    assert "Total operating:" in proc.stdout
    assert "2,921.80 USD" in proc.stdout
    assert "Net change in cash:" in proc.stdout
    assert "6,921.80 USD" in proc.stdout
    assert "Opening cash:" in proc.stdout
    assert "Closing cash:" in proc.stdout
    assert "Cash accounts: Assets:Bank:Checking, Assets:Bank:Savings" in proc.stdout


def test_cash_flow_json_matches_table(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    data = payload["data"]
    assert data["row_signs"] == "positive_for_inflow"
    assert data["net_change"] == {"USD": "6921.80"}
    assert data["opening"] == {"USD": "0.00"}
    assert data["closing"] == {"USD": "6921.80"}
    assert "display_precision" not in data


def test_cash_flow_help_documents_every_option(tmp_path: Path) -> None:
    proc = _bea(tmp_path, "report", "cash-flow", "--help")
    assert proc.returncode == 0, proc.stderr
    for flag in ("--time", "--account", "--from-date", "--to-date", "--allow-errors"):
        assert flag in proc.stdout
    assert "Cash-flow entries on or after YYYY-MM-DD." in proc.stdout
    assert "--conversion" not in proc.stdout


def test_cash_flow_empty_period(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", "--time", "2025")
    assert proc.returncode == 0, proc.stderr
    assert "No cash flows in this period." in proc.stdout
    assert "Net change in cash:" in proc.stdout


def test_cash_flow_invalid_role_is_noted(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, WEIRD_ROLE)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    assert "Assets:Weird: unknown cash-flow-role value 'Cash'; using the default." in proc.stderr + proc.stdout
