"""Cash Flow refuses a period whose priced currency exchange it cannot reconcile (w5/1068).

Reading every amount at cost, a `100 EUR @ 1.10 USD` exchange between two cash
accounts vanished from the rows, and the report back-solved an opening of
890 USD / 100 EUR (or "No cash flows") although cash opened at 1000 USD.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2023-12-01 open Assets:Checking USD
2023-12-01 open Assets:Euro EUR
2023-12-01 open Equity:Opening USD
2023-12-01 open Expenses:Fees USD
2023-12-01 * "Capital"
  Assets:Checking 1000 USD
  Equity:Opening -1000 USD
2024-01-10 * "Buy euros"
  Assets:Euro 100 EUR @ 1.10 USD
  Assets:Checking -{paid} USD
{fee}"""
FEE = "  Expenses:Fees 2 USD\n"


@pytest.mark.parametrize("fee", [True, False], ids=["with-fee", "no-fee"])
@pytest.mark.parametrize("flags", [[], ["--allow-errors"]], ids=["strict", "allow-errors"])
@pytest.mark.parametrize("as_json", [True, False], ids=["json", "human"])
def test_the_unreconcilable_period_is_refused(tmp_path: Path, fee: bool, flags: list[str], as_json: bool) -> None:
    ledger = write_ledger(tmp_path, LEDGER.format(paid="112" if fee else "110", fee=FEE if fee else ""))

    proc = bea(
        ["--file", str(ledger), *(["--json"] if as_json else []), "report", "cash-flow", "--time", "2024-01", *flags],
        tmp_path,
    )

    assert proc.returncode == 2, proc.stdout
    message = json.loads(proc.stderr)["error"]["message"] if as_json else proc.stderr
    assert "cannot reconcile" in message and "Buy euros" in message
    assert "Opening cash" not in proc.stdout


def test_a_period_before_the_exchange_still_reports(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER.format(paid="112", fee=FEE))

    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", "--time", "2023-12"], tmp_path)

    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]
    assert data["closing"] == {"USD": "1000"}
