"""A native reference that looks like a generated hash stays a native reference (w5/1020).

A bank reference `sha256:0123456789abcdef` is written as
`import-id: "bank:sha256:0123456789abcdef"`, whose spelling matched the
generated-ID pattern. It was then treated as a content hash: a corrected
amount under the same reference was skipped as a duplicate, and a payment
under another namespace with the same raw reference was skipped too.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
IMPORTER = """import datetime, json
from decimal import Decimal
from beancount.core.amount import Amount
from beancount.core.data import Transaction, Posting, new_metadata

class Rows:
    name = "Statement references"
    def identify(self, path): return str(path).endswith(".json")
    def account(self, path): return "Assets:Cash"
    def extract(self, path, existing=None):
        row = json.load(open(path))
        n = Decimal(row["amount"])
        meta = new_metadata(str(path), 1)
        meta[row["key"]] = row["reference"]
        return [Transaction(meta, datetime.date(2024, 2, 1), "*", None, "Coffee", frozenset(), frozenset(), [
            Posting("Assets:Cash", Amount(-n, "USD"), None, None, None, None),
            Posting("Expenses:Food", Amount(n, "USD"), None, None, None, None)])]

CONFIG = [Rows()]
"""
HASHLIKE = "sha256:0123456789abcdef"


def _cash(tmp_path: Path) -> str:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    return str(json.loads(result.stdout)["data"]["rows"][0][0])


def _csv(tmp_path: Path, name: str, amount: str, reference: str | None) -> list[str]:
    header = "Date,Description,Amount" + (",Reference" if reference else "")
    row = f"2024-02-01,Coffee,{amount}" + (f",{reference}" if reference else "")
    (tmp_path / name).write_text(f"{header}\n{row}\n")
    mapping = "date=Date,narration=Description,amount=Amount" + (",id=Reference" if reference else "")
    return ["import", name, "--csv", mapping, "--account", "Assets:Cash", "--default-account", "Expenses:Food"]


def _json(tmp_path: Path, name: str, key: str, amount: str, reference: str) -> list[str]:
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / name).write_text(json.dumps({"key": key, "reference": reference, "amount": amount}))
    keys = ["--id-key", "bank_id", "--id-key", "fitid", "--id-key", "receipt_id"]
    return ["import", name, "--config", "importer.py", *keys]


@pytest.mark.parametrize("reference", [HASHLIKE, "B1"], ids=["hashlike", "plain"])
@pytest.mark.parametrize("source", ["csv", "fitid", "receipt_id"])
def test_a_corrected_amount_under_the_same_reference_conflicts(tmp_path: Path, reference: str, source: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    if source == "csv":
        original = _csv(tmp_path, "original.csv", "-10.00", reference)
        changed = _csv(tmp_path, "changed.csv", "-20.00", reference)
    else:
        original = _json(tmp_path, "original.json", source, "10.00", reference)
        changed = _json(tmp_path, "changed.json", source, "20.00", reference)
    assert _bea(tmp_path, *original, "--apply").returncode == 0
    assert json.loads(_bea(tmp_path, *original, "--apply").stdout)["data"]["written"] == 0
    after = (tmp_path / "main.bean").read_bytes()

    preview = _bea(tmp_path, *changed)
    applied = _bea(tmp_path, *changed, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]
    assert applied.returncode == 4
    assert (tmp_path / "main.bean").read_bytes() == after
    assert _cash(tmp_path) == "990.00"


@pytest.mark.parametrize("reference", [HASHLIKE, "B1"], ids=["hashlike", "plain"])
def test_the_same_reference_in_another_namespace_is_another_payment(tmp_path: Path, reference: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    assert _bea(tmp_path, *_json(tmp_path, "bank.json", "bank_id", "10.00", reference), "--apply").returncode == 0

    receipt = _json(tmp_path, "receipt.json", "receipt_id", "20.00", reference)
    applied = _bea(tmp_path, *receipt, "--apply")

    assert applied.returncode == 0, applied.stderr
    assert json.loads(applied.stdout)["data"]["written"] == 1
    assert _cash(tmp_path) == "970.00"
    assert json.loads(_bea(tmp_path, *receipt, "--apply").stdout)["data"]["written"] == 0


@pytest.mark.parametrize("prefix", ["csv", "bank", "receipt_id"])
def test_a_genuine_generated_id_still_proves_its_row_after_cleanup(tmp_path: Path, prefix: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    original = _csv(tmp_path, "original.csv", "-10.00", None)
    assert _bea(tmp_path, *original, "--apply").returncode == 0
    text = (tmp_path / "main.bean").read_text()
    text = text.replace("-10.00 USD", "-12.00 USD").replace(" 10.00 USD", " 12.00 USD")
    text = re.sub(r'import-id: "csv:sha256:', f'import-id: "{prefix}:sha256:', text)
    (tmp_path / "main.bean").write_text(text)

    repeat = _bea(tmp_path, *original, "--apply")

    assert repeat.returncode == 0, repeat.stderr
    assert json.loads(repeat.stdout)["data"]["written"] == 0


def test_an_ofx_fitid_that_looks_like_a_hash_still_conflicts(tmp_path: Path) -> None:
    from tests.conftest import write_ofx

    (tmp_path / "main.bean").write_text(LEDGER + "2024-01-01 open Expenses:Uncategorized USD\n")
    write_ofx(tmp_path / "original.ofx", [("DEBIT", "20240201", "-10.00", HASHLIKE, "Coffee", None)])
    write_ofx(tmp_path / "corrected.ofx", [("DEBIT", "20240201", "-20.00", HASHLIKE, "Coffee", None)])
    first = _bea(tmp_path, "import", "original.ofx", "--account", "Assets:Cash", "--apply")
    if first.returncode == 2 and "beangulp" in first.stderr.lower():
        pytest.skip("the engine has no beangulp for OFX")
    assert first.returncode == 0, first.stderr

    applied = _bea(tmp_path, "import", "corrected.ofx", "--account", "Assets:Cash", "--apply")

    assert applied.returncode == 4
    assert _cash(tmp_path) == "990.00"
