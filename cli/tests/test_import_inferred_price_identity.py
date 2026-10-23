"""An inferred posting price is solved before import compares or hashes it (w5/995).

`@ USD` and `@@ USD` leave the price to booking. Hashed as no price, two
purchases at different cash prices shared a generated id and the second was
skipped even under `--duplicates include`; a bank-id correction was skipped too.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_inferred_cost_identity import IMPORTER
from tests.test_import_source_facts import _bea

LEDGER = (
    "2024-01-01 open Assets:Broker HOOL\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)
TRADE = '2024-01-02 * "Trade"\n  Assets:Broker 2 HOOL {marker} USD\n  Assets:Cash {cash} USD\n'


def _books(tmp_path: Path, marker: str, *, bank: bool = False, second_cash: str = "-20.50") -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(bank=bank))
    (tmp_path / "a.trade").write_text(TRADE.format(marker=marker, cash="-10.50"))
    (tmp_path / "b.trade").write_text(TRADE.format(marker=marker, cash=second_cash))


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, "--config", "importer.py", *flags)


@pytest.mark.parametrize("marker", ["@", "@@"])
def test_purchases_at_different_cash_prices_are_both_written(tmp_path: Path, marker: str) -> None:
    _books(tmp_path, marker)

    first = _import(tmp_path, "a.trade", "--apply")
    second = _import(tmp_path, "b.trade", "--duplicates", "include", "--apply")
    repeat = _import(tmp_path, "b.trade", "--apply")

    assert json.loads(first.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert json.loads(second.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    cash = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    assert json.loads(cash.stdout)["data"]["rows"] == [["969.00"]]


@pytest.mark.parametrize("marker", ["@", "@@"])
def test_a_changed_cash_price_under_one_bank_id_conflicts(tmp_path: Path, marker: str) -> None:
    _books(tmp_path, marker, bank=True)
    assert json.loads(_import(tmp_path, "a.trade", "--apply").stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    before = (tmp_path / "main.bean").read_bytes()

    changed = _import(tmp_path, "b.trade", "--apply")

    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
