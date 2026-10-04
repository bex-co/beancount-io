"""Generated import ids tell apart rows that differ only in payee (w1/149).

The `csv:sha256:` id hashed `narration or payee`, so `PEETS COFFEE / CARD
PURCHASE -5.00` and `STARBUCKS / CARD PURCHASE -5.00` on one day shared a base
and only the occurrence suffix told them apart. Re-downloading the statement in
a different order handed PEETS the id stored for STARBUCKS: PEETS was an exact
duplicate and lost under every `--duplicates` policy.

Rows with both a payee and a narration now hash both. Ids written before that
(narration only) are still matched, lookup-only: every stored id a group of
same-narration rows reaches is claimed by the row with that entry's payee, then
by export order — so ledgers written by earlier releases keep deduplicating.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
"""
HEADER = "Date,Name,Description,Amount\n"
STARBUCKS = "2026-08-02,STARBUCKS,CARD PURCHASE,-5.00\n"
PEETS = "2026-08-02,PEETS COFFEE,CARD PURCHASE,-5.00\n"


def _digest(base: str, occurrence: int = 1) -> str:
    text = base if occurrence == 1 else f"{base}|{occurrence}"
    return "csv:sha256:" + hashlib.sha256(text.encode()).hexdigest()[:16]


NARRATION_ONLY = "2026-08-02|-5 USD|CARD PURCHASE|Assets:Checking"


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _stored(ledger: Path, payee: str, import_id: str) -> None:
    """An entry as an earlier release wrote it."""
    with ledger.open("a") as stream:
        stream.write(
            f'\n2026-08-02 * "{payee}" "CARD PURCHASE"\n  import-id: "{import_id}"\n'
            "  Assets:Checking  -5.00 USD\n  Expenses:Uncategorized  5.00 USD\n"
        )


def _import(ledger: Path, rows: str, *extra: str) -> tuple[int, dict[str, Any]]:
    source = ledger.parent / "bank.csv"
    source.write_text(HEADER + rows)
    result = CliRunner().invoke(
        app,
        ["--json", "--no-input", "--file", str(ledger), "import", str(source), "--account", "Assets:Checking", *extra],
    )
    if result.exit_code == 0:
        return 0, json.loads(result.stdout)["data"]
    return result.exit_code, json.loads(result.stderr)["error"].get("result") or {}


def _statuses(data: dict[str, Any]) -> list[tuple[str, str]]:
    return [(row["payee"], row["status"]) for row in data["rows"]]


def _payee_count(ledger: Path, payee: str) -> int:
    return ledger.read_text().count(f'"{payee}"')


def test_rows_with_a_payee_hash_payee_and_narration(ledger: Path) -> None:
    code, _ = _import(ledger, STARBUCKS, "--apply")
    assert code == 0
    assert _digest("2026-08-02|-5 USD|STARBUCKS|CARD PURCHASE|Assets:Checking") in ledger.read_text()


@pytest.mark.parametrize("policy", ["review", "skip", "include"])
def test_a_reordered_export_books_each_payee_once(ledger: Path, policy: str) -> None:
    assert _import(ledger, STARBUCKS, "--apply")[0] == 0

    code, data = _import(ledger, PEETS + STARBUCKS, "--apply", "--duplicates", policy)

    assert code == 0
    assert _statuses(data) == [("PEETS COFFEE", "new"), ("STARBUCKS", "duplicate")]
    assert _payee_count(ledger, "PEETS COFFEE") == 1
    assert _payee_count(ledger, "STARBUCKS") == 1


def test_a_narration_only_id_from_an_earlier_release_goes_to_its_payee(ledger: Path) -> None:
    _stored(ledger, "STARBUCKS", _digest(NARRATION_ONLY))

    code, data = _import(ledger, PEETS + STARBUCKS, "--apply")

    assert code == 0
    assert _statuses(data) == [("PEETS COFFEE", "new"), ("STARBUCKS", "duplicate")]
    assert _digest(NARRATION_ONLY) in data["rows"][1]["reason"]
    assert _payee_count(ledger, "PEETS COFFEE") == 1
    assert _payee_count(ledger, "STARBUCKS") == 1


def test_a_whole_earlier_import_still_matches_after_reordering(ledger: Path) -> None:
    # An earlier release imported STARBUCKS then PEETS: occurrences 1 and 2.
    _stored(ledger, "STARBUCKS", _digest(NARRATION_ONLY, 1))
    _stored(ledger, "PEETS COFFEE", _digest(NARRATION_ONLY, 2))
    before = ledger.read_bytes()

    code, data = _import(ledger, PEETS + STARBUCKS, "--apply")

    assert code == 0
    assert _statuses(data) == [("PEETS COFFEE", "duplicate"), ("STARBUCKS", "duplicate")]
    assert data["written"] == 0
    assert ledger.read_bytes() == before


def test_a_narration_only_id_whose_payee_was_edited_still_matches_its_row(ledger: Path) -> None:
    """With no payee to go by, the stored id keeps meaning its export position."""
    _stored(ledger, "Starbucks (morning)", _digest(NARRATION_ONLY))
    before = ledger.read_bytes()

    code, data = _import(ledger, STARBUCKS, "--apply")

    assert code == 0
    assert _statuses(data) == [("STARBUCKS", "duplicate")]
    assert ledger.read_bytes() == before


def test_an_edited_payee_id_stays_with_the_row_at_its_occurrence(ledger: Path) -> None:
    _stored(ledger, "Peets (edited)", _digest(NARRATION_ONLY, 2))
    rows = STARBUCKS + PEETS + "2026-08-02,BLUE BOTTLE,CARD PURCHASE,-5.00\n"

    code, data = _import(ledger, rows, "--apply")

    assert code == 0
    assert _statuses(data) == [("STARBUCKS", "new"), ("PEETS COFFEE", "duplicate"), ("BLUE BOTTLE", "new")]


def test_identical_rows_still_take_occurrence_suffixes(ledger: Path) -> None:
    code, _ = _import(ledger, STARBUCKS + STARBUCKS, "--apply", "--duplicates", "include")
    assert code == 0
    base = "2026-08-02|-5 USD|STARBUCKS|CARD PURCHASE|Assets:Checking"
    text = ledger.read_text()
    assert _digest(base, 1) in text and _digest(base, 2) in text

    code, data = _import(ledger, STARBUCKS + PEETS + STARBUCKS, "--apply")
    assert code == 0
    assert _statuses(data) == [("STARBUCKS", "duplicate"), ("PEETS COFFEE", "new"), ("STARBUCKS", "duplicate")]
