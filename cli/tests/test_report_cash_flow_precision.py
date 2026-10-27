"""Cash Flow keeps native precision when it merges cash accounts (w5/1072).

Merging added the first amount to zero, which rounds a 29-digit token amount to
28 digits: a price-free SHIB book was refused, or reported 0.12345678901234568
instead of 0.123456789012345678, depending on posting order.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

SHIB = """2024-01-01 commodity SHIB
2024-01-01 open Assets:Checking SHIB
2024-01-01 open Assets:Savings SHIB
2024-01-01 open Equity:Opening SHIB
2024-01-02 * "Two cash accounts"
  {first}
  {second}
  Equity:Opening -0.123456789012345678 SHIB
"""
WIDE = "Assets:Checking 12345678901.123456789012345678 SHIB"
WHOLE = "Assets:Savings -12345678901 SHIB"


def _cash_flow(tmp_path: Path, text: str, *args: str) -> dict[str, object]:
    ledger = write_ledger(tmp_path, text)
    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("order", ["wide-first", "small-first"])
def test_merged_cash_keeps_native_precision(tmp_path: Path, order: str) -> None:
    first, second = (WIDE, WHOLE) if order == "wide-first" else (WHOLE, WIDE)
    text = SHIB.format(first=first, second=second)

    january = _cash_flow(tmp_path, text, "--time", "2024-01")
    february = _cash_flow(tmp_path, text, "--time", "2024-02")

    assert january["closing"] == {"SHIB": "0.123456789012345678"}
    assert february["opening"] == february["closing"] == {"SHIB": "0.123456789012345678"}
