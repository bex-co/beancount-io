"""An import names the implied price from its own FX row that defeats its quote (w5/1052).

With `implicit_prices`, an FX transaction's USD 0.80 EUR rate wins the day
over an imported EUR 1.20 USD quote. The advisory looked for the winner only
among entries already in the ledger, so an FX row in the same import made
the quote unused without a word.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
{plugin}2024-01-01 open Assets:Cash EUR
2024-01-01 open Assets:Dollars USD
2024-01-01 open Equity:Opening EUR
2024-01-01 * "Capital"
  Assets:Cash 100 EUR
  Equity:Opening -100 EUR
"""
PRICE = "2024-01-05 price EUR 1.20 USD\n"
FX = '2024-01-05 * "FX"\n  bank_id: "FX1"\n  Assets:Cash -80 EUR\n  Assets:Dollars 100 USD @ 0.80 EUR\n'
IMPORTER = """from pathlib import Path
from beancount.parser import parser

class Imp:
    def identify(self, file): return str(file).endswith(".txt")
    def account(self, file): return "Assets:Cash"
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_string(Path(file).read_text())
        assert not errors, errors
        return entries

CONFIG = [Imp()]
"""
PLUGIN = 'plugin "beancount.plugins.implicit_prices"\n'


def _import(tmp_path: Path, statement: str, *flags: str, plugin: str = PLUGIN) -> dict[str, object]:
    if not (tmp_path / "main.bean").exists():
        (tmp_path / "main.bean").write_text(LEDGER.format(plugin=plugin))
    (tmp_path / "importers.py").write_text(IMPORTER)
    (tmp_path / "bank.txt").write_text(statement)
    result = _bea(tmp_path, "import", "bank.txt", "--config", "importers.py", *flags)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("order", ["price-first", "txn-first"])
@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_the_same_import_fx_row_is_named(tmp_path: Path, order: str, flags: list[str]) -> None:
    statement = PRICE + FX if order == "price-first" else FX + PRICE

    data = _import(tmp_path, statement, *flags)

    (warning,) = [w for w in data["validation_warnings"] if "never used" in w]  # type: ignore[attr-defined]
    assert "A transaction this import writes implies a 2024-01-05 price" in warning
    assert "staging" not in warning and "bea-" not in warning
    if flags:
        assert data["written"] == 2


def test_without_implicit_prices_the_quote_stays_quiet(tmp_path: Path) -> None:
    data = _import(tmp_path, PRICE + FX, "--apply", plugin="")

    assert not [w for w in data["validation_warnings"] if "never used" in w]  # type: ignore[attr-defined]
