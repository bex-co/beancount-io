"""A native-ID owner whose cash amount is inferred from a cost or price is still its row's owner (w5/1010).

Cash's amount is left to booking beside `2 HOOL {100 USD}` or `@ 100 USD`.
Only plain single-currency postings were completed, so a plugin that filtered
the loaded copy left no owner under the ID and the unchanged bank row was
written again.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

FILTER = """from beancount.core.data import Transaction
__plugins__ = ('view',)
def view(entries, options, mode):
    return [e for e in entries if not (mode == 'filter' and isinstance(e, Transaction) and e.flag == '!')], []
"""
SCALE = """from decimal import Decimal
from beancount.core.data import Transaction
__plugins__ = ('view',)
def view(entries, options, mode):
    out = []
    for e in entries:
        if isinstance(e, Transaction) and e.flag == '!':
            e = e._replace(meta=e.meta.copy(), postings=[
                p._replace(units=p.units._replace(number=p.units.number * Decimal('2'))) for p in e.postings])
        out.append(e)
    return out, []
"""
BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n'
    '2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Equity:Opening USD\n'
    '2024-01-01 open Expenses:Fees USD\n2024-01-01 * "Capital"\n'
    "  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n"
)
STOCK = {"cost": "2 HOOL {100 USD}", "price": "2 HOOL @ 100 USD", "total-price": "2 HOOL @@ 200 USD"}


def _books(tmp_path: Path, kind: str, view: str = FILTER) -> Path:
    (tmp_path / "qa_view.py").write_text(view)
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "insert_pythonpath" "TRUE"\nplugin "qa_view" "filter"\n'
        + BASE
        + f'2024-02-01 ! "Source row"\n  bank_id: "B1"\n  Assets:Cash\n  Assets:Stock {STOCK[kind]}\n'
    )
    return ledger


def _import(tmp_path: Path, amount: str, reference: str) -> object:
    row = f"2024-02-01,Source row,{amount},{reference}"
    (tmp_path / "bank.csv").write_text(f"Date,Description,Amount,Reference\n{row}\n")
    return _bea(
        tmp_path,
        "import",
        "bank.csv",
        "--csv",
        "date=Date,narration=Description,amount=Amount,id=Reference",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Fees",
        "--apply",
    )


@pytest.mark.parametrize("kind", list(STOCK))
def test_an_unchanged_row_is_skipped_and_a_correction_conflicts(tmp_path: Path, kind: str) -> None:
    ledger = _books(tmp_path, kind)
    before = ledger.read_bytes()

    repeat = _import(tmp_path, "-200.00", "B1")
    assert repeat.returncode == 0, repeat.stdout  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before

    changed = _import(tmp_path, "-210.00", "B1")
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


def test_a_new_reference_is_still_written(tmp_path: Path) -> None:
    ledger = _books(tmp_path, "cost")
    before = ledger.read_bytes()

    new = _import(tmp_path, "-200.00", "B2")

    assert json.loads(new.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert ledger.read_bytes() != before


@pytest.mark.parametrize("kind", ["cost", "price"])
def test_a_calculated_view_does_not_stand_in_for_the_written_amount(tmp_path: Path, kind: str) -> None:
    """The view doubles the trade (Cash -400); the file still says -200 (w5/1010)."""
    ledger = _books(tmp_path, kind, SCALE)
    before = ledger.read_bytes()

    unchanged = _import(tmp_path, "-200.00", "B1")
    changed = _import(tmp_path, "-400.00", "B1")

    assert json.loads(unchanged.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert unchanged.returncode == 0, unchanged.stdout  # type: ignore[attr-defined]
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before
