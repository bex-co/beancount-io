"""A register's balance assertion moves nothing, and a failed one says so on its row (w1/289).

The balance row carried the asserted figure in `amount`, so the text AMOUNT
column read it as a 70.00 USD deposit, the CSV `amount` column summed to
135.00 over a 65.00 register, and a failed assertion looked like a passing
one. Its `amount` is now empty; the figure is `asserted`, and a failed one
carries Beancount's `diff_amount` (accumulated minus asserted) as
`difference`.
"""

from __future__ import annotations

import csv
import io
import json
from decimal import Decimal
from pathlib import Path
from typing import Any

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 open Expenses:Food USD
2024-01-02 * "Opening"
  Assets:Checking 100.00 USD
  Equity:Opening-Balances
2024-01-05 * "Groceries"
  Expenses:Food 30.00 USD
  Assets:Checking
2024-01-10 balance Assets:Checking 70.00 USD
2024-01-11 * "Coffee"
  Expenses:Food 5.00 USD
  Assets:Checking
"""
FAILING = LEDGER.replace("balance Assets:Checking 70.00 USD", "balance Assets:Checking 80.00 USD")


def _register(tmp_path: Path, text: str, *args: str) -> str:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), *args, "report", "register", "Assets:Checking", "--allow-errors"], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return proc.stdout


def _rows(tmp_path: Path, text: str) -> list[dict[str, Any]]:
    return json.loads(_register(tmp_path, text, "--json"))["data"]["rows"]


def _csv(tmp_path: Path, text: str) -> list[dict[str, str]]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(
        ["--file", str(ledger), "report", "register", "Assets:Checking", "--allow-errors", "--format", "csv"],
        tmp_path,
    )
    assert proc.returncode == 0, proc.stderr
    return list(csv.DictReader(io.StringIO(proc.stdout)))


def test_a_passing_assertion_has_no_amount(tmp_path: Path) -> None:
    rows = _rows(tmp_path, LEDGER)

    (check,) = [row for row in rows if row["entry"] == "balance"]
    assert check["amount"] is None
    assert check["asserted"] == {"number": "70.00", "currency": "USD"}
    assert check["difference"] is None
    assert check["balance"] == {"USD": "70.00"}
    assert all(row["asserted"] is None and row["difference"] is None for row in rows if row["entry"] != "balance")


def test_a_failed_assertion_carries_its_difference(tmp_path: Path) -> None:
    (check,) = [row for row in _rows(tmp_path, FAILING) if row["entry"] == "balance"]

    assert check["amount"] is None
    assert check["asserted"] == {"number": "80.00", "currency": "USD"}
    # Accumulated 70.00 minus asserted 80.00: the account held 10.00 too little.
    assert check["difference"] == {"number": "-10.00", "currency": "USD"}
    assert check["balance"] == {"USD": "70.00"}


def test_the_csv_amount_column_sums_to_the_closing_balance(tmp_path: Path) -> None:
    rows = _csv(tmp_path, LEDGER)

    assert sum(Decimal(row["amount"]) for row in rows if row["amount"]) == Decimal(rows[-1]["balance"])
    (check,) = [row for row in rows if row["entry"] == "balance"]
    assert (check["amount"], check["currency"]) == ("", "")
    assert (check["asserted"], check["asserted_currency"], check["difference"]) == ("70.00", "USD", "")


def test_the_csv_names_a_failed_assertions_difference(tmp_path: Path) -> None:
    (check,) = [row for row in _csv(tmp_path, FAILING) if row["entry"] == "balance"]

    assert (check["amount"], check["asserted"], check["difference"]) == ("", "80.00", "-10.00")


def _check_line(stdout: str) -> str:
    (line,) = [line for line in stdout.splitlines() if line.startswith("2024-01-10")]
    return line


def test_the_text_row_states_the_check_with_amount_blank(tmp_path: Path) -> None:
    line = _check_line(_register(tmp_path, LEDGER))

    assert "Balance check: 70.00 USD" in line
    # Only the running balance follows the description: AMOUNT is blank.
    assert line.split("Balance check: 70.00 USD", 1)[1].split() == ["70.00", "USD"]


def test_the_text_row_marks_a_failed_check(tmp_path: Path) -> None:
    line = _check_line(_register(tmp_path, FAILING))

    assert "Balance check failed: 80.00 USD asserted" in line
    assert line.split("asserted", 1)[1].split() == ["70.00", "USD"]
