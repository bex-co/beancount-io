"""A repeated allowed currency is one currency for transaction inference (w5/959).

An existing native file may open `Assets:Cash USD, USD`. That allows one
commodity, but the bare numbered posting was refused as ambiguous because the
raw list held two entries, unless a sole operating currency masked it.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

CAPITAL = '2024-01-01 * "Capital"\n  Assets:Cash 100 {unit}\n  Equity:Opening -100 {unit}\n'


def _books(tmp_path: Path, opens: str, unit: str = "USD") -> None:
    (tmp_path / "main.bean").write_text(
        f"{opens}2024-01-01 open Expenses:Food USD\n2024-01-01 open Equity:Opening USD\n" + CAPITAL.format(unit=unit)
    )


def _snack(tmp_path: Path) -> object:
    return _bea(
        tmp_path,
        "add",
        "transaction",
        "--date",
        "2024-01-02",
        "--narration",
        "Snack",
        "-p",
        "Assets:Cash -4.50",
        "-p",
        "Expenses:Food",
    )


@pytest.mark.parametrize(
    "opens", ["2024-01-01 open Assets:Cash USD, USD\n", "2024-01-01 open Assets:Cash USD,USD,USD\n"]
)
def test_a_repeated_currency_infers_the_one_commodity(tmp_path: Path, opens: str) -> None:
    _books(tmp_path, opens)

    added = _snack(tmp_path)

    assert added.returncode == 0, added.stderr  # type: ignore[attr-defined]
    assert "-4.50 USD" in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0
    totals = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    assert json.loads(totals.stdout)["data"]["rows"] == [["95.50"]]


def test_two_genuinely_different_currencies_are_still_ambiguous(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text("2024-01-01 open Assets:Cash USD, EUR\n2024-01-01 open Expenses:Food USD\n")
    before = (tmp_path / "main.bean").read_bytes()

    refused = _snack(tmp_path)

    assert refused.returncode == 2, refused.stdout  # type: ignore[attr-defined]
    assert "Currency is ambiguous" in refused.stderr  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
