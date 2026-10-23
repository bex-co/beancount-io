"""Price guards judge the quotes the files spell, not the plugin's view (w5/992).

A plugin that filters prices hid an existing quote (an exact repeat appended,
a different one wrote without force); one that inverts them made a new reverse
quote read as already authored.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from decimal import Decimal
from beancount.core.amount import Amount
from beancount.core.data import Price
__plugins__ = ('view',)
def view(entries, options, config=None):
    out = []
    for e in entries:
        if isinstance(e, Price):
            if MODE == 'filter':
                continue
            if MODE == 'inverse':
                e = e._replace(currency=e.amount.currency, amount=Amount(Decimal(1) / e.amount.number, e.currency),
                               meta=e.meta.copy())
        out.append(e)
    return out, []
"""
LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_prices"
2024-01-01 open Assets:Euro EUR
2024-01-01 open Equity:Opening USD
2024-01-02 * "Capital"
  Assets:Euro 100.00 EUR @ 1.25 USD
  Equity:Opening -125.00 USD
2024-01-31 price EUR 1.25 USD
"""


def _setup(tmp_path: Path, mode: str) -> bytes:
    (tmp_path / "qa_prices.py").write_text(PLUGIN.replace("MODE", repr(mode)))
    (tmp_path / "main.bean").write_text(LEDGER)
    return (tmp_path / "main.bean").read_bytes()


def _add(tmp_path: Path, currency: str, amount: str, *extra: str) -> object:
    return _bea(tmp_path, "add", "price", "--date", "2024-01-31", "--currency", currency, "--amount", amount, *extra)


def test_a_filtered_quote_still_makes_an_exact_repeat_a_duplicate(tmp_path: Path) -> None:
    before = _setup(tmp_path, "filter")

    result = _add(tmp_path, "EUR", "1.25 USD")

    assert result.returncode == 0, result.stderr  # type: ignore[attr-defined]
    assert json.loads(result.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_filtered_quote_still_conflicts_with_a_different_one(tmp_path: Path) -> None:
    before = _setup(tmp_path, "filter")

    result = _add(tmp_path, "EUR", "1.30 USD")

    assert result.returncode == 4, result.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_an_inverted_view_does_not_hide_a_new_reverse_quote(tmp_path: Path) -> None:
    _setup(tmp_path, "inverse")

    first = _add(tmp_path, "USD", "0.80 EUR")
    repeat = _add(tmp_path, "USD", "0.80 EUR")

    assert json.loads(first.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]


@pytest.mark.parametrize("mode", ["filter", "pass"])
def test_an_imported_quote_repeats_once(tmp_path: Path, mode: str) -> None:
    _setup(tmp_path, mode)
    (tmp_path / "quote.statement").write_text("2024-01-31 price EUR 1.25 USD\n")
    (tmp_path / "importer.py").write_text(
        "from beancount.parser import parser\nclass Quotes:\n"
        "    name = 'quotes'\n"
        "    def identify(self, file): return str(file).endswith('.statement')\n"
        "    def account(self, file): return 'Assets:Euro'\n"
        "    def extract(self, file, existing_entries=None):\n"
        "        es, errs, _ = parser.parse_file(str(file)); assert not errs, errs; return es\n"
        "CONFIG = [Quotes()]\n"
    )
    args = ["import", "quote.statement", "--config", "importer.py", "--apply"]
    before = (tmp_path / "main.bean").read_bytes()

    assert json.loads(_bea(tmp_path, *args).stdout)["data"]["written"] == 0
    assert (tmp_path / "main.bean").read_bytes() == before
