"""A pad a same-day assertion in another currency used is not still staged (w5/955).

The guard counted assertions strictly between the pad and the new assertion, so
a USD assertion on the new EUR assertion's own date did not count: both `add
balance` and import took the pad for staged and accepted a wrong 26 EUR, which
the old pad then filled with a backdated +1 EUR. The next day was refused.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """2024-01-01 open Assets:Cash USD,EUR
2024-01-01 open Equity:Opening USD,EUR
2024-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Assets:Cash 25.00 EUR
  Equity:Opening -100.00 USD
  Equity:Opening -25.00 EUR
2024-01-02 balance Assets:Cash 25.00 EUR
2024-01-02 pad Assets:Cash Equity:Opening
2024-01-03 balance Assets:Cash 200.00 USD
"""
IMPORTER = """from datetime import date
from decimal import Decimal
from beancount.core import data, amount

class Statement:
    def identify(self, file):
        return str(file).endswith(".statement")
    def account(self, file):
        return "Assets:Cash"
    def extract(self, file, existing=None):
        return [data.Balance(
            data.new_metadata(file, 1), date(2024, 1, 3), "Assets:Cash",
            amount.Amount(Decimal("26.00"), "EUR"), None, None,
        )]

CONFIG = [Statement()]
"""


def _books(tmp_path: Path) -> bytes:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / "bank.statement").write_text("Synthetic statement\n")
    return (tmp_path / "main.bean").read_bytes()


def _add(tmp_path: Path, day: str, amount: str) -> object:
    return _bea(tmp_path, "add", "balance", "--date", day, "--account", "Assets:Cash", "--amount", amount)


@pytest.mark.parametrize("day", ["2024-01-03", "2024-01-04"])
def test_a_wrong_assertion_is_refused_the_same_day_or_the_next(tmp_path: Path, day: str) -> None:
    before = _books(tmp_path)

    refused = _add(tmp_path, day, "26.00 EUR")

    assert refused.returncode == 1, refused.stdout  # type: ignore[attr-defined]
    assert "silently insert" in refused.stderr  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_the_true_same_day_assertion_is_written(tmp_path: Path) -> None:
    _books(tmp_path)

    written = _add(tmp_path, "2024-01-03", "25.00 EUR")

    assert written.returncode == 0, written.stderr  # type: ignore[attr-defined]
    assert json.loads(written.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check").returncode == 0


def test_an_import_of_the_wrong_same_day_assertion_is_blocked(tmp_path: Path) -> None:
    before = _books(tmp_path)

    preview = _bea(tmp_path, "import", "bank.statement", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "bank.statement", "--config", "importer.py", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["blocked"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_staged_pad_still_completes_silently(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
        "2024-01-02 pad Assets:Cash Equity:Opening\n"
    )

    written = _add(tmp_path, "2024-01-03", "100.00 USD")

    assert written.returncode == 0, written.stderr  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check").returncode == 0
