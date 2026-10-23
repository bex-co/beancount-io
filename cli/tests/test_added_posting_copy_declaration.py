"""A plugin copy that adds postings in a new account or currency is not written (w5/1004).

The copy kept the source's amounts and header and added a balanced pair, so
every stated total still matched and it passed as the written transaction: a
changed statement matching the added postings was skipped as a duplicate.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from decimal import Decimal
from beancount.core.data import Transaction, Posting
from beancount.core.amount import Amount
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for entry in entries:
        out.append(entry)
        if isinstance(entry, Transaction) and entry.narration == 'Source row':
            posts = list(entry.postings) + [
                Posting(FIRST, Amount(Decimal('-20.00'), CCY), None, None, None, None),
                Posting(SECOND, Amount(Decimal('20.00'), CCY), None, None, None, None)]
            out.append(entry._replace(meta=entry.meta.copy(), postings=posts))
    return out, []
"""
ORIGINAL = '2024-02-01 * "Source row"\n  bank_id: "source-10"\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
IMPORTER = (
    "from beancount.parser import parser\nclass Reader:\n    name = 'local-correction'\n"
    "    def identify(self, file): return str(file).endswith('.statement')\n"
    "    def account(self, file): return {account!r}\n"
    "    def extract(self, file, existing_entries=None):\n"
    "        entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return entries\n"
    "CONFIG = [Reader()]\n"
)
FORMS = {
    "accounts": ("Assets:Adjustment", "Expenses:Adjustment", "USD", "Assets"),
    "currency": ("Assets:Cash", "Expenses:Food", "EUR", "Assets:Cash"),
}


def _books(tmp_path: Path, kind: str) -> tuple[str, str]:
    first, second, currency, account = FORMS[kind]
    (tmp_path / "qa_derive.py").write_text(
        PLUGIN.replace("FIRST", repr(first)).replace("SECOND", repr(second)).replace("CCY", repr(currency))
    )
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\noption "insert_pythonpath" "TRUE"\nplugin "qa_derive" "extra"\n'
        + "".join(
            f"2024-01-01 open {a} USD,EUR\n" for a in dict.fromkeys(("Assets:Cash", "Expenses:Food", first, second))
        )
        + ORIGINAL
    )
    (tmp_path / "importer.py").write_text(IMPORTER.format(account=account))
    return first, second


@pytest.mark.parametrize("kind", list(FORMS))
def test_the_added_posting_copy_is_generated_and_a_correction_conflicts(tmp_path: Path, kind: str) -> None:
    first, second = _books(tmp_path, kind)
    currency = FORMS[kind][2]

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")
    assert len(json.loads(on_disk.stdout)["data"]) == 1

    (tmp_path / "correction.statement").write_text(
        ORIGINAL + f"  {first} -20.00 {currency}\n  {second} 20.00 {currency}\n"
    )
    before = (tmp_path / "main.bean").read_bytes()
    changed = _bea(tmp_path, "import", "correction.statement", "--config", "importer.py", "--apply")

    assert changed.returncode == 4, changed.stdout
    assert (tmp_path / "main.bean").read_bytes() == before

    (tmp_path / "correction.statement").write_text(ORIGINAL)
    repeat = _bea(tmp_path, "import", "correction.statement", "--config", "importer.py", "--apply")
    assert json.loads(repeat.stdout)["data"]["written"] == 0


INFERRED_PLUGIN = """from decimal import Decimal
from beancount.core.data import Transaction
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for entry in entries:
        out.append(entry)
        if isinstance(entry, Transaction) and entry.narration == 'Source row':
            posts = []
            for p in entry.postings:
                if p.account == 'Assets:Cash':
                    factor = Decimal('2') if p.units.currency == 'USD' else Decimal('0.5')
                    posts.append(p._replace(units=p.units._replace(number=p.units.number * factor)))
                else:
                    half = p._replace(units=p.units._replace(number=p.units.number / Decimal('2')))
                    posts.extend([half, half])
            out.append(entry._replace(meta=entry.meta.copy(), postings=posts))
    return out, []
"""


@pytest.mark.parametrize("omitted", [True, False], ids=["eur-left-to-booking", "eur-stated"])
def test_an_open_currency_does_not_hide_a_stated_one_in_the_same_account(tmp_path: Path, omitted: bool) -> None:
    (tmp_path / "qa_derive.py").write_text(INFERRED_PLUGIN)
    cash_eur = "  Assets:Cash EUR\n" if omitted else "  Assets:Cash -20.00 EUR\n"
    source = (
        '2024-02-01 * "Source row"\n  bank_id: "source-10"\n  Assets:Cash -10.00 USD @ 1.00 EUR\n'
        + cash_eur
        + "  Expenses:Food 30.00 EUR\n"
    )
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\noption "insert_pythonpath" "TRUE"\nplugin "qa_derive" "extra"\n'
        "2024-01-01 open Assets:Cash USD,EUR\n2024-01-01 open Expenses:Food EUR\n" + source
    )

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--sort", "newest", "--limit", "1")

    rows = json.loads(on_disk.stdout)["data"]
    assert len(rows) == 1
    assert len(rows[0]["postings"]) == 3


def test_a_stated_and_an_inferred_amount_in_one_currency_is_still_written(tmp_path: Path) -> None:
    """Cash states 150 USD and leaves the rest to booking; the lot split changes the posting count (w5/1004)."""
    (tmp_path / "qa_copy.py").write_text(
        "from beancount.core.data import Transaction\n__plugins__ = ('copy',)\n"
        "def copy(entries, options):\n    out = []\n    for e in entries:\n        out.append(e)\n"
        "        if isinstance(e, Transaction) and e.narration == 'Sell':\n"
        "            out.append(e._replace(meta=e.meta.copy(), narration='Derived'))\n    return out, []\n"
    )
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\noption "insert_pythonpath" "TRUE"\nplugin "qa_copy"\n'
        '2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Assets:Cash USD\n'
        "2024-01-01 open Equity:Opening USD\n2024-01-01 open Income:Gains USD\n"
        '2024-01-02 * "Buy"\n  Assets:Stock 1 HOOL {100 USD, 2024-01-02}\n  Equity:Opening -100 USD\n'
        '2024-01-03 * "Buy"\n  Assets:Stock 1 HOOL {100 USD, 2024-01-03}\n  Equity:Opening -100 USD\n'
        '2024-02-01 * "Sell"\n  bank_id: "S1"\n  Assets:Stock -2 HOOL {} @ 200 USD\n'
        "  Assets:Cash 150 USD\n  Assets:Cash USD\n  Income:Gains -100 USD\n"
    )

    on_disk = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")

    narrations = [row["narration"] for row in json.loads(on_disk.stdout)["data"]]
    assert narrations.count("Sell") == 1
    assert "Derived" not in narrations
