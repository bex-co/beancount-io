"""An inferred cost component is solved, not taken as zero, before import compares or hashes (w5/950).

`{# 0.50 USD}` was compared as 0.25 per share whatever the cash leg paid, so two
purchases at different prices shared a lot, a generated id and a verdict:
the second was skipped as a duplicate even under `--duplicates include`, and
with a bank id an unchanged repeat of the first conflicted with its own write.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = "2024-01-01 open Assets:Broker HOOL\n2024-01-01 open Assets:Cash USD\n"
IMPORTER = """from pathlib import Path
from beancount.parser import parser
from beancount.core.data import Transaction

USE_BANK_ID = {bank}

class Rows:
    def identify(self, file):
        return str(file).endswith(".trade")
    def account(self, file):
        return "Assets:Broker"
    def extract(self, file, existing=None):
        entries, errors, options = parser.parse_string(Path(str(file)).read_text())
        assert not errors, errors
        rows = [entry for entry in entries if isinstance(entry, Transaction)]
        for entry in rows:
            if USE_BANK_ID:
                entry.meta["bank_id"] = "trade-001"
        return rows

CONFIG = [Rows()]
"""
TRADE = '2024-01-02 * "Trade"\n  Assets:Broker 2 HOOL {cost}\n  Assets:Cash {cash} USD\n'
FORMS = {"per-unit": "{# 0.50 USD}", "total": "{5 # USD}", "explicit": "{5 # 0.50 USD}"}


def _books(tmp_path: Path, first: str, second: str, *, bank: bool = False) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(bank=bank))
    (tmp_path / "a.trade").write_text(TRADE.format(cost=first, cash="-10.50"))
    (tmp_path / "b.trade").write_text(TRADE.format(cost=second, cash="-20.50"))


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, "--config", "importer.py", *flags)


def _holdings(tmp_path: Path) -> list[object]:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Broker'")
    return json.loads(result.stdout)["data"]["rows"][0]  # type: ignore[no-any-return]


@pytest.mark.parametrize(("first", "second"), [("{# 0.50 USD}", "{# 0.50 USD}"), ("{5 # USD}", "{5 # USD}")])
def test_two_trades_at_different_cash_prices_are_both_written(tmp_path: Path, first: str, second: str) -> None:
    _books(tmp_path, first, second)

    assert _import(tmp_path, "a.trade", "--apply").returncode == 0  # type: ignore[attr-defined]
    preview = _import(tmp_path, "b.trade")
    applied = _import(tmp_path, "b.trade", "--duplicates", "include", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["new"]  # type: ignore[attr-defined]
    assert json.loads(applied.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert [str(value) for value in _holdings(tmp_path)] == ["4"]
    assert _bea(tmp_path, "check").returncode == 0


@pytest.mark.parametrize("form", list(FORMS))
@pytest.mark.parametrize("bank", [False, True], ids=["generated-id", "bank-id"])
def test_an_unchanged_repeat_skips_and_never_conflicts(tmp_path: Path, form: str, bank: bool) -> None:
    _books(tmp_path, FORMS[form], FORMS[form], bank=bank)

    first = _import(tmp_path, "a.trade", "--apply")
    repeat = _import(tmp_path, "a.trade")
    again = _import(tmp_path, "a.trade", "--apply")

    assert first.returncode == 0, first.stderr  # type: ignore[attr-defined]
    assert [row["status"] for row in json.loads(repeat.stdout)["data"]["rows"]] == ["duplicate"]  # type: ignore[attr-defined]
    assert again.returncode == 0, again.stderr  # type: ignore[attr-defined]
    assert json.loads(again.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]


def test_a_real_bank_id_correction_still_conflicts(tmp_path: Path) -> None:
    _books(tmp_path, "{# 0.50 USD}", "{# 0.50 USD}", bank=True)

    assert _import(tmp_path, "a.trade", "--apply").returncode == 0  # type: ignore[attr-defined]
    corrected = _import(tmp_path, "b.trade", "--apply")

    assert corrected.returncode == 4, corrected.stdout  # type: ignore[attr-defined]
