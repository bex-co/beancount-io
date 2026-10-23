"""A BOM on a transaction file's first directive does not hide its written identity (w5/972).

The written-view fallback decoded the file with the BOM in place, so the parser
read the first transaction as nothing. With a plugin filtering that transaction
from the loaded view nothing else supplied the identity, and an unchanged repeat
import wrote the same 100 USD again.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

HEADER = """option "insert_pythonpath" "TRUE"
option "operating_currency" "USD"
plugin "cleared_only"
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Salary USD
include "transactions.bean"
"""
FILTER = """from beancount.core.data import Transaction
__plugins__ = ['run']
def run(entries, options):
    return [e for e in entries if not isinstance(e, Transaction) or e.flag != '!'], []
"""
CSV = ["--csv", "date=Date,narration=Memo,amount=Amount,id=Reference", "--account", "Assets:Cash"]


def _books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(HEADER)
    (tmp_path / "transactions.bean").write_bytes(b"")
    (tmp_path / "cleared_only.py").write_text(FILTER)
    (tmp_path / "salary.csv").write_text("Date,Memo,Amount,Reference\n2024-01-02,Salary,100.00,salary-1\n")
    return tmp_path / "transactions.bean"


def _import(tmp_path: Path, *flags: str) -> object:
    return _bea(
        tmp_path,
        "import",
        "salary.csv",
        *CSV,
        "--default-account",
        "Income:Salary",
        "--into",
        "transactions.bean",
        *flags,
    )


@pytest.mark.parametrize("bom", [False, True], ids=["plain", "bom"])
def test_an_unchanged_repeat_import_writes_nothing(tmp_path: Path, bom: bool) -> None:
    transactions = _books(tmp_path)
    first = _import(tmp_path, "--apply")
    assert json.loads(first.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    authored = transactions.read_bytes().lstrip(b"\n")
    transactions.write_bytes((b"\xef\xbb\xbf" if bom else b"") + authored)

    preview = _import(tmp_path)
    second = _import(tmp_path, "--apply")
    third = _import(tmp_path, "--apply")

    rows = json.loads(preview.stdout)["data"]["rows"]  # type: ignore[attr-defined]
    assert [row["status"] for row in rows] == ["duplicate"]
    assert json.loads(second.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert json.loads(third.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert transactions.read_bytes().count(b"bank_id:") == 1
