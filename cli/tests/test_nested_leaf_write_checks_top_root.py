"""A write to a nested included leaf is checked against the top-level root (w5/346).

`--file` on `sub dir/nested/deep.bean` validated that leaf alone (or, after
w5/343, its nearest includer), so a balance or close that contradicts the
root's own transactions succeeded, and import dedupe missed rows booked in
the root. The climb now reaches the file nothing includes, also when the
intermediate includes a sibling that holds entries of its own (w1/375).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MAIN = """option "operating_currency" "USD"
include "sub dir/extra.bean"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Equity:Opening
2026-01-04 * "Dep" "dep"
  Assets:Bank  100 USD
  Equity:Opening
2026-02-01 * "Spend" "x"
  Expenses:Food 3 USD
  Assets:Bank
"""
LEAF = "2026-01-01 open Assets:Bank USD\n"
SIBLING = '2026-01-10 * "Cash lunch"\n  Expenses:Food  2 USD\n  Assets:Cash\n'


@pytest.fixture(params=["alone", "sibling"])
def books(tmp_path: Path, request: pytest.FixtureRequest) -> Path:
    books = tmp_path / "my books"
    (books / "sub dir" / "nested").mkdir(parents=True)
    (books / "main.bean").write_text(MAIN)
    (books / "sub dir" / "extra.bean").write_text('include "nested/deep.bean"\n')
    (books / "sub dir" / "nested" / "deep.bean").write_text(LEAF)
    if request.param == "sibling":
        # A sibling's entries post to accounts only the root opens: the
        # intermediate is no overlay, so the climb continues past it (w1/375).
        (books / "sub dir" / "extra.bean").write_text('include "nested/deep.bean"\ninclude "nested/other.bean"\n')
        (books / "sub dir" / "nested" / "other.bean").write_text(SIBLING)
    (tmp_path / "elsewhere").mkdir()
    (tmp_path / "elsewhere" / "s.csv").write_text(
        "Date,Payee,Narration,Amount\n2026-02-01,Spend,x,-3.00\n2026-02-05,Cafe,y,-4.00\n"
    )
    return books


def _bea(books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(books.parent / "config"),
        XDG_CACHE_HOME=str(books.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    leaf = books / "sub dir" / "nested" / "deep.bean"
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *args[:1], "-f", str(leaf), *args[1:]],
        env=env,
        cwd=books.parent / "elsewhere",
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


@pytest.mark.parametrize(
    ("args", "refusal"),
    [
        (
            ("add", "balance", "--date", "2026-03-01", "--account", "Assets:Bank", "--amount", "0 USD"),
            "Balance failed",
        ),
        (
            ("add", "close", "--account", "Assets:Bank", "--date", "2026-01-20", "--force"),
            "inactive account 'Assets:Bank'",
        ),
    ],
    ids=["balance", "close"],
)
def test_a_write_contradicting_the_root_is_refused(books: Path, args: tuple[str, ...], refusal: str) -> None:
    result = _bea(books, "--no-input", *args)
    assert result.returncode == 1, result.stdout + result.stderr
    assert refusal in result.stderr
    assert (books / "sub dir" / "nested" / "deep.bean").read_text() == LEAF


def test_import_dedupes_against_the_root(books: Path) -> None:
    mapping = ["--csv", "date=Date,payee=Payee,narration=Narration,amount=Amount", "--account", "Assets:Bank"]
    preview = _bea(books, "--json", "import", "s.csv", *mapping)
    assert preview.returncode == 0, preview.stderr
    rows = json.loads(preview.stdout)["data"]["rows"]
    assert [row["status"] for row in rows] == ["possible_duplicate", "new"]
    assert rows[0]["match"]["filename"].endswith("main.bean")
    applied = _bea(books, "--no-input", "import", "s.csv", *mapping, "--apply")
    assert applied.returncode == 4
    assert (books / "sub dir" / "nested" / "deep.bean").read_text() == LEAF
