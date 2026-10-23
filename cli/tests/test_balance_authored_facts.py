"""Balance repeat and conflict decisions judge the assertion the file spells (w5/993).

A plugin that filters assertions made an exact repeat append again and a
different amount or tolerance write without a conflict; one that rewrites
them refused the real repeat and called an unwritten value already recorded.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from decimal import Decimal
from beancount.core.data import Balance
__plugins__ = ('view',)
def view(entries, options, config=None):
    out = []
    for e in entries:
        if isinstance(e, Balance):
            if MODE == 'filter':
                continue
            if MODE == 'transform':
                e = e._replace(amount=e.amount._replace(number=Decimal('100.01')), tolerance=Decimal('0.02'),
                               meta=e.meta.copy())
        out.append(e)
    return out, []
"""
LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_assertions"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
2024-02-01 balance Assets:Cash 100.00 USD
"""


def _add(tmp_path: Path, mode: str, amount: str) -> tuple[object, bytes, bytes]:
    (tmp_path / "qa_assertions.py").write_text(PLUGIN.replace("MODE", repr(mode)))
    (tmp_path / "main.bean").write_text(LEDGER)
    before = (tmp_path / "main.bean").read_bytes()
    result = _bea(tmp_path, "add", "balance", "--date", "2024-02-01", "--account", "Assets:Cash", "--amount", amount)
    return result, before, (tmp_path / "main.bean").read_bytes()


@pytest.mark.parametrize("mode", ["filter", "transform", "pass"])
def test_the_exact_repeat_skips(tmp_path: Path, mode: str) -> None:
    result, before, after = _add(tmp_path, mode, "100.00 USD")

    assert result.returncode == 0, result.stderr  # type: ignore[attr-defined]
    assert json.loads(result.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert after == before


@pytest.mark.parametrize("mode", ["filter", "transform", "pass"])
@pytest.mark.parametrize("amount", ["100.0 USD", "100.01 ~ 0.02 USD"])
def test_a_different_precision_or_tolerance_conflicts(tmp_path: Path, mode: str, amount: str) -> None:
    result, before, after = _add(tmp_path, mode, amount)

    assert result.returncode == 4, result.stdout  # type: ignore[attr-defined]
    assert after == before
