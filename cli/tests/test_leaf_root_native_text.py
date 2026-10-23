"""A leaf's root is found whatever native spelling the root's directives use (w5/934).

The root-fact scan matched only `YYYY-MM-DD open` with a space, ASCII account
names and no BOM, so a root opening `2024-1-1 open Assets:Cash` was not the
root of its leaf: a note was refused as an unknown account, and the suggested
`add open` succeeded in the leaf and broke the whole ledger with a duplicate
open.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

ENTRIES = 'option "operating_currency" "USD"\n2024-01-03 note Assets:Cash "Original note"\n'
CAPITAL = """2024-01-02 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""


def _root(opens: str, bom: str = "") -> str:
    return f'{bom}option "operating_currency" "USD"\n{opens}{CAPITAL}include "entries.bean"\n'


OPENS = {
    "padded": "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n",
    "one-digit": "2024-1-1 open Assets:Cash USD\n2024-1-1 open Equity:Opening USD\n",
    "slash": "2024/1/1 open Assets:Cash USD\n2024/1/1 open Equity:Opening USD\n",
    "touching": "2024-01-01open Assets:Cash USD\n2024-01-01open Equity:Opening USD\n",
}


@pytest.mark.parametrize("opens", OPENS.values(), ids=OPENS.keys())
def test_a_leaf_note_routes_through_a_root_with_native_dates(tmp_path: Path, opens: str) -> None:
    root = _root(opens)
    (tmp_path / "main.bean").write_text(root)
    (tmp_path / "entries.bean").write_text(ENTRIES)
    assert _bea(tmp_path, "check").returncode == 0

    noted = _bea(
        tmp_path,
        "add",
        "note",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--comment",
        "Reviewed",
        ledger="entries.bean",
    )
    reopened = _bea(
        tmp_path,
        "add",
        "open",
        "--date",
        "2024-01-01",
        "--account",
        "Assets:Cash",
        "--currency",
        "USD",
        ledger="entries.bean",
    )

    assert noted.returncode == 0, noted.stderr
    assert "Reviewed" in (tmp_path / "entries.bean").read_text()
    assert reopened.returncode != 0, reopened.stdout
    assert (tmp_path / "entries.bean").read_text().count("open Assets:Cash") == 0
    assert (tmp_path / "main.bean").read_text() == root
    assert _bea(tmp_path, "check").returncode == 0


def test_a_root_whose_first_line_is_a_bom_open_is_still_the_root(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_bytes(b'\xef\xbb\xbf2024-01-01 open Assets:Cash USD\ninclude "entries.bean"\n')
    (tmp_path / "entries.bean").write_text(
        "2024-01-01 open Equity:Opening USD\n"
        '2024-02-01 * "Opening"\n  Assets:Cash 100.00 USD\n  Equity:Opening -100.00 USD\n'
    )

    noted = _bea(
        tmp_path,
        "add",
        "note",
        "--date",
        "2024-02-02",
        "--account",
        "Assets:Cash",
        "--comment",
        "Reconciled",
        ledger="entries.bean",
    )

    assert noted.returncode == 0, noted.stderr
    assert _bea(tmp_path, "check").returncode == 0


def test_a_bom_before_the_root_only_option_keeps_the_currency_default(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_bytes(b'\xef\xbb\xbfoption "operating_currency" "USD"\ninclude "entries.bean"\n')
    (tmp_path / "entries.bean").write_text("2024-01-01 open Assets:Cash\n2024-01-01 open Expenses:Food\n")

    added = _bea(
        tmp_path,
        "add",
        "transaction",
        "Coffee",
        "--date",
        "2024-02-01",
        "-p",
        "Expenses:Food 7.75",
        "-p",
        "Assets:Cash",
        ledger="entries.bean",
    )

    assert added.returncode == 0, added.stderr
    assert "7.75 USD" in (tmp_path / "entries.bean").read_text()


def test_an_accented_account_root_does_not_make_the_overlay_plugin_the_root(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text('plugin "beancount.plugins.auto_accounts"\ninclude "entries.bean"\n')
    (tmp_path / "entries.bean").write_text(
        'option "name_assets" "Áctivos"\n'
        "2024-01-01 open Equity:Opening USD\n"
        '2024-01-02 * "Opening"\n  Áctivos:Cash 100 USD\n  Equity:Opening -100 USD\n'
    )
    assert _bea(tmp_path, "check").returncode == 0

    noted = _bea(
        tmp_path,
        "add",
        "note",
        "--date",
        "2024-02-01",
        "--account",
        "Áctivos:Cash",
        "--comment",
        "QA note",
        ledger="entries.bean",
    )

    assert noted.returncode == 0, noted.stderr
    assert "QA note" in (tmp_path / "entries.bean").read_text()


@pytest.mark.parametrize("opens", [OPENS["padded"], OPENS["one-digit"]], ids=["padded", "one-digit"])
def test_a_forecast_overlay_stays_excluded_for_native_dates(tmp_path: Path, opens: str) -> None:
    (tmp_path / "main.bean").write_text(_root(opens))
    (tmp_path / "entries.bean").write_text(ENTRIES)
    (tmp_path / "forecast.bean").write_text(
        'plugin "beancount.plugins.auto_accounts"\ninclude "main.bean"\n'
        '2024-03-01 * "Forecast withdrawal"\n  Assets:Cash -7.00 USD\n  Equity:Opening 7.00 USD\n'
    )

    wrong = _bea(
        tmp_path,
        "add",
        "balance",
        "--date",
        "2024-03-02",
        "--account",
        "Assets:Cash",
        "--amount",
        "993.00 USD",
        ledger="main.bean",
    )
    right = _bea(
        tmp_path,
        "add",
        "balance",
        "--date",
        "2024-03-02",
        "--account",
        "Assets:Cash",
        "--amount",
        "1000.00 USD",
        ledger="main.bean",
    )

    assert wrong.returncode != 0, wrong.stdout
    assert right.returncode == 0, right.stderr
    assert json.loads(_bea(tmp_path, "check").stdout)["data"] is not None
    assert _bea(tmp_path, "check").returncode == 0
