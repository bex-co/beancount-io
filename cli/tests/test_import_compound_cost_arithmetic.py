"""A compound cost is compared with Beancount's own arithmetic (w5/1003).

`{-3 # 10 USD}` on 3 units is (10 - 9) / 3 for booking and -3 + 10 / 3 for the
matcher; the two differ in the last digit, so the unchanged manual purchase was
not seen and importing it doubled the holding.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n'
    '2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Equity:Opening USD\n'
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)
PURCHASE = (
    '2024-02-01 * "Purchase"\n{meta}  Assets:Stock 3 HOOL {{{per} # {total} USD, 2024-02-01}}\n'
    "  Assets:Cash -{cash}.00 USD\n"
)
IMPORTER = (
    "from beancount.parser import parser\nclass Reader:\n    name = 'local-trade'\n"
    "    def identify(self, file): return str(file).endswith('.statement')\n"
    "    def account(self, file): return 'Assets:Stock'\n"
    "    def extract(self, file, existing_entries=None):\n"
    "        entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return entries\n"
    "CONFIG = [Reader()]\n"
)


def _purchase(per: int, total: int, *, bank: bool = False) -> str:
    return PURCHASE.format(meta='  bank_id: "B1"\n' if bank else "", per=per, total=total, cash=3 * per + total)


def _books(tmp_path: Path, written: str, statement: str) -> Path:
    (tmp_path / "main.bean").write_text(BASE + written)
    (tmp_path / "purchase.statement").write_text(statement)
    (tmp_path / "importer.py").write_text(IMPORTER)
    return tmp_path / "main.bean"


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "purchase.statement", "--config", "importer.py", *flags)


def test_the_unchanged_manual_purchase_is_a_possible_duplicate(tmp_path: Path) -> None:
    ledger = _books(tmp_path, _purchase(-3, 10), _purchase(-3, 10))
    before = ledger.read_bytes()

    preview = _import(tmp_path)
    applied = _import(tmp_path, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("per", [-3, 3])
def test_a_native_id_repeat_skips_and_a_changed_total_conflicts(tmp_path: Path, per: int) -> None:
    ledger = _books(tmp_path, "", _purchase(per, 10, bank=True))
    assert json.loads(_import(tmp_path, "--apply").stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    written = ledger.read_bytes()

    repeat = _import(tmp_path, "--apply")
    (tmp_path / "purchase.statement").write_text(_purchase(per, 11, bank=True))
    changed = _import(tmp_path, "--apply")

    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == written


def test_a_purchase_written_under_the_former_compound_id_still_matches(tmp_path: Path) -> None:
    """The id the release before this one generated for the same compound cost is still found."""
    written = _purchase(-3, 10).replace('"Purchase"\n', '"Purchase"\n  import-id: "csv:sha256:472ea82927020541"\n')
    ledger = _books(tmp_path, written, _purchase(-3, 10))
    before = ledger.read_bytes()

    result = _import(tmp_path, "--apply")

    assert result.returncode == 0, result.stdout  # type: ignore[attr-defined]
    assert json.loads(result.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


NFD_IMPORTER = IMPORTER.replace(
    "entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return entries",
    "entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors\n"
    "        import unicodedata\n"
    "        return [e._replace(postings=[p._replace(cost=p.cost._replace(\n"
    "            label=unicodedata.normalize('NFD', p.cost.label))) if p.cost else p for p in e.postings])\n"
    "            for e in entries]",
)


def test_an_id_written_with_both_a_raw_label_and_the_former_arithmetic_still_matches(tmp_path: Path) -> None:
    """An id from before the label and compound-cost changes carries both older spellings (w5/1009)."""
    written = (
        _purchase(-3, 10)
        .replace("2024-02-01}", '2024-02-01, "Café"}')
        .replace('"Purchase"\n', '"Purchase"\n  import-id: "csv:sha256:345f500b8f6d41a0"\n')
    )
    ledger = _books(tmp_path, written, _purchase(-3, 10).replace("2024-02-01}", '2024-02-01, "Café"}'))
    (tmp_path / "importer.py").write_text(NFD_IMPORTER)
    before = ledger.read_bytes()

    result = _import(tmp_path, "--apply")

    assert result.returncode == 0, result.stdout  # type: ignore[attr-defined]
    assert json.loads(result.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before
