"""Directory formatting finds ledger files whatever the case of their suffix (w5/954).

`_walk` compared the on-disk suffix with the two lowercase names, so a
directory holding only `journal.BEAN` scanned nothing: `--check` passed while
checking the file by name said it needed formatting, and `--in-place` refused
for lack of files.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_init_creates_missing_ledger import _bea

UNFORMATTED = """2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""
VARIANTS = ["journal.BEAN", "journal.BeAn", "journal.Beancount", "journal.BEANCOUNT"]


@pytest.mark.parametrize("name", VARIANTS)
def test_a_case_variant_is_checked_previewed_and_formatted(tmp_path: Path, name: str) -> None:
    books = tmp_path / "books"
    books.mkdir()
    ledger = books / name
    ledger.write_text(UNFORMATTED)

    check = _bea(tmp_path, "--json", "format", "--check", str(books))
    preview = _bea(tmp_path, "--json", "format", "--dry-run", str(books))
    applied = _bea(tmp_path, "--json", "format", "--in-place", str(books))
    again = _bea(tmp_path, "--json", "format", "--check", str(books))

    assert check.returncode == 1, check.stdout + check.stderr
    assert json.loads(preview.stdout)["data"]["scanned"] == 1
    assert applied.returncode == 0, applied.stderr
    assert ledger.read_text() != UNFORMATTED
    assert again.returncode == 0, again.stderr


def test_other_suffixes_and_empty_directories_stay_excluded(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "notes.txt").write_text(UNFORMATTED)

    check = _bea(tmp_path, "--json", "format", "--in-place", str(books))

    assert check.returncode == 2, check.stdout + check.stderr
    assert (books / "notes.txt").read_text() == UNFORMATTED


def test_a_nested_variant_beside_a_formatted_file_is_found(tmp_path: Path) -> None:
    books = tmp_path / "books"
    (books / "years").mkdir(parents=True)
    (books / "years" / "journal.BeAn").write_text(UNFORMATTED)

    check = _bea(tmp_path, "--json", "format", "--check", str(books))

    assert check.returncode == 1, check.stdout + check.stderr
