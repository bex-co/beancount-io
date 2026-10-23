"""A written sale with an open cost selector keeps its native id when a plugin hides it (w5/974).

The written-view fallback left out every row whose cost selector (`{USD}`) was
open, since its booked lot is only known to the loaded view. With a display
filter hiding the sale, nothing indexed it, and the unchanged statement was
imported again on every apply (Cash 890 after three, not 830).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BODY = """2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-01 * "Buy"
  Assets:Stock 20 HOOL {10 USD}
  Assets:Cash -200.00 USD
include "sales.bean"
"""
FILTER = """from beancount.core.data import Transaction
__plugins__ = ['run']
def run(entries, options):
    return [e for e in entries if not isinstance(e, Transaction) or e.flag != '!'], []
"""
IMPORTER = """from beancount.parser import parser
class Broker:
    name = 'local-sale'
    def identify(self, file): return str(file).endswith('.statement')
    def account(self, file): return '{account}'
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file))
        assert not errors, errors
        return entries
CONFIG = [Broker()]
"""


def _books(tmp_path: Path, *, filtered: bool, lot: str, stock_source: bool) -> Path:
    header = 'option "insert_pythonpath" "TRUE"\noption "operating_currency" "USD"\n'
    header += 'plugin "cleared_only"\n' if filtered else ""
    (tmp_path / "main.bean").write_text(header + BODY)
    sales = tmp_path / "sales.bean"
    sales.write_bytes(b"")
    (tmp_path / "cleared_only.py").write_text(FILTER)
    cash, stock = "  Assets:Cash 30.00 USD\n", f"  Assets:Stock -2 HOOL {lot} @ 15 USD\n"
    identity = "fitid" if stock_source else "bank_id"
    (tmp_path / "sale.statement").write_text(
        f'2024-01-03 ! "Sale"\n  {identity}: "sale-1"\n'
        + (stock + cash if stock_source else cash + stock)
        + "  Income:Gains -10.00 USD\n"
    )
    account = "Assets:Stock" if stock_source else "Assets:Cash"
    (tmp_path / "importer.py").write_text(IMPORTER.format(account=account))
    return sales


def _apply(tmp_path: Path) -> int:
    result = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--into", "sales.bean", "--apply")
    assert result.returncode == 0, result.stderr
    return int(json.loads(result.stdout)["data"]["written"])


@pytest.mark.parametrize("stock_source", [False, True], ids=["cash-source", "stock-source"])
def test_an_unchanged_sale_with_an_open_selector_is_written_once(tmp_path: Path, stock_source: bool) -> None:
    sales = _books(tmp_path, filtered=True, lot="{USD}", stock_source=stock_source)

    writes = [_apply(tmp_path) for _ in range(3)]

    assert writes == [1, 0, 0]
    assert sales.read_bytes().count(b"Sale") == 1


@pytest.mark.parametrize(
    ("filtered", "lot"), [(True, "{10 USD}"), (False, "{USD}")], ids=["explicit-cost", "no-filter"]
)
def test_the_controls_still_deduplicate(tmp_path: Path, filtered: bool, lot: str) -> None:
    sales = _books(tmp_path, filtered=filtered, lot=lot, stock_source=False)

    assert [_apply(tmp_path) for _ in range(3)] == [1, 0, 0]
    assert sales.read_bytes().count(b"Sale") == 1


def test_a_changed_sale_under_the_same_reference_is_not_deduplicated(tmp_path: Path) -> None:
    _books(tmp_path, filtered=True, lot="{USD}", stock_source=False)
    assert _apply(tmp_path) == 1
    (tmp_path / "sale.statement").write_text(
        (tmp_path / "sale.statement")
        .read_text()
        .replace("-2 HOOL", "-3 HOOL")
        .replace("30.00", "45.00")
        .replace("-10.00", "-15.00")
    )

    changed = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--into", "sales.bean", "--apply")

    assert changed.returncode == 4, changed.stdout
