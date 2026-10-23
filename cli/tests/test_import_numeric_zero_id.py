"""An importer's numeric zero `import-id` is a supplied identity (w5/943).

Truthiness treated `0` as absent, so the supplied id was replaced by a content
hash: an exact repeat still skipped, but a corrected amount under the same id
was `new` and doubled the payment instead of conflicting, while the string
`"0"`, `7` and `bank_id: 0` all kept their identity.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

IMPORTER = """import datetime
import json
from decimal import Decimal
from beancount.core.amount import Amount
from beancount.core.data import Transaction, Posting, new_metadata

class Rows:
    def identify(self, file):
        return str(file).endswith(".json")
    def account(self, file):
        return "Assets:Cash"
    def extract(self, file, existing=None):
        rows = []
        for number in json.loads(open(file).read())["amounts"]:
            number = Decimal(number)
            meta = new_metadata(str(file), 1)
            meta[{key!r}] = {value}
            rows.append(Transaction(
                meta, datetime.date(2024, 2, 1), "*", None, "Coffee",
                frozenset(), frozenset(), [
                    Posting("Assets:Cash", Amount(-number, "USD"), None, None, None, None),
                    Posting("Expenses:Food", Amount(number, "USD"), None, None, None, None),
                ]))
        return rows

CONFIG = [Rows()]
"""
LEDGER = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
SPELLINGS = [
    ("import-id", "0"),
    ("import-id", "Decimal('0.00')"),
    ("import-id", "'0'"),
    ("import-id", "7"),
    ("bank_id", "0"),
]
IDS = ["int-zero", "decimal-zero", "string-zero", "seven", "bank-id-zero"]


def _books(tmp_path: Path, key: str, value: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(key=key, value=value))
    (tmp_path / "original.json").write_text('{"amounts": ["10.00"]}')
    (tmp_path / "corrected.json").write_text('{"amounts": ["20.00"]}')


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, "--config", "importer.py", *flags)


@pytest.mark.parametrize(("key", "value"), SPELLINGS, ids=IDS)
def test_a_correction_under_the_supplied_id_conflicts(tmp_path: Path, key: str, value: str) -> None:
    _books(tmp_path, key, value)

    first = _import(tmp_path, "original.json", "--apply")
    repeat = _import(tmp_path, "original.json", "--apply")
    after_original = (tmp_path / "main.bean").read_bytes()
    preview = _import(tmp_path, "corrected.json")
    correction = _import(tmp_path, "corrected.json", "--apply")

    assert first.returncode == 0, first.stderr  # type: ignore[attr-defined]
    assert json.loads(first.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]  # type: ignore[attr-defined]
    assert correction.returncode == 4, correction.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == after_original


def test_the_supplied_zero_is_kept_and_reported_as_the_importers(tmp_path: Path) -> None:
    _books(tmp_path, "import-id", "0")

    first = _import(tmp_path, "original.json", "--apply")

    assert (
        "import-id: 0" in (tmp_path / "main.bean").read_text()
        or 'import-id: "0"' in (tmp_path / "main.bean").read_text()
    )
    assert "sha256" not in (tmp_path / "main.bean").read_text()
    assert first.returncode == 0


def test_two_rows_of_one_file_sharing_a_zero_id_with_different_amounts_conflict(tmp_path: Path) -> None:
    _books(tmp_path, "import-id", "0")
    (tmp_path / "both.json").write_text('{"amounts": ["10.00", "20.00"]}')
    before = (tmp_path / "main.bean").read_bytes()

    applied = _import(tmp_path, "both.json", "--apply")

    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
