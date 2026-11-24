"""A month file under a year index is checked through the root once a sibling has entries (w1/375).

The includer climb stopped at the first includer that defines nothing and adds
entries, taking it for a Fava or forecast overlay. A year index whose other
month holds a transaction looked exactly like one, so a write on a month file
was checked against that file alone: every account the root opens looked
unknown, following the `add open` remedy wrote duplicate opens, and a close or
a balance that contradicts the root landed with exit 0. Entries posting to
accounts their closure never opens cannot load without a root above, so such
an index is a pass-through and the climb reaches the root.

That rule alone left the first write into a new month (w1/377): an empty
month file beside a sibling holding only prices, events, commodities or an
account-free `custom` names no account at all, so the index loaded on its own
and still read as an overlay. A conflicting price landed with exit 0 and the
unknown-account remedy wrote a duplicate `open`. An overlay extends the
ledger below it; an index whose other files name nothing that month opens
extends nothing, so the climb passes through it whatever the month holds.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.ledger import write

ROOT = Path(__file__).resolve().parents[1]
MAIN = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
include "2026/index.bean"
"""
JAN = '2026-01-05 * "Jan lunch"\n  Expenses:Food  5.00 USD\n  Assets:Checking\n'
SIBLINGS = {
    "transaction": '2026-02-05 * "Feb lunch"\n  Expenses:Food  6.00 USD\n  Assets:Checking\n',
    "price": "2026-02-01 price EUR 1.10 USD\n",
}


@pytest.fixture(params=sorted(SIBLINGS))
def books(tmp_path: Path, request: pytest.FixtureRequest) -> Path:
    books = tmp_path / "books"
    (books / "2026").mkdir(parents=True)
    (books / "main.bean").write_text(MAIN)
    (books / "2026" / "index.bean").write_text('include "01.bean"\ninclude "02.bean"\n')
    (books / "2026" / "01.bean").write_text(JAN)
    (books / "2026" / "02.bean").write_text(SIBLINGS[request.param])
    return books


def _bea(books: Path, ledger: str, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(books.parent / "config"),
        XDG_CACHE_HOME=str(books.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", "--file", str(books / ledger), *args],
        env=env,
        cwd=books.parent,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def test_a_write_on_a_month_lands_there_checked_through_the_root(books: Path) -> None:
    added = _bea(
        books,
        "2026/01.bean",
        "add",
        "transaction",
        "Jan snack",
        "--date",
        "2026-01-06",
        "-p",
        "Expenses:Food 1.00 USD",
        "-p",
        "Assets:Checking",
    )

    assert added.returncode == 0, added.stderr
    assert f"01.bean is included by {books / 'main.bean'}; the write goes to 01.bean" in added.stderr
    assert '2026-01-06 * "Jan snack"' in (books / "2026" / "01.bean").read_text()
    check = _bea(books, "main.bean", "check")
    assert check.returncode == 0, check.stdout + check.stderr


@pytest.mark.parametrize(
    ("args", "refusal"),
    [
        (
            ("add", "balance", "--date", "2026-03-01", "--account", "Assets:Checking", "--amount", "0 USD"),
            "Balance failed",
        ),
        (
            ("add", "close", "--account", "Assets:Checking", "--date", "2026-01-02", "--force"),
            "inactive account 'Assets:Checking'",
        ),
    ],
    ids=["balance", "close"],
)
def test_a_write_contradicting_the_root_is_refused(books: Path, args: tuple[str, ...], refusal: str) -> None:
    result = _bea(books, "2026/01.bean", *args)

    assert result.returncode == 1, result.stdout + result.stderr
    assert refusal in result.stderr
    assert (books / "2026" / "01.bean").read_text() == JAN


def test_the_unknown_account_remedy_names_the_root(books: Path) -> None:
    result = _bea(
        books,
        "2026/01.bean",
        "add",
        "transaction",
        "Cafe",
        "--date",
        "2026-01-08",
        "-p",
        "Expenses:Fodo 1.00 USD",
        "-p",
        "Assets:Checking",
    )

    assert result.returncode == 1, result.stdout + result.stderr
    assert "To create it, use bea --file books/main.bean add open --account Expenses:Fodo" in result.stderr
    assert "unknown account 'Assets:Checking'" not in result.stderr
    assert (books / "2026" / "01.bean").read_text() == JAN


def test_a_failing_check_on_a_month_names_the_root(books: Path) -> None:
    result = _bea(books, "2026/01.bean", "check")

    assert result.returncode == 1
    assert f"01.bean is included by {books / 'main.bean'}" in result.stdout + result.stderr


def test_the_into_recipe_names_the_root(books: Path) -> None:
    hints = write.root_ledger_hints(books / "2026" / "01.bean")

    assert len(hints) == 1
    assert f"bea --file {books / 'main.bean'} <command> --into 2026/01.bean" in hints[0]


ACCOUNT_FREE = {
    "price": "2026-01-02 price EUR 1.10 USD\n",
    "event": '2026-01-02 event "location" "Paris"\n',
    "commodity": "2026-01-01 commodity EUR\n",
    "custom": '2026-01-01 custom "x" "y"\n',
}
#: A new month before its first transaction: nothing yet, or only an account it opens.
NEW_MONTHS = {"empty": "", "open-only": "2026-01-10 open Liabilities:Card USD\n"}


def _new_month(tmp_path: Path, month: str, sibling: str) -> Path:
    books = tmp_path / "books"
    (books / "2026").mkdir(parents=True)
    (books / "main.bean").write_text(MAIN)
    (books / "2026" / "index.bean").write_text('include "01.bean"\ninclude "prices.bean"\n')
    (books / "2026" / "01.bean").write_text(NEW_MONTHS[month])
    (books / "2026" / "prices.bean").write_text(ACCOUNT_FREE[sibling])
    return books


@pytest.mark.parametrize("month", sorted(NEW_MONTHS))
@pytest.mark.parametrize("sibling", sorted(ACCOUNT_FREE))
def test_a_new_month_beside_account_free_entries_writes_through_the_root(
    tmp_path: Path, month: str, sibling: str
) -> None:
    books = _new_month(tmp_path, month, sibling)

    added = _bea(
        books,
        "2026/01.bean",
        "add",
        "transaction",
        "Jan lunch",
        "--date",
        "2026-01-05",
        "-p",
        "Expenses:Food 5.00 USD",
        "-p",
        "Assets:Checking",
    )

    assert added.returncode == 0, added.stderr
    assert f"01.bean is included by {books / 'main.bean'}; the write goes to 01.bean" in added.stderr
    assert '2026-01-05 * "Jan lunch"' in (books / "2026" / "01.bean").read_text()
    assert write.root_ledger_hints(books / "2026" / "01.bean") == [
        f"01.bean is included by {books / 'main.bean'}; on its own it lacks the accounts and options that root "
        f"provides. Run against the root and pick the destination with --into: "
        f"bea --file {books / 'main.bean'} <command> --into 2026/01.bean."
    ]


@pytest.mark.parametrize("month", sorted(NEW_MONTHS))
def test_a_same_day_price_in_the_sibling_is_a_conflict(tmp_path: Path, month: str) -> None:
    books = _new_month(tmp_path, month, "price")

    result = _bea(books, "2026/01.bean", "add", "price", "--date", "2026-01-02", "-c", "EUR", "--amount", "1.20 USD")

    assert result.returncode == 4, result.stdout + result.stderr
    assert "EUR already has a 2026-01-02 price of 1.10 USD" in result.stderr
    assert (books / "2026" / "01.bean").read_text() == NEW_MONTHS[month]


@pytest.mark.parametrize("sibling", ["price", "event"])
def test_an_empty_month_names_the_root_in_the_remedy_and_refuses_a_duplicate_open(tmp_path: Path, sibling: str) -> None:
    books = _new_month(tmp_path, "empty", sibling)

    unknown = _bea(
        books,
        "2026/01.bean",
        "add",
        "transaction",
        "Cafe",
        "--date",
        "2026-01-08",
        "-p",
        "Expenses:Fodo 1.00 USD",
        "-p",
        "Assets:Checking",
    )
    reopen = _bea(books, "2026/01.bean", "add", "open", "--account", "Assets:Checking", "--date", "2026-01-01")

    assert unknown.returncode == 1, unknown.stdout + unknown.stderr
    assert "To create it, use bea --file books/main.bean add open --account Expenses:Fodo" in unknown.stderr
    assert "unknown account 'Assets:Checking'" not in unknown.stderr
    assert reopen.returncode == 1, reopen.stdout + reopen.stderr
    assert "Duplicate open directive for Assets:Checking" in reopen.stderr
    assert (books / "2026" / "01.bean").read_text() == ""
    assert _bea(books, "main.bean", "check").returncode == 0
