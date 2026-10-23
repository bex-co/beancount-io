"""`init` refuses a case-variant of a default name beside an existing default root (w5/945).

On a case-insensitive volume `--file main.BEAN init` created `main.bean`
beside `main.beancount`; cwd discovery prefers `main.bean`, so every later
command read the new empty ledger (0 USD instead of 100 USD). Only the
lowercase spelling was refused, because the name was compared as text.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from cli.commands.init import _folds_case
from tests.test_init_creates_missing_ledger import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Opening"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""


def _books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.beancount").write_text(LEDGER)
    return books


def _init(books: Path, name: str) -> object:
    return _bea(
        books, "--json", "--no-input", "-f", str(books / name), "init", "--currency", "USD", "--date", "2024-01-01"
    )


def test_the_lowercase_target_is_still_refused(tmp_path: Path) -> None:
    books = _books(tmp_path)

    done = _init(books, "main.bean")

    assert done.returncode == 4, done.stdout  # type: ignore[attr-defined]
    assert not (books / "main.bean").exists()


@pytest.mark.parametrize("name", ["main.BEAN", "main.BeAn"])
def test_a_case_variant_target_follows_the_filesystem(tmp_path: Path, name: str) -> None:
    books = _books(tmp_path)
    aliased = _folds_case(books)

    done = _init(books, name)

    if aliased:
        assert done.returncode == 4, done.stdout  # type: ignore[attr-defined]
        assert not (books / name).exists()
        report = _bea(books, "--json", "report", "overview", "--time", "2024", "--conversion", "USD")
        assert json.loads(report.stdout)["data"]["totals"]["net_worth"]["USD"] == "100.00"
    else:
        # Where case counts the variant is just another file.
        assert done.returncode == 0, done.stderr  # type: ignore[attr-defined]


def test_a_custom_name_and_an_empty_directory_still_create(tmp_path: Path) -> None:
    books = _books(tmp_path)
    custom = _init(books, "other.BEAN")
    empty = tmp_path / "empty"
    empty.mkdir()
    fresh = _init(empty, "main.BEAN")

    assert custom.returncode == 0, custom.stderr  # type: ignore[attr-defined]
    assert fresh.returncode == 0, fresh.stderr  # type: ignore[attr-defined]


def test_the_probe_reads_this_volume(tmp_path: Path) -> None:
    (tmp_path / "Probe.txt").write_text("x")

    assert _folds_case(tmp_path) is (tmp_path / "pROBE.TXT").exists()
