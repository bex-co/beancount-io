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
    # A filter that splits a transaction is refused, not reported (w5/1050).
    assert "only some" in proc.stdout and "legs of a transaction" in proc.stdout
    assert "--conversion" not in proc.stdout


def test_cash_flow_empty_period(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", "--time", "2025")
    assert proc.returncode == 0, proc.stderr
    assert "No cash flows in this period." in proc.stdout
    assert "Net change in cash:" in proc.stdout


NOCASH = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Income:Gains USD
2026-01-05 * "Grant"
  Assets:Brokerage  10 VTI {100 USD}
  Income:Gains  -1000 USD
"""


NO_CASH_NOTE = (
    "No account counts as cash: none is an Assets account named like Cash, Checking, Savings or Bank, "
    'or one whose open declares cash-flow-role: "cash". Add cash-flow-role: "cash" under the open of each '
    "bank or wallet account, then run the report again."
)

# The bank is named after the institution, so no name pattern makes it cash.
REVOLUT = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Revolut USD
2026-01-01 open Income:Salary USD
2026-01-01 open Expenses:Rent USD
2026-01-15 * "Employer" "Pay"
  Assets:Revolut  3000.00 USD
  Income:Salary
2026-01-20 * "Landlord" "Rent"
  Expenses:Rent  1200.00 USD
  Assets:Revolut
"""

RENAMED_ROOTS = """\
option "operating_currency" "USD"
option "name_assets" "Activos"
option "name_liabilities" "Pasivos"
option "name_equity" "Patrimonio"
option "name_income" "Ingresos"
option "name_expenses" "Gastos"
2026-01-01 open Activos:Banco:Cuenta USD
2026-01-01 open Ingresos:Salario USD
2026-01-15 * "Empleador" "Pago"
  Activos:Banco:Cuenta  3000.00 USD
  Ingresos:Salario
"""


def _assert_no_cash_explained(proc: subprocess.CompletedProcess[str]) -> None:
    """The empty cash set is explained on stderr, never read as a quiet period (w1/319)."""
    assert proc.returncode == 0, proc.stderr
    assert NO_CASH_NOTE in proc.stderr
    assert "No account counts as cash" not in proc.stdout
    assert "No cash flows in this period." not in proc.stdout + proc.stderr
    assert "Cash accounts:" not in proc.stdout


def test_cash_flow_without_cash_accounts(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, NOCASH)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    _assert_no_cash_explained(proc)
    # No transaction without a cash leg is cash activity (w1/268).
    assert "Operating" not in proc.stdout
    assert "Net change in cash:" in proc.stdout


def test_cash_flow_bank_named_after_institution_is_explained(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, REVOLUT)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    _assert_no_cash_explained(proc)
    assert "Net change in cash:  —" in proc.stdout
    assert "Closing cash:        —" in proc.stdout


def test_cash_flow_renamed_roots_without_cash_is_explained(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, RENAMED_ROOTS)
    _assert_no_cash_explained(_bea(tmp_path, "--file", str(ledger), "report", "cash-flow"))


def test_cash_flow_csv_without_cash_accounts_notes_on_stderr(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, REVOLUT)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", "--format", "csv")
    _assert_no_cash_explained(proc)
    assert proc.stdout.splitlines()[0] == "section,item,date,currency,amount"
    assert "net_change,net_change,,," in proc.stdout


def test_cash_flow_json_without_cash_accounts_is_unchanged(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, REVOLUT)
    proc = _bea(tmp_path, "--json", "--file", str(ledger), "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    assert "No account counts as cash" not in proc.stdout + proc.stderr
    data = json.loads(proc.stdout)["data"]
    assert data["cash_accounts"] == []
    assert data["net_change"] == {} and data["opening"] == {} and data["closing"] == {}


def test_cash_flow_declared_role_makes_named_bank_cash(tmp_path: Path) -> None:
    declared = REVOLUT.replace(
        "2026-01-01 open Assets:Revolut USD\n", '2026-01-01 open Assets:Revolut USD\n  cash-flow-role: "cash"\n'
    )
    ledger = write_ledger(tmp_path, declared)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    assert "No account counts as cash" not in proc.stderr
    assert "Income:Salary" in proc.stdout and "1,800.00 USD" in proc.stdout
    assert "Cash accounts: Assets:Revolut" in proc.stdout


def test_cash_flow_filter_without_cash_account_names_the_filter(tmp_path: Path) -> None:
    # The ledger has a cash account; the filter leaves it out. The note must
    # not claim the ledger has none.
    ledger = write_ledger(tmp_path, LEDGER + NOCASH.removeprefix('option "operating_currency" "USD"\n'))
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", "--account", "Assets:Brokerage")
    assert proc.returncode == 0, proc.stderr
    assert "No cash account matches Assets:Brokerage: a cash account is an Assets account named like" in proc.stderr
    assert "Widen --account to keep one" in proc.stderr
    assert "No account counts as cash" not in proc.stderr
    assert "No cash flows in this period." not in proc.stdout


def test_cash_flow_filter_matching_nothing_keeps_its_own_note(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow", "--account", "Liabilities")
    assert proc.returncode == 0, proc.stderr
    assert "No accounts match Liabilities." in proc.stderr
    assert "No cash account" not in proc.stderr
    assert "No account counts as cash" not in proc.stderr


def test_cash_flow_invalid_role_is_noted(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, WEIRD_ROLE)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "cash-flow")
    assert proc.returncode == 0, proc.stderr
    assert "Assets:Weird: unknown cash-flow-role value 'Cash'; using the default." in proc.stderr + proc.stdout
