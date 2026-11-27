"""A month file under a year index that two ledgers include is judged by every one of them (w1/384).

The ambiguity check (w5/775) and the overlay filter (w5/933) looked at the
leaf's own includers. For a month file that is just the year index, which
both roots, or a root and a forecast view over it, include. The climb past
the index then followed whichever includer sorted first: with a backup root
beside the real one the backup judged the write, so a true balance was
refused and a false one landed with exit 0; with a forecast view the planned
entries counted. Renaming either file changed the judge.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.ledger import write

ROOT = Path(__file__).resolve().parents[1]
OPENING = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening
2026-01-01 * "open"
  Assets:Cash 100 USD
  Equity:Opening
include "2026/index.bean"
"""
DINNER = '2026-01-20 * "dinner"\n  Expenses:Food 30 USD\n  Assets:Cash\n'
FORECAST = 'include "main.bean"\n2026-01-10 * "planned dinner"\n  Expenses:Food 30 USD\n  Assets:Cash\n'
JAN = "; january\n"


def _books(tmp_path: Path, files: dict[str, str]) -> Path:
    books = tmp_path / "books"
    (books / "2026").mkdir(parents=True)
    (books / "2026" / "index.bean").write_text('include "jan.bean"\n')
    (books / "2026" / "jan.bean").write_text(JAN)
    for name, text in files.items():
        (books / name).write_text(text)
    return books


def _bea(books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(books.parent / "config"),
        XDG_CACHE_HOME=str(books.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=books,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _balance(books: Path, amount: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        books,
        "--file",
        "2026/jan.bean",
        "add",
        "balance",
        "-a",
        "Assets:Cash",
        "--amount",
        amount,
        "--date",
        "2026-02-01",
    )


@pytest.mark.parametrize("backup", ["main-backup.bean", "zz-backup.bean"])
def test_two_roots_above_a_year_index_refuse_naming_both(tmp_path: Path, backup: str) -> None:
    books = _books(tmp_path, {"main.bean": OPENING + DINNER, backup: OPENING})
    jan = books / "2026" / "jan.bean"

    for amount in ("70 USD", "100 USD"):
        result = _balance(books, amount)

        assert result.returncode == 2, result.stderr
        flat = " ".join(result.stderr.split())
        assert "jan.bean is included by more than one root ledger" in flat
        assert str(books / "main.bean") in flat and str(books / backup) in flat
        assert "--into 2026/jan.bean" in flat
        assert jan.read_text() == JAN


def test_update_under_two_roots_refuses_instead_of_naming_one(tmp_path: Path) -> None:
    main = OPENING + DINNER + "2026-01-01 open Expenses:Groceries USD\n"
    books = _books(tmp_path, {"main.bean": main, "main-backup.bean": OPENING})
    jan = books / "2026" / "jan.bean"
    jan.write_text('2026-01-15 ! "Shop"\n  import-id: "j1"\n  Expenses:Food 5 USD\n  Assets:Cash\n')
    before = jan.read_bytes()

    result = _bea(
        books,
        "--file",
        "2026/jan.bean",
        "update",
        "transaction",
        "--id",
        "j1",
        "--account",
        "Expenses:Food=Expenses:Groceries",
    )

    assert result.returncode == 2, result.stderr
    flat = " ".join(result.stderr.split())
    assert "more than one root ledger" in flat
    assert "add open" not in flat
    assert jan.read_bytes() == before


@pytest.mark.parametrize("overlay", ["forecast.bean", "zforecast.bean"])
def test_forecast_view_above_the_root_never_judges_a_month(tmp_path: Path, overlay: str) -> None:
    books = _books(tmp_path, {"main.bean": OPENING, overlay: FORECAST})
    jan = books / "2026" / "jan.bean"

    false = _balance(books, "70 USD")
    assert false.returncode == 1, false.stderr
    assert f"jan.bean is included by {books / 'main.bean'}" in " ".join(false.stderr.split())
    assert jan.read_text() == JAN

    true = _balance(books, "100 USD")
    assert true.returncode == 0, true.stderr
    assert f"jan.bean is included by {books / 'main.bean'}" in " ".join(true.stderr.split())
    assert "2026-02-01 balance Assets:Cash  100 USD" in jan.read_text()
    assert _bea(books, "--file", "main.bean", "check").returncode == 0


def test_hints_name_every_root_above_a_year_index(tmp_path: Path) -> None:
    books = _books(tmp_path, {"main.bean": OPENING + DINNER, "main-backup.bean": OPENING})
    jan = books / "2026" / "jan.bean"
    main, backup = books / "main.bean", books / "main-backup.bean"

    assert write.defining_roots(jan) == [backup, main]

    read = write.root_read_hint(jan)
    assert read is not None
    assert "more than one root ledger" in read
    assert str(main) in read and str(backup) in read

    (recipe,) = write.root_ledger_hints(jan)
    assert f"bea --file {main} <command> --into 2026/jan.bean" in recipe
    assert f"bea --file {backup} <command> --into 2026/jan.bean" in recipe


def test_a_root_and_a_dead_end_pass_through_above_it_stay_one_root(tmp_path: Path) -> None:
    # A view that includes the year index and defines nothing reaches no root of its own.
    books = _books(tmp_path, {"main.bean": OPENING, "months.bean": 'include "2026/index.bean"\n'})

    assert write.defining_roots(books / "2026" / "jan.bean") == [books / "main.bean"]
