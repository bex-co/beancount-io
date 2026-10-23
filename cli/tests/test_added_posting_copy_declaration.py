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
