"""The used-pad guard judges an imported assertion against the whole batch (w5/951).

A newest-first importer lists the assertion before the receipt it follows. The
guard saw only rows visited earlier, so a stale 200 EUR statement was accepted
and an old pad silently inserted -50 EUR against a real 50 EUR receipt, while
the correct 250 EUR statement was blocked.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Equity:Opening
2024-01-01 open Income:Other EUR
2024-01-05 * "Dollars"
  Assets:Checking 1000.00 USD
  Equity:Opening
2024-01-06 * "Euros"
  Assets:Checking 200.00 EUR
  Equity:Opening
2024-01-09 pad Assets:Checking Equity:Opening
2024-01-10 balance Assets:Checking 1100.00 USD
"""
STATEMENT = """{day}-02 balance Assets:Checking {amount} EUR
2024-02-01 * "Euro receipt"
  Assets:Checking 50.00 EUR
  Income:Other -50.00 EUR
"""
IMPORTER = """from pathlib import Path
from beancount.parser import parser
from beancount.core.data import Transaction, Balance

NEWEST_FIRST = {newest_first}

class Rows:
    def identify(self, file):
        return str(file).endswith(".bank")
    def account(self, file):
        return "Assets:Checking"
    def extract(self, file, existing=None):
        entries, errors, options = parser.parse_string(Path(str(file)).read_text())
        assert not errors, errors
        return sorted(
            [e for e in entries if isinstance(e, (Transaction, Balance))],
            key=lambda e: e.date, reverse=NEWEST_FIRST,
        )

CONFIG = [Rows()]
"""


def _books(tmp_path: Path, amount: str, newest_first: bool) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(newest_first=newest_first))
    (tmp_path / "statement.bank").write_text(STATEMENT.format(day="2024-02", amount=amount))


def _run(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "statement.bank", "--config", "importer.py", *flags)


@pytest.mark.parametrize("newest_first", [True, False], ids=["newest-first", "oldest-first"])
def test_the_correct_assertion_is_written(tmp_path: Path, newest_first: bool) -> None:
    _books(tmp_path, "250.00", newest_first)

    preview = _run(tmp_path)
    applied = _run(tmp_path, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]].count("blocked") == 0  # type: ignore[attr-defined]
    assert applied.returncode == 0, applied.stdout  # type: ignore[attr-defined]
    assert json.loads(applied.stdout)["data"]["written"] == 2  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check").returncode == 0
    flagged = _bea(tmp_path, "list", "transaction", "--flag", "P", "--limit", "100")
    assert len(json.loads(flagged.stdout)["data"]) == 1  # only the original USD pad


@pytest.mark.parametrize("newest_first", [True, False], ids=["newest-first", "oldest-first"])
def test_the_stale_assertion_is_blocked_not_padded(tmp_path: Path, newest_first: bool) -> None:
    _books(tmp_path, "200.00", newest_first)
    before = (tmp_path / "main.bean").read_bytes()

    applied = _run(tmp_path, "--apply")

    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
