"""A reference one statement carries on several dates is reviewed against a partial overlap (w5/948).

A statement with two dated payments under one bank reference imported both into
empty books, but with either payment already present both rows matched the one
ledger occurrence (within the week the date-cleanup policy allows) and were
skipped as duplicates, even under `--duplicates include`, understating spending.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
HEADER = "Date,Amount,Description,Reference\n"
FIRST = "2024-02-29,-7.75,Autopay,autopay-001\n"
SECOND = "2024-03-06,-7.75,Autopay,autopay-001\n"
CSV = [
    "--csv",
    "date=Date,amount=Amount,narration=Description,id=Reference",
    "--account",
    "Assets:Cash",
    "--default-account",
    "Expenses:Food",
]


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, *CSV, *flags)


def _statuses(result: object) -> list[str]:
    return [row["status"] for row in json.loads(result.stdout)["data"]["rows"]]  # type: ignore[attr-defined]


def _cash(tmp_path: Path) -> str:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    return str(json.loads(result.stdout)["data"]["rows"][0][0])


def _books(tmp_path: Path, present: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "present.csv").write_text(HEADER + present)
    (tmp_path / "combined.csv").write_text(HEADER + FIRST + SECOND)
    if present:
        assert _import(tmp_path, "present.csv", "--apply", "--duplicates", "include").returncode == 0  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    ("present", "expected"),
    [(FIRST, ["duplicate", "possible_duplicate"]), (SECOND, ["possible_duplicate", "duplicate"])],
    ids=["earlier-present", "later-present"],
)
def test_the_missing_occurrence_is_reviewed_and_included(tmp_path: Path, present: str, expected: list[str]) -> None:
    _books(tmp_path, present)
    before = (tmp_path / "main.bean").read_bytes()

    preview = _import(tmp_path, "combined.csv")
    refused = _import(tmp_path, "combined.csv", "--apply")
    unchanged = (tmp_path / "main.bean").read_bytes() == before
    included = _import(tmp_path, "combined.csv", "--apply", "--duplicates", "include")

    assert _statuses(preview) == expected
    assert refused.returncode == 4, refused.stdout  # type: ignore[attr-defined]
    assert unchanged
    assert json.loads(included.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert _cash(tmp_path) == "-15.50"
    assert _bea(tmp_path, "check").returncode == 0


def test_both_occurrences_present_are_both_skipped(tmp_path: Path) -> None:
    _books(tmp_path, FIRST + SECOND)

    preview = _import(tmp_path, "combined.csv")
    included = _import(tmp_path, "combined.csv", "--apply", "--duplicates", "include")

    assert _statuses(preview) == ["duplicate", "duplicate"]
    assert json.loads(included.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert _cash(tmp_path) == "-15.50"


def test_empty_books_review_the_second_row(tmp_path: Path) -> None:
    _books(tmp_path, "")

    preview = _import(tmp_path, "combined.csv")

    assert _statuses(preview) == ["new", "possible_duplicate"]


def test_a_single_row_date_edit_within_a_week_still_deduplicates(tmp_path: Path) -> None:
    _books(tmp_path, FIRST)
    (tmp_path / "later.csv").write_text(HEADER + SECOND)

    preview = _import(tmp_path, "later.csv")

    assert _statuses(preview) == ["duplicate"]
