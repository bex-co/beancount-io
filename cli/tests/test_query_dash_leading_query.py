"""A query is always data, never an option, and never silently skipped (w1/155).

A dash-leading query such as `--output=main.bean` reached `bean-query`'s
option parser before the `--` separator landed (w1/043); after it, the native
shell ran nothing for a line with no leading identifier and exited 0. The
`--file` path forwarded the query ahead of its options, so the engine parsed
it as `--output` and failed with its own internal command line.

Also pins w1/154: a `#` or `?` in a bare `--source` path names the same file
upstream loads, so the ledger-alias refusal still applies.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAIN = (
    'include "parts/a.bean"\n2024-01-01 open Assets:Cash\n2024-01-01 open Expenses:Food\n'
    '2024-02-01 * "x"\n  Expenses:Food 5 USD\n  Assets:Cash\n'
)
PART = "2024-01-01 open Assets:Bank\n"


def _bea(cwd: Path, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(cwd / "config"),
        XDG_CACHE_HOME=str(cwd / "cache"),
        HOME=str(cwd / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "parts").mkdir()
    (tmp_path / "main.bean").write_text(MAIN, encoding="utf-8")
    (tmp_path / "parts" / "a.bean").write_text(PART, encoding="utf-8")
    return tmp_path


def _unchanged(books: Path) -> bool:
    main = (books / "main.bean").read_text(encoding="utf-8")
    part = (books / "parts" / "a.bean").read_text(encoding="utf-8")
    return main == MAIN and part == PART


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_a_dash_leading_query_is_bad_bql_not_an_option(books: Path, native: bool) -> None:
    where = ["query", "--source", "main.bean"] if native else ["--file", "main.bean", "query"]
    done = _bea(books, *where, "--", "--output=main.bean", stdin="SELECT account\n")

    assert done.returncode == 2, done.stderr
    assert "syntax error" in done.stderr
    assert "bea-engine" not in done.stderr
    assert done.stdout == ""
    assert _unchanged(books)


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_a_query_opening_with_a_comment_runs(books: Path, native: bool) -> None:
    where = ["query", "--source", "main.bean"] if native else ["--file", "main.bean", "query"]
    done = _bea(books, *where, "-f", "csv", "/* first */ SELECT 1 AS n LIMIT 1")

    assert done.returncode == 0, done.stderr
    assert done.stdout.split() == ["n", "1"]


@pytest.mark.parametrize("source", ["main.bean#x", "main.bean?x"])
@pytest.mark.parametrize("destination", ["main.bean", "parts/a.bean"])
def test_a_marked_bare_source_still_protects_the_ledger(books: Path, source: str, destination: str) -> None:
    done = _bea(books, "query", "--source", source, "--output", destination, "SELECT account")

    assert done.returncode == 2, done.stderr
    assert "would overwrite the ledger it reads" in done.stderr
    assert _unchanged(books)


def test_a_marked_bare_source_still_exports_elsewhere(books: Path) -> None:
    done = _bea(books, "query", "--source", "main.bean#x", "--output", "out.txt", "SELECT account")

    assert done.returncode == 0, done.stderr
    assert "Expenses:Food" in (books / "out.txt").read_text(encoding="utf-8")
