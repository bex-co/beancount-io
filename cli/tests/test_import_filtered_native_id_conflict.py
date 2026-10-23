"""A corrected amount under a native id conflicts even when a plugin filters the original (w5/973).

The loaded view had nothing under the id once a display filter hid the written
row, so the fallback to the files found only a row that disagreed and ruled it
out; the corrected amount then read as a different bank event and was written
beside the original (Cash 210 instead of a refusal).
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
    return {body}, []
"""
FILTERED = "[e for e in entries if not isinstance(e, Transaction) or e.flag != '!']"
CSV = ["--csv", "date=Date,narration=Memo,amount=Amount,id=Reference", "--account", "Assets:Cash"]


def _books(tmp_path: Path, body: str) -> Path:
    (tmp_path / "main.bean").write_text(HEADER)
    (tmp_path / "transactions.bean").write_bytes(b"")
    (tmp_path / "cleared_only.py").write_text(FILTER.format(body=body))
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


@pytest.mark.parametrize("body", [FILTERED, "entries"], ids=["filtered", "pass-through"])
def test_a_corrected_amount_under_the_same_reference_is_a_conflict(tmp_path: Path, body: str) -> None:
    transactions = _books(tmp_path, body)
    assert json.loads(_import(tmp_path, "--apply").stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    written = transactions.read_bytes()
    (tmp_path / "salary.csv").write_text("Date,Memo,Amount,Reference\n2024-01-02,Salary,110.00,salary-1\n")

    preview = _import(tmp_path)
    applied = _import(tmp_path, "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]  # type: ignore[attr-defined]
    assert applied.returncode == 4, applied.stdout  # type: ignore[attr-defined]
    assert transactions.read_bytes() == written


def test_an_unchanged_repeat_under_a_filter_still_deduplicates(tmp_path: Path) -> None:
    transactions = _books(tmp_path, FILTERED)
    _import(tmp_path, "--apply")
    written = transactions.read_bytes()

    repeat = _import(tmp_path, "--apply")

    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert transactions.read_bytes() == written


def test_a_changed_narration_under_a_filter_still_deduplicates(tmp_path: Path) -> None:
    transactions = _books(tmp_path, FILTERED)
    _import(tmp_path, "--apply")
    written = transactions.read_bytes()
    (tmp_path / "salary.csv").write_text("Date,Memo,Amount,Reference\n2024-01-02,Monthly salary,100.00,salary-1\n")

    repeat = _import(tmp_path, "--apply")

    assert json.loads(repeat.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert transactions.read_bytes() == written
