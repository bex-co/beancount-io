"""An unchanged multi-fill sale over more than twelve booked lots is recognized (w5/977).

A sale split into two open-cost fills is booked across many lots. Past twelve
compatible lots only the whole set was tried as one fill's lots, so the first
fill matched nothing and the sale conflicted with its own first import.
"""

from __future__ import annotations

import datetime
import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

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


def _books(tmp_path: Path, lots: int, parts: list[int]) -> Path:
    ledger = tmp_path / "main.bean"
    text = (
        'option "operating_currency" "USD"\n2023-01-01 open Assets:Cash USD\n'
        '2023-01-01 open Assets:Stock HOOL "FIFO"\n2023-01-01 open Equity:Opening USD\n'
        '2023-01-01 open Income:Gains USD\n2023-01-01 * "Capital"\n'
        "  Assets:Cash 10000 USD\n  Equity:Opening -10000 USD\n"
    )
    for k in range(lots):
        day = datetime.date(2023, 1, 2) + datetime.timedelta(days=k)
        text += f'{day} * "Buy {k + 1}"\n  Assets:Stock 1 HOOL {{100 USD, "L{k + 1}"}}\n  Assets:Cash -100 USD\n'
    ledger.write_text(text)
    count = sum(parts)
    (tmp_path / "sale.statement").write_text(
        '2024-02-01 * "Sale"\n  bank_id: "trade-13"\n'
        + "".join(f"  Assets:Stock -{q} HOOL {{USD}} @ 150 USD\n" for q in parts)
        + f"  Assets:Cash {count * 150} USD\n  Income:Gains {-count * 50} USD\n"
    )
    (tmp_path / "importer.py").write_text(IMPORTER)
    return ledger


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", *flags)


@pytest.mark.parametrize(
    ("lots", "parts"),
    [(13, [5, 8]), (13, [13]), (12, [5, 7]), (20, [3, 4, 13])],
    ids=["13-lots-two-fills", "13-lots-one-fill", "12-lots-two-fills", "20-lots-three-fills"],
)
def test_an_unchanged_sale_is_written_once(tmp_path: Path, lots: int, parts: list[int]) -> None:
    ledger = _books(tmp_path, lots, parts)

    first = _import(tmp_path, "--apply")
    written = ledger.read_bytes()
    second = _import(tmp_path, "--apply")
    third = _import(tmp_path, "--apply")

    assert first.returncode == 0, first.stderr  # type: ignore[attr-defined]
    assert json.loads(first.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert second.returncode == 0, second.stdout  # type: ignore[attr-defined]
    assert json.loads(second.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert json.loads(third.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == written


def test_a_sale_of_a_different_quantity_still_conflicts(tmp_path: Path) -> None:
    ledger = _books(tmp_path, 13, [5, 8])
    assert _import(tmp_path, "--apply").returncode == 0  # type: ignore[attr-defined]
    written = ledger.read_bytes()
    (tmp_path / "sale.statement").write_text(
        '2024-02-01 * "Sale"\n  bank_id: "trade-13"\n'
        "  Assets:Stock -5 HOOL {USD} @ 150 USD\n  Assets:Stock -7 HOOL {USD} @ 150 USD\n"
        "  Assets:Cash 1800 USD\n  Income:Gains -600 USD\n"
    )

    changed = _import(tmp_path, "--apply")

    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == written
