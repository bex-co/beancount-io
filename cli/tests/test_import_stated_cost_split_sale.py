"""A sale stated at a per-unit cost matches the sale FIFO booked across lots at that cost (w5/978).

Six shares sold at `{100 USD}` against two 100 USD purchases book as two legs. An
open `{USD}` selector could span them, but a stated number could not, so the
manual sale was unmatched and importing it again doubled the proceeds and profit.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

HEAD = (
    'option "operating_currency" "USD"\n2023-01-01 open Assets:Cash USD\n'
    '2023-01-01 open Assets:Stock HOOL "FIFO"\n2023-01-01 open Equity:Opening USD\n'
    '2023-01-01 open Income:Gains USD\n2023-01-01 * "Capital"\n  Assets:Cash 10000 USD\n  Equity:Opening -10000 USD\n'
)
SALE = (
    '2024-02-01 * "Sale"\n  Assets:Stock -6 HOOL {{{cost}}} @ 150 USD\n  Assets:Cash 900 USD\n  Income:Gains -300 USD\n'
)
IMPORTER = """from beancount.parser import parser
class Broker:
    name = "broker"
    def identify(self, file): return str(file).endswith(".statement")
    def account(self, file): return "Assets:Stock"
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file))
        assert not errors, errors
        return entries
CONFIG = [Broker()]
"""


def _books(tmp_path: Path, selector: str, purchases: tuple[int, ...]) -> Path:
    base = HEAD
    for day, quantity in enumerate(purchases, start=2):
        base += f'2023-01-{day:02d} * "Buy {day}"\n  Assets:Stock {quantity} HOOL {{100 USD}}\n'
        base += f"  Assets:Cash {-quantity * 100} USD\n"
    ledger = tmp_path / "main.bean"
    ledger.write_text(base + SALE.format(cost="100 USD"))
    (tmp_path / "sale.statement").write_text(SALE.format(cost=selector))
    (tmp_path / "importer.py").write_text(IMPORTER)
    return ledger


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", *flags)


@pytest.mark.parametrize(
    ("selector", "purchases"),
    [("100 USD", (5, 15)), ("USD", (5, 15)), ("100 USD", (20,))],
    ids=["stated-cost-split-lots", "open-selector-split-lots", "stated-cost-one-lot"],
)
def test_the_sale_is_offered_as_a_possible_duplicate_and_never_booked_twice(
    tmp_path: Path, selector: str, purchases: tuple[int, ...]
) -> None:
    ledger = _books(tmp_path, selector, purchases)
    before = ledger.read_bytes()

    preview = _import(tmp_path)
    applied = _import(tmp_path, "--apply")
    skipped = _import(tmp_path, "--duplicates", "skip", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert json.loads(skipped.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


def test_a_sale_at_another_cost_is_not_taken_for_it(tmp_path: Path) -> None:
    _books(tmp_path, "120 USD", (5, 15))

    preview = _import(tmp_path)

    statuses = [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]]  # type: ignore[attr-defined]
    assert statuses != ["duplicate"]
