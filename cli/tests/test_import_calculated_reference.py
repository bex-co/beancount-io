"""A reference only a plugin gives a written row is no record that a payment was imported (w5/1014).

The plugin copies the B1 payment, or rewrites it in place, carrying B2 instead;
date, header and postings stay those of the line, so the copy passed as the
file's own declaration. A real, different B2 payment then previewed duplicate
and was never written: the file held B1 only, Cash 990 rather than 980.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from beancount.core.data import Transaction
__plugins__ = ('change_reference',)
def change_reference(entries, options, config):
    mode, key, value = config.split('|')
    out = []
    for e in entries:
        if not isinstance(e, Transaction) or e.narration != NARRATION:
            out.append(e)
            continue
        meta = e.meta.copy()
        meta[key] = value
        derived = e._replace(meta=meta)
        out.extend([derived] if mode == 'replace' else [e, derived])
    return out, []
"""
OPENS = (
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n2024-01-01 open Expenses:Food USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)
SOURCE = '2024-02-01 * "ID source"\n  KEY: "VALUE"\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
SPEC = "date=Date,narration=Description,amount=Amount,id=Reference"
IMPORTER = """from beancount.parser import parser
class Reader:
    name = 'bank-reference'
    def identify(self, file): return str(file).endswith('.statement')
    def account(self, file): return 'Assets:Cash'
    def extract(self, file, existing_entries=None):
        rows, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return rows
CONFIG = [Reader()]
"""


def _books(tmp_path: Path, mode: str, *, key: str = "bank_id", old: str = "B1", new: str = "B2") -> Path:
    (tmp_path / "qa_reference.py").write_text(PLUGIN.replace("NARRATION", repr("ID source")))
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        f'option "insert_pythonpath" "TRUE"\nplugin "qa_reference" "{mode}|{key}|{new}"\n'
        + OPENS
        + SOURCE.replace("KEY", key).replace("VALUE", old)
    )
    return ledger


def _csv(tmp_path: Path, reference: str) -> list[str]:
    (tmp_path / "bank.csv").write_text(f"Date,Description,Amount,Reference\n2024-02-01,Bank row,-10.00,{reference}\n")
    return ["import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash", "--default-account", "Expenses:Food"]


def _written(result: object) -> int:
    assert result.returncode == 0, result.stderr or result.stdout  # type: ignore[attr-defined]
    return int(json.loads(result.stdout)["data"]["written"])  # type: ignore[attr-defined]


@pytest.mark.parametrize("flags", [[], ["--duplicates", "skip"]], ids=["default", "skip"])
@pytest.mark.parametrize("mode", ["copy", "replace"])
def test_a_reference_only_the_plugin_gives_is_imported_once(tmp_path: Path, mode: str, flags: list[str]) -> None:
    ledger = _books(tmp_path, mode)
    args = _csv(tmp_path, "B2")

    assert _written(_bea(tmp_path, *args, *flags, "--apply")) == 1
    assert _written(_bea(tmp_path, *args, *flags, "--apply")) == 0
    text = ledger.read_text()
    assert text.count('bank_id: "B1"') == 1
    assert text.count('import-id: "bank:B2"') == 1


@pytest.mark.parametrize("mode", ["copy", "replace"])
def test_the_written_reference_still_skips_its_repeat(tmp_path: Path, mode: str) -> None:
    ledger = _books(tmp_path, mode)
    before = ledger.read_bytes()

    assert _written(_bea(tmp_path, *_csv(tmp_path, "B1"), "--apply")) == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(("key", "flags"), [("fitid", []), ("receipt_id", ["--id-key", "receipt_id"])])
def test_a_python_importer_reference_only_the_plugin_gives_is_imported(
    tmp_path: Path, key: str, flags: list[str]
) -> None:
    ledger = _books(tmp_path, "copy", key=key)
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / "bank.statement").write_text(
        f'2024-02-01 * "Bank row"\n  {key}: "B2"\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
    )
    args = ["import", "bank.statement", "--config", "importer.py", *flags, "--apply"]

    assert _written(_bea(tmp_path, *args)) == 1
    assert _written(_bea(tmp_path, *args)) == 0
    assert ledger.read_text().count(f'{key}: "B2"') == 1


def _seed(tmp_path: Path, ledger: str, narration: str) -> str:
    (tmp_path / ledger).write_text(OPENS)
    (tmp_path / f"{ledger}.csv").write_text(f"Date,Description,Amount\n2024-02-01,{narration},-10.00\n")
    args = ["import", f"{ledger}.csv", "--csv", "date=Date,narration=Description,amount=Amount"]
    result = _bea(
        tmp_path, *args, "--account", "Assets:Cash", "--default-account", "Expenses:Food", "--apply", ledger=ledger
    )
    assert _written(result) == 1
    (found,) = re.findall(r'import-id: "(csv:sha256:[0-9a-f]{16})"', (tmp_path / ledger).read_text())
    return found


@pytest.mark.parametrize("mode", ["copy", "replace"])
def test_a_generated_id_only_the_plugin_gives_is_imported(tmp_path: Path, mode: str) -> None:
    books_id = _seed(tmp_path, "producer.bean", "Books store")
    train_id = _seed(tmp_path, "main.bean", "Train ticket")
    assert books_id != train_id
    (tmp_path / "qa_generated.py").write_text(PLUGIN.replace("NARRATION", repr("Train ticket")))
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        f'option "insert_pythonpath" "TRUE"\nplugin "qa_generated" "{mode}|import-id|{books_id}"\n' + ledger.read_text()
    )
    (tmp_path / "books.csv").write_text("Date,Description,Amount\n2024-02-01,Books store,-10.00\n")
    args = ["import", "books.csv", "--csv", "date=Date,narration=Description,amount=Amount"]
    args += ["--account", "Assets:Cash", "--default-account", "Expenses:Food", "--apply"]

    assert _written(_bea(tmp_path, *args)) == 1
    assert _written(_bea(tmp_path, *args)) == 0
    assert ledger.read_text().count(f'import-id: "{books_id}"') == 1
