"""Source legs that move in opposite directions are not one leg under a native id (w5/979).

A sale of two shares beside a purchase of one nets to a sale of one, and lot
spanning counted the pair as the single one-share sale, so a changed statement
under an existing bank id was accepted as an exact duplicate (apply exit 0,
nothing written, while the two books differ in basis and profit).
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Assets:Cash USD\n'
    "2024-01-01 open Equity:Opening USD\n2024-01-01 open Income:Gains USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000 USD\n  Equity:Opening -1000 USD\n'
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
COMPOSITE = (
    '2024-02-01 * "Source trade"\n  bank_id: "T1"\n'
    '  Assets:Stock -2 HOOL {100 USD, 2024-01-02, "Old"} @ 150 USD\n'
    '  Assets:Stock 1 HOOL {150 USD, 2024-02-01, "New"} @ 150 USD\n'
    "  Assets:Cash 150 USD\n  Income:Gains -100 USD\n"
)
SINGLE = (
    '2024-02-01 * "Source trade"\n  bank_id: "T1"\n'
    "  Assets:Stock -1 HOOL {USD} @ 150 USD\n  Assets:Cash 150 USD\n  Income:Gains -50 USD\n"
)


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", *flags)


def test_a_net_sale_is_not_the_composite_trade_it_nets_from(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        BASE
        + '2024-01-02 * "Buy old"\n  Assets:Stock 2 HOOL {100 USD, 2024-01-02, "Old"}\n  Assets:Cash -200 USD\n'
        + COMPOSITE
    )
    (tmp_path / "sale.statement").write_text(SINGLE)
    (tmp_path / "importer.py").write_text(IMPORTER)
    before = ledger.read_bytes()

    preview = _import(tmp_path)
    applied = _import(tmp_path, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


def test_a_genuine_split_of_one_sale_is_still_the_same_sale(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    text = BASE
    for day, quantity in [(2, "0.5"), (3, "0.5"), (4, "1")]:
        lot = f'{{100 USD, 2024-01-{day:02d}, "L{day}"}}'
        text += f'2024-01-{day:02d} * "Buy {day}"\n  Assets:Stock {quantity} HOOL {lot}\n'
        text += f"  Assets:Cash {-float(quantity) * 100:g} USD\n"
    split = '2024-02-01 * "Source trade"\n  bank_id: "T1"\n  Assets:Stock -1 HOOL {USD} @ 150 USD\n'
    split += "  Assets:Cash 150 USD\n  Income:Gains -50 USD\n"
    ledger.write_text(text + split)
    (tmp_path / "sale.statement").write_text(split)
    (tmp_path / "importer.py").write_text(IMPORTER)
    before = ledger.read_bytes()

    applied = _import(tmp_path, "--apply")

    assert applied.returncode == 0, applied.stdout  # type: ignore[attr-defined]
    assert json.loads(applied.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before
