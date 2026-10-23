"""An imported balance assertion that differs from an authored one conflicts (w5/1008).

The generic directive check compared the whole key, so a different amount or
tolerance for the same day and account looked new, and a plugin that filtered
or rewrote assertions hid the pair from final validation too.
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
IMPORTER = """from decimal import Decimal as D
from beancount.core.amount import Amount
from beancount.core.data import Balance, new_metadata
class Statement:
    name = 'statement'
    def identify(self, file): return str(file).endswith('.txt')
    def account(self, file): return 'Assets:Cash'
    def extract(self, file, existing_entries=None):
        day, number, tolerance = open(file).read().split()
        import datetime
        return [Balance(new_metadata(str(file), 1), datetime.date.fromisoformat(day), 'Assets:Cash',
                        Amount(D(number), 'USD'), D(tolerance) if tolerance != '-' else None, None)]
CONFIG = [Statement()]
"""
LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_view"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
2024-02-01 balance Assets:Cash 100.00 USD
"""


def _books(tmp_path: Path, mode: str, statement: str) -> Path:
    (tmp_path / "qa_view.py").write_text(PLUGIN.replace("MODE", repr(mode)))
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / "statement.txt").write_text(statement)
    return tmp_path / "main.bean"


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "statement.txt", "--config", "importer.py", *flags)


@pytest.mark.parametrize("mode", ["filter", "transform", "pass"])
@pytest.mark.parametrize("policy", [[], ["--duplicates", "skip"]], ids=["default", "skip"])
def test_a_different_assertion_for_the_same_day_refuses(tmp_path: Path, mode: str, policy: list[str]) -> None:
    ledger = _books(tmp_path, mode, "2024-02-01 100.01 0.02\n")
    before = ledger.read_bytes()

    preview = _import(tmp_path)
    applied = _import(tmp_path, *policy, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("mode", ["filter", "transform", "pass"])
def test_an_exact_repeat_still_skips_and_a_new_day_is_written(tmp_path: Path, mode: str) -> None:
    ledger = _books(tmp_path, mode, "2024-02-01 100.00 -\n")
    before = ledger.read_bytes()

    repeat = _import(tmp_path, "--apply")
    (tmp_path / "statement.txt").write_text("2024-02-02 100.01 0.02\n")
    fresh = _import(tmp_path, "--apply")

    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() != before
    assert json.loads(fresh.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
