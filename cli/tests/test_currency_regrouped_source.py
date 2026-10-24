"""A written transaction whose currencies booking regroups is still the written one (w5/1013).

Native booking returns the USD postings, then the EUR ones. Compared by
position, the source differed from its own booked copy, so a plugin's header
copy beside it made both generated: the source left `--on-disk` and its
unchanged bank statement was written again.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea

PLUGIN = """from beancount.core.data import Transaction
__plugins__ = ('copy_row',)
def copy_row(entries, options):
    out = []
    for e in entries:
        out.append(e)
        if isinstance(e, Transaction) and e.narration == 'Mixed expense':
            out.append(e._replace(meta=e.meta.copy(), narration='Derived expense'))
    return out, []
"""
TRADE = (
    '2024-02-01 * "Mixed expense"\n  bank_id: "X1"\n  Assets:USD -10.00 USD\n  Expenses:EUR 20.00 EUR\n'
    "  Assets:EUR -20.00 EUR\n  Expenses:USD 10.00 USD\n"
)
OPEN = "".join(f"2024-01-01 open {a}\n" for a in ("Assets:USD", "Assets:EUR", "Expenses:USD", "Expenses:EUR"))
IMPORTER = (
    "from beancount.parser import parser\nclass Reader:\n    name = 'mixed'\n"
    "    def identify(self, file): return str(file).endswith('.statement')\n"
    "    def account(self, file): return 'Assets:USD'\n"
    "    def extract(self, file, existing_entries=None):\n"
    "        entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return entries\n"
    "CONFIG = [Reader()]\n"
)


def _books(tmp_path: Path) -> Path:
    (tmp_path / "qa_copy.py").write_text(PLUGIN)
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "insert_pythonpath" "TRUE"\nplugin "qa_copy"\n' + OPEN + TRADE)
    (tmp_path / "importer.py").write_text(IMPORTER)
    return ledger


def test_the_regrouped_source_stays_on_disk(tmp_path: Path) -> None:
    _books(tmp_path)

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")

    assert [row["narration"] for row in json.loads(on_disk.stdout)["data"]] == ["Mixed expense"]


def test_its_unchanged_statement_is_not_written_again(tmp_path: Path) -> None:
    ledger = _books(tmp_path)
    (tmp_path / "expense.statement").write_text(TRADE)
    before = ledger.read_bytes()

    repeat = _bea(tmp_path, "import", "expense.statement", "--config", "importer.py", "--apply")

    assert repeat.returncode == 0, repeat.stdout
    assert json.loads(repeat.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


def test_a_copy_that_changes_an_amount_is_still_generated(tmp_path: Path) -> None:
    _books(tmp_path)
    (tmp_path / "qa_copy.py").write_text(
        PLUGIN.replace(
            "narration='Derived expense'))",
            "postings=[p._replace(units=p.units._replace(number=p.units.number * 2)) for p in e.postings]))",
        )
    )

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")

    assert [row["narration"] for row in json.loads(on_disk.stdout)["data"]] == ["Mixed expense"]
    assert json.loads(on_disk.stdout)["data"][0]["postings"][0]["units"]["number"] == "-10.00"


# The line leaves the EUR Cash amount to booking beside a stated USD one; booking
# returns the stated USD leg first, which the omitted line also agrees with.
INFERRED = (
    '2024-02-01 * "Mixed expense"\n  Assets:Cash\n  Assets:Cash -10.00 USD\n'
    "  Expenses:USD 10.00 USD\n  Expenses:EUR 20.00 EUR\n"
)
STATED = (
    '2024-02-01 * "Mixed expense"\n  Assets:Cash -20.00 EUR\n  Assets:Cash -10.00 USD\n'
    "  Expenses:USD 10.00 USD\n  Expenses:EUR 20.00 EUR\n"
)


def _inferred_books(tmp_path: Path) -> Path:
    (tmp_path / "qa_copy.py").write_text(PLUGIN)
    ledger = tmp_path / "main.bean"
    opens = "2024-01-01 open Assets:Cash USD, EUR\n2024-01-01 open Expenses:USD USD\n2024-01-01 open Expenses:EUR EUR\n"
    ledger.write_text('option "insert_pythonpath" "TRUE"\nplugin "qa_copy"\n' + opens + INFERRED)
    (tmp_path / "importer.py").write_text(IMPORTER.replace("'Assets:USD'", "'Assets:Cash'"))
    return ledger


def test_a_source_whose_inferred_leg_shares_an_account_with_a_stated_one_stays_on_disk(tmp_path: Path) -> None:
    _inferred_books(tmp_path)

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")

    assert [row["narration"] for row in json.loads(on_disk.stdout)["data"]] == ["Mixed expense"]


def test_its_explicit_statement_keeps_the_review_and_skip(tmp_path: Path) -> None:
    ledger = _inferred_books(tmp_path)
    (tmp_path / "expense.statement").write_text(STATED)
    before = ledger.read_bytes()

    args = ["import", "expense.statement", "--config", "importer.py", "--apply"]
    default = _bea(tmp_path, *args)
    skipped = _bea(tmp_path, *args, "--duplicates", "skip")

    assert default.returncode == 4, default.stdout
    assert skipped.returncode == 0, skipped.stdout
    assert json.loads(skipped.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before
