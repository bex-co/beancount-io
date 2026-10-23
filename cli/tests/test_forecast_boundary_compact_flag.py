"""A flag touching its date still marks a forecast view as an overlay (w5/987).

Root discovery read the forecast's `2024-01-15*"Forecast"` as no entry at all,
so the forecast counted as a root, the climb went through it to a wrapper, and
`add balance` validated a hypothetical 1100 USD assertion against it and
appended it to the real 1000 USD book.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

WORKING = """2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""


def _books(tmp_path: Path, head: str) -> Path:
    (tmp_path / "working.bean").write_text(WORKING)
    (tmp_path / "forecast.bean").write_text(
        f'include "working.bean"\n2024-01-15{head}"Forecast"\n  Assets:Cash 100.00 USD\n  Equity:Opening -100.00 USD\n'
    )
    (tmp_path / "wrapper.bean").write_text('option "operating_currency" "USD"\ninclude "forecast.bean"\n')
    return tmp_path / "working.bean"


def _balance(tmp_path: Path, amount: str) -> object:
    return _bea(
        tmp_path,
        "add",
        "balance",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--amount",
        amount,
        ledger="working.bean",
    )


@pytest.mark.parametrize("head", ["*", "!", " * ", "txn"], ids=["compact-star", "compact-bang", "spaced", "word"])
def test_a_hypothetical_assertion_is_refused_and_the_truthful_one_written(tmp_path: Path, head: str) -> None:
    working = _books(tmp_path, head)
    before = working.read_bytes()

    wrong = _balance(tmp_path, "1100.00 USD")
    unchanged = working.read_bytes() == before
    right = _balance(tmp_path, "1000.00 USD")

    assert wrong.returncode != 0, wrong.stdout  # type: ignore[attr-defined]
    assert unchanged
    assert right.returncode == 0, right.stderr  # type: ignore[attr-defined]
    assert "balance Assets:Cash" in working.read_text()
    assert _bea(tmp_path, "check", ledger="working.bean").returncode == 0
