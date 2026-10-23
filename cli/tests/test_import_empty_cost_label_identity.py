"""An explicit empty cost label is part of a purchase's generated import id (w5/981).

Folding `{100 USD, 2024-02-01, ""}` to the same text as `{100 USD, 2024-02-01}`
gave two separate acquisitions one id, so the second was skipped as a duplicate
even with `--duplicates include`: one share and Cash 900 instead of two and 800.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Stock HOOL "FIFO"\n'
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000 USD\n  Equity:Opening -1000 USD\n'
)
IMPORTER = """from beancount.parser import parser
class Broker:
    name = 'broker'
    def identify(self, file): return str(file).endswith('.statement')
    def account(self, file): return 'Assets:Stock'
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file))
        assert not errors, errors
        return entries
CONFIG = [Broker()]
"""


def _purchase(label: str) -> str:
    return f'2024-02-01 * "Purchase"\n  Assets:Stock 1 HOOL {{100 USD, 2024-02-01{label}}}\n  Assets:Cash -100 USD\n'


def _books(tmp_path: Path, first: str, second: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(BASE)
    (tmp_path / "first.statement").write_text(_purchase(first))
    (tmp_path / "second.statement").write_text(_purchase(second))
    (tmp_path / "importer.py").write_text(IMPORTER)
    return ledger


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, "--config", "importer.py", *flags)


@pytest.mark.parametrize(
    ("first", "second"), [("", ', ""'), (', ""', "")], ids=["absent-then-empty", "empty-then-absent"]
)
def test_two_acquisitions_differing_by_an_empty_label_are_not_one_row(tmp_path: Path, first: str, second: str) -> None:
    _books(tmp_path, first, second)
    assert json.loads(_import(tmp_path, "first.statement", "--apply").stdout)["data"]["written"] == 1  # type: ignore[attr-defined]

    preview = _import(tmp_path, "second.statement")
    included = _import(tmp_path, "second.statement", "--duplicates", "include", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] != ["duplicate"]  # type: ignore[attr-defined]
    assert json.loads(included.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    held = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Stock'")
    assert json.loads(held.stdout)["data"]["rows"] == [["2"]]


def test_an_unchanged_repeat_of_either_still_skips(tmp_path: Path) -> None:
    _books(tmp_path, ', ""', ', ""')
    _import(tmp_path, "first.statement", "--apply")

    repeat = _import(tmp_path, "second.statement", "--apply")

    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]


def test_the_older_label_blind_id_is_still_looked_up() -> None:
    from decimal import Decimal

    from beancount.core.amount import Amount
    from beancount.core.data import Posting, Transaction
    from beancount.core.position import CostSpec

    from bea_engine.importing import _hash_import_ids

    def row(label: str | None) -> Transaction:
        cost = CostSpec(Decimal(100), None, "USD", datetime.date(2024, 2, 1), label, False)
        legs = [
            Posting("Assets:Stock", Amount(Decimal(1), "HOOL"), cost, None, None, None),
            Posting("Assets:Cash", Amount(Decimal(-100), "USD"), None, None, None, None),
        ]
        return Transaction({}, datetime.date(2024, 2, 1), "*", None, "Purchase", frozenset(), frozenset(), legs)

    absent = _hash_import_ids(row(None), "Assets:Stock", {}, raw_narration="Purchase", raw_payee=None)
    empty = _hash_import_ids(row(""), "Assets:Stock", {}, raw_narration="Purchase", raw_payee=None)

    assert absent.canonical != empty.canonical
    assert absent.canonical in empty.narration_only
