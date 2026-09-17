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
