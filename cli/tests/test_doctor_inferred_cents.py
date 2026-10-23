"""A tree shows the exact cents an inferred posting is determined to (w5/997).

2 HOOL at 5.25 USD makes the salary leg exactly 10.50 USD. With only whole
dollars typed elsewhere, the scoped context learned nothing for that leg and
fell back to the ledger's whole-number precision, so the tree said -10 while
its own Net Income said 10.50.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from tests.test_doctor_scoped_precision import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Salary USD
2024-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
{whole}2024-01-10 * "Stock salary" ^target
  Assets:Stock 2 HOOL {acquired}
  Income:Salary
"""
WHOLE = '2024-01-02 * "Whole dollars"\n  Assets:Cash 1 USD\n  Income:Salary -1 USD\n' * 6


@pytest.mark.parametrize("acquired", ["@ 5.25 USD", "{5.25 USD}"], ids=["price", "cost"])
def test_the_inferred_salary_keeps_its_cents(tmp_path: Path, acquired: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER.format(whole=WHOLE, acquired=acquired))

    result = _bea(tmp_path, "doctor", "linked", str(tmp_path / "main.bean"), "^target")

    assert result.returncode == 0, result.stderr or result.stdout
    salary = next(line for line in result.stdout.splitlines() if "-- Salary" in line)
    assert re.search(r"-10\.50\s+USD", salary), result.stdout
