"""`doctor context`/`linked`/`region` resolve a relative location against the ledger (w3/355)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAIN = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
include "txns/jan.bean"

2020-01-03 * "root dinner"
  Expenses:Food   2.00 USD
  Assets:Cash    -2.00 USD
"""
JAN = """2020-01-02 * "jan lunch"
  Expenses:Food   1.00 USD
  Assets:Cash    -1.00 USD
"""


def _bea(cwd: Path, home: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(home / "config"),
        XDG_CACHE_HOME=str(home / "cache"),
        XDG_DATA_HOME=str(home / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
    )


@pytest.fixture
def books(tmp_path: Path) -> Path:
    root = tmp_path / "books"
    (root / "txns").mkdir(parents=True)
    (root / "main.bean").write_text(MAIN)
    (root / "txns" / "jan.bean").write_text(JAN)
    (tmp_path / "foreign").mkdir()
    return root


@pytest.mark.parametrize(
    ("op", "location"), [("context", "txns/jan.bean:1"), ("linked", "txns/jan.bean:1"), ("region", "txns/jan.bean:1:3")]
)
def test_relative_location_resolves_from_a_foreign_cwd(books: Path, tmp_path: Path, op: str, location: str) -> None:
    result = _bea(tmp_path / "foreign", tmp_path, "doctor", op, str(books / "main.bean"), location)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "No entry could be found" not in result.stdout
    assert "jan lunch" in result.stdout or "Transaction Id" in result.stdout


def test_a_cwd_relative_location_still_works_from_inside_the_tree(books: Path, tmp_path: Path) -> None:
    result = _bea(books, tmp_path, "doctor", "context", "main.bean", "txns/jan.bean:1")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "Transaction Id" in result.stdout


def test_an_absolute_location_is_untouched(books: Path, tmp_path: Path) -> None:
    location = f"{books / 'txns' / 'jan.bean'}:1"
    result = _bea(tmp_path / "foreign", tmp_path, "doctor", "context", str(books / "main.bean"), location)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "Transaction Id" in result.stdout


def test_a_line_only_region_is_untouched(books: Path, tmp_path: Path) -> None:
    # No filename in the region, so there is nothing to resolve: it still names
    # lines of the root ledger, and those lines hold the root transaction.
    result = _bea(books, tmp_path, "doctor", "region", "main.bean", "6:8")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "root dinner" in result.stdout


def test_a_location_naming_no_file_anywhere_still_fails(books: Path, tmp_path: Path) -> None:
    result = _bea(tmp_path / "foreign", tmp_path, "doctor", "context", str(books / "main.bean"), "txns/nope.bean:1")
    assert "No entry could be found" in result.stdout + result.stderr


COLON_MAIN = '2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\ninclude "tx:jan.bean"\n'
COLON_JAN = '2026-01-02 * "colon fixture" ^colon\n  Assets:Cash  100 USD\n  Equity:Opening  -100 USD\n'
COLON_OPS = [("context", "tx:jan.bean:1"), ("linked", "tx:jan.bean:1"), ("region", "tx:jan.bean:1:3")]


@pytest.fixture
def colon_books(tmp_path: Path) -> Path:
    root = tmp_path / "books"
    root.mkdir()
    (root / "main.bean").write_text(COLON_MAIN)
    (root / "tx:jan.bean").write_text(COLON_JAN)
    (tmp_path / "foreign").mkdir()
    return root


@pytest.mark.skipif(sys.platform == "win32", reason="a colon is not a filename character there")
@pytest.mark.parametrize(("op", "location"), COLON_OPS)
def test_a_colon_in_the_relative_filename_belongs_to_the_filename(
    colon_books: Path, tmp_path: Path, op: str, location: str
) -> None:
    """w5/062: the location was cut at its first colon, so `tx` was looked up and the include never found."""
    main = colon_books / "main.bean"
    before = {path.name: path.read_bytes() for path in colon_books.iterdir()}

    relative = _bea(tmp_path / "foreign", tmp_path, "doctor", op, str(main), location)
    absolute = _bea(tmp_path / "foreign", tmp_path, "doctor", op, str(main), f"{colon_books}/{location}")

    assert absolute.returncode == 0, absolute.stdout + absolute.stderr
    assert relative.returncode == 0, relative.stdout + relative.stderr
    assert "100 USD" in relative.stdout
    assert relative.stdout == absolute.stdout
    assert {path.name: path.read_bytes() for path in colon_books.iterdir()} == before


@pytest.mark.skipif(sys.platform == "win32", reason="a colon is not a filename character there")
def test_a_colon_filename_in_the_cwd_still_wins(colon_books: Path, tmp_path: Path) -> None:
    """An existing cwd-relative file keeps precedence over the ledger's directory."""
    foreign = tmp_path / "foreign"
    (foreign / "tx:jan.bean").write_text("; not part of the ledger\n")

    result = _bea(foreign, tmp_path, "doctor", "context", str(colon_books / "main.bean"), "tx:jan.bean:1")

    assert result.returncode != 0
    assert "100 USD" not in result.stdout


def test_a_numeric_only_location_is_untouched(books: Path, tmp_path: Path) -> None:
    result = _bea(tmp_path / "foreign", tmp_path, "doctor", "context", str(books / "main.bean"), "6")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "root dinner" in result.stdout
