"""Native `query --source` refuses to write over the files it reads (w4/181).

`--source` hands the query to native Beanquery, which opens `--output`
itself, and that branch returned before the alias guard `--file` runs:
`bea query --source main.bean --output main.bean '…'` replaced the books with
an ASCII table and exited 0. The source is now resolved the way upstream does
and checked, includes and links included, before the native writer starts.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAIN = 'include "child.bean"\n2024-01-02 * "Start"\n  Assets:Cash 1000 USD\n  Equity:OpeningBalances\n'
CHILD = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:OpeningBalances USD\n"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _digest(tmp_path: Path) -> dict[str, str]:
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(tmp_path.glob("*.*")) if p.is_file()}


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(MAIN)
    (tmp_path / "child.bean").write_text(CHILD)
    (tmp_path / "t.csv").write_text("a,b\n1,2\n")
    (tmp_path / "sym.bean").symlink_to(tmp_path / "main.bean")
    os.link(tmp_path / "main.bean", tmp_path / "hard.bean")
    return tmp_path / "main.bean"


@pytest.mark.parametrize(
    ("source", "destination", "query"),
    [
        ("{main}", "main.bean", "SELECT account"),
        ("beancount:{main}", "main.bean", "SELECT account"),
        ("{main}", "sym.bean", "SELECT account"),
        ("{main}", "hard.bean", "SELECT account"),
        ("{main}", "child.bean", "SELECT account"),
        ("csv:{csv}", "t.csv", "SELECT a FROM t"),
    ],
    ids=["path", "beancount-uri", "symlink", "hardlink", "include", "csv"],
)
def test_output_onto_a_source_file_is_refused(
    tmp_path: Path, books: Path, source: str, destination: str, query: str
) -> None:
    before = _digest(tmp_path)
    spec = source.format(main=books, csv=tmp_path / "t.csv")
    result = _bea(tmp_path, "query", "--source", spec, "--output", str(tmp_path / destination), query)

    assert result.returncode == 2, result.stdout + result.stderr
    assert "would overwrite" in result.stderr
    assert _digest(tmp_path) == before
    assert _bea(tmp_path, "--file", str(books), "check").returncode == 0


def test_a_distinct_destination_still_exports(tmp_path: Path, books: Path) -> None:
    out = tmp_path / "result.txt"
    result = _bea(tmp_path, "query", "--source", str(books), "--output", str(out), "SELECT account LIMIT 1")
    assert result.returncode == 0, result.stderr
    assert "Assets:Cash" in out.read_text()
    assert books.read_text() == MAIN
