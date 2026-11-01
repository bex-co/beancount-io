"""A multiline narration ending in a recurrence marker expands through the CLI (w5/1083)."""

from __future__ import annotations

import json
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """plugin "fava.plugins.forecast"
option "operating_currency" "USD"
2024-01-01 open Assets:Checking USD
2024-01-01 open Expenses:Rent USD
2024-01-05 # "Rent
apartment [MONTHLY REPEAT 3 TIMES]"
  Expenses:Rent 100.00 USD
  Assets:Checking -100.00 USD
"""


def test_every_occurrence_reaches_list_and_reports(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)

    listed = bea(["--file", str(ledger), "--json", "list", "transaction", "--sort", "oldest"], tmp_path)
    assert listed.returncode == 0, listed.stderr
    rows = json.loads(listed.stdout)["data"]
    assert [row["date"] for row in rows] == ["2024-01-05", "2024-02-05", "2024-03-05"]
    assert all("MONTHLY" not in row["narration"] for row in rows)

    report = bea(["--file", str(ledger), "--json", "report", "income-statement", "--time", "2024"], tmp_path)
    assert report.returncode == 0, report.stderr
    assert json.loads(report.stdout)["data"]["net_profit"] == {"USD": "-300.00"}
