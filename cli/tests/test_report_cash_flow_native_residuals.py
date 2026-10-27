"""Cash Flow accepts native cost-rounding residuals (w5/1071).

The priced-FX guard compared cash movement with the rows exactly: a
`{{1000.00 USD}}` lot over three shares weighs 999.99… at cost, so an ordinary
purchase was refused as a priced exchange, as was every `bea example` book.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

COSTED = """option "operating_currency" "USD"
2023-12-01 open Assets:Checking USD
2023-12-01 open Assets:Broker HOOL
2023-12-01 open Equity:Opening USD
2023-12-01 * "Capital"
  Assets:Checking 2000.00 USD
  Equity:Opening -2000.00 USD
2024-01-10 * "Buy three"
  Assets:Broker 3 HOOL {{1000.00 USD}}
  Assets:Checking -1000.00 USD
"""


def _cash_flow(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


def test_a_total_cost_purchase_reports_its_actual_cash(tmp_path: Path) -> None:
    data = _cash_flow(tmp_path, COSTED, "--time", "2024-01")

    assert data["opening"] == {"USD": "2000.00"}
    assert data["closing"] == {"USD": "1000.00"}
    residual = Decimal(data["rounding_residual"]["USD"])  # type: ignore[index]
    assert residual != 0 and abs(residual) < Decimal("0.005")
    human = bea(["--file", str(tmp_path / "main.beancount"), "report", "cash-flow", "--time", "2024-01"], tmp_path)
    assert human.returncode == 0 and "Rounding residual:" in human.stdout


@pytest.mark.parametrize("seed", ["1", "19"])
def test_a_generated_example_book_reports(tmp_path: Path, seed: str) -> None:
    ledger = tmp_path / "main.bean"
    made = bea(
        [
            "--no-input",
            "--file",
            str(ledger),
            "example",
            "--seed",
            seed,
            "--date-begin",
            "2024-01-01",
            "--date-end",
            "2024-12-31",
            "--date-birth",
            "1980-01-01",
            "--output",
            str(ledger),
        ],
        tmp_path,
    )
    assert made.returncode == 0, made.stderr

    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", "--time", "2024"], tmp_path)

    assert proc.returncode == 0, proc.stderr
