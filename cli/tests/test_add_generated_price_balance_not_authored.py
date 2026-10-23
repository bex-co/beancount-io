"""A plugin's calculated price or balance is not authored duplicate evidence (w5/938).

`add price`, import's quote guard and the balance writers asked whether an
existing entry was generated without the loaded entries' shared-location
context, so a calculated GBP price stamped with the EUR price line (or a
calculated Savings assertion stamped with Cash's) passed for a written one:
a forced correction exited 0 writing nothing, and an ordinary add conflicted
with a number no file records.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from tests.test_import_source_facts import _bea

PRICE_PLUGIN = """from decimal import Decimal
from beancount.core.amount import Amount
from beancount.core.data import Price

__plugins__ = ("derive",)

def derive(entries, options):
    out = []
    for entry in entries:
        out.append(entry)
        if isinstance(entry, Price) and entry.currency == "EUR":
            out.append(entry._replace(
                meta=entry.meta.copy(),
                currency="GBP",
                amount=Amount(entry.amount.number * Decimal(13) / Decimal(11), "USD"),
            ))
    return out, []
"""
PRICE_LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_cross"
2024-01-01 open Assets:Cash GBP
2024-01-01 open Equity:Opening GBP
2024-02-01 * "Capital"
  Assets:Cash 100.00 GBP
  Equity:Opening -100.00 GBP
2024-02-01 price EUR 1.10 USD
{authored}"""
IMPORTER = """import datetime
from decimal import Decimal
from beancount.core.amount import Amount
from beancount.core.data import Price, new_metadata

class Quotes:
    def identify(self, file): return str(file).endswith("quote.json")
    def account(self, file): return "Assets:Cash"
    def extract(self, file, existing=None):
        return [Price(new_metadata(str(file), 1), datetime.date(2024, 2, 1), "GBP", Amount(Decimal("1.30"), "USD"))]

CONFIG = [Quotes()]
"""
BALANCE_PLUGIN = """from beancount.core.data import Balance
from beancount.core.amount import Amount
from decimal import Decimal

__plugins__ = ("derive_assertion",)

def derive_assertion(entries, options):
    result = []
    for entry in entries:
        result.append(entry)
        if isinstance(entry, Balance) and entry.account == "Assets:Cash":
            result.append(entry._replace(account="Assets:Savings", amount=Amount(Decimal("{shown}"), "USD")))
    return result, []
"""
BALANCE_LEDGER = """option "insert_pythonpath" "TRUE"
plugin "assertions"
option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Savings USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 7 USD
  Assets:Savings 8 USD
  Equity:Opening -15 USD
2024-02-01 balance Assets:Cash 7 USD
"""


def _price_books(tmp_path: Path, authored: str = "2024-02-01 price GBP 1.20 USD\n") -> None:
    (tmp_path / "qa_cross.py").write_text(PRICE_PLUGIN)
    (tmp_path / "main.bean").write_text(PRICE_LEDGER.format(authored=authored))


def _add_price(tmp_path: Path, amount: str, *flags: str) -> object:
    return _bea(
        tmp_path, "add", "price", "--date", "2024-02-01", "--currency", "GBP", "--amount", f"{amount} USD", *flags
    )


def test_a_forced_price_correction_is_written_over_the_real_quote(tmp_path: Path) -> None:
    _price_books(tmp_path)

    forced = _add_price(tmp_path, "1.30", "--force")

    assert forced.returncode == 0, forced.stderr  # type: ignore[attr-defined]
    assert json.loads(forced.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert re.search(r"price GBP\s+1\.30 USD", (tmp_path / "main.bean").read_text())


def test_an_ordinary_price_conflicts_with_the_real_quote_only(tmp_path: Path) -> None:
    _price_books(tmp_path)
    before = (tmp_path / "main.bean").read_bytes()

    conflict = _add_price(tmp_path, "1.30")
    repeat = _add_price(tmp_path, "1.20")

    assert conflict.returncode == 4, conflict.stdout  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["duplicate"] is True  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_the_calculated_price_is_no_evidence_when_no_quote_is_authored(tmp_path: Path) -> None:
    _price_books(tmp_path, authored="")

    written = _add_price(tmp_path, "1.31")

    assert written.returncode == 0, written.stderr  # type: ignore[attr-defined]
    assert json.loads(written.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]


def test_an_import_conflicts_with_the_authored_quote_not_the_calculated_one(tmp_path: Path) -> None:
    _price_books(tmp_path)
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / "quote.json").write_text("{}")
    before = (tmp_path / "main.bean").read_bytes()

    imported = _bea(tmp_path, "import", "quote.json", "--config", "importer.py", "--apply")

    assert imported.returncode == 4, imported.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_calculated_balance_does_not_stand_for_a_written_one(tmp_path: Path) -> None:
    (tmp_path / "assertions.py").write_text(BALANCE_PLUGIN.format(shown="8"))
    (tmp_path / "main.bean").write_text(BALANCE_LEDGER)

    ordinary = _bea(
        tmp_path, "add", "balance", "--date", "2024-02-01", "--account", "Assets:Savings", "--amount", "8 USD"
    )

    assert ordinary.returncode == 0, ordinary.stderr
    assert json.loads(ordinary.stdout)["data"]["written"] == 1
    assert "balance Assets:Savings" in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0


def test_a_calculated_balance_of_another_precision_is_no_conflict(tmp_path: Path) -> None:
    (tmp_path / "assertions.py").write_text(BALANCE_PLUGIN.format(shown="8.00"))
    (tmp_path / "main.bean").write_text(BALANCE_LEDGER)

    ordinary = _bea(
        tmp_path, "add", "balance", "--date", "2024-02-01", "--account", "Assets:Savings", "--amount", "8 USD"
    )

    assert ordinary.returncode == 0, ordinary.stderr
    assert json.loads(ordinary.stdout)["data"]["written"] == 1
