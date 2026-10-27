"""`.run` resolves a listed name ending in `;` before trimming the terminator (w5/1060).

The optional `;` was stripped before the lookup, so `.run Cash report;` ran a
different stored query named `Cash report`, and an export was replaced with
its result; with no shorter query the listed name was refused.
"""

from __future__ import annotations

import csv
import io
from pathlib import Path

import pytest

from tests.test_query_run_quoted_name import SHELLS, _bea, _query_args

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Capital"
  Assets:Cash 100 USD
  Equity:Opening -100 USD
2026-01-01 query "Cash report;" "SELECT sum(number) AS total WHERE account = 'Assets:Cash'"
{shorter}"""
SHORTER = '2026-01-01 query "Cash report" "SELECT count(*) AS n"\n'


@SHELLS
@pytest.mark.parametrize("shorter", [True, False], ids=["beside-shorter", "alone"])
def test_the_listed_suffix_name_runs_its_own_query(tmp_path: Path, native: bool, shorter: bool) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(shorter=SHORTER if shorter else ""))
    out = tmp_path / "out.csv"

    result = _bea(tmp_path, *_query_args(ledger, native), ".run Cash report;", "-f", "csv", "-o", str(out))

    assert result.returncode == 0, result.stderr
    rows = list(csv.reader(io.StringIO(out.read_text())))
    assert rows[0] == ["total"] and rows[1][0].startswith("100")


@SHELLS
def test_an_ordinary_terminator_still_runs_the_plain_name(tmp_path: Path, native: bool) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(shorter=SHORTER))

    result = _bea(tmp_path, *_query_args(ledger, native), ".run Cash report ;")

    assert result.returncode == 0, result.stderr
    assert "100" not in result.stdout
