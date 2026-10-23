"""A cover finds the short lot by its cost and the date it is written at (w5/1001).

The short-lot provider netted units by label alone over the whole ledger, so a
long at another cost under the same label hid the real short, and a short a
later cover had already closed by the end of the book was invisible to a
backdated cover. The cover then lost its multi-line label and opened a
positive lot that no later trade removed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LABEL = "First\nLot"
BASE = (
    'option "operating_currency" "USD"\n'
    '2024-01-01 open Assets:Stock HOOL "NONE"\n2024-01-01 open Assets:Cash USD\n'
    "2024-01-01 open Income:Gains USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)


def _lot(day: str, quantity: int, cost: int, acquired: str, cash: int, gain: int | None = None) -> dict[str, object]:
    postings: list[dict[str, object]] = [
        {
            "account": "Assets:Stock",
            "units": {"number": str(quantity), "currency": "HOOL"},
            "cost": {"number": str(cost), "currency": "USD", "date": acquired, "label": LABEL},
        },
        {"account": "Assets:Cash", "units": {"number": str(cash), "currency": "USD"}},
    ]
    if gain is not None:
        postings.append({"account": "Income:Gains", "units": {"number": str(gain), "currency": "USD"}})
    return {"date": day, "narration": f"trade {day}", "postings": postings}


def _text(row: dict[str, object]) -> str:
    out = f'{row["date"]} * "{row["narration"]}"\n'
    for posting in row["postings"]:  # type: ignore[attr-defined]
        units = posting["units"]
        cost = posting.get("cost")
        spec = f' {{{cost["number"]} USD, {cost["date"]}, "{cost["label"]}"}}' if cost else ""
        out += f"  {posting['account']} {units['number']} {units['currency']}{spec}\n"
    return out.replace("\nLot", "\\nLot")


def _add(tmp_path: Path, row: dict[str, object]) -> None:
    (tmp_path / "row.json").write_text(json.dumps([row]))
    result = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "row.json"))
    assert result.returncode == 0, result.stderr or result.stdout


def _positions(tmp_path: Path) -> list[object]:
    result = _bea(tmp_path, "query", "SELECT sum(position) WHERE account='Assets:Stock'")
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


def _closes(tmp_path: Path) -> int:
    return _bea(tmp_path, "add", "close", "--account", "Assets:Stock", "--date", "2024-06-01").returncode


@pytest.mark.parametrize("long_units", [1, 2])
def test_a_long_with_the_same_label_does_not_hide_the_short(tmp_path: Path, long_units: int) -> None:
    long_row = _lot("2024-01-02", long_units, 150, "2024-01-02", -150 * long_units)
    short = _lot("2024-01-03", -1, 100, "2024-01-03", 100)
    (tmp_path / "main.bean").write_text(BASE + _text(long_row) + _text(short))

    _add(tmp_path, _lot("2024-02-01", 1, 100, "2024-01-03", -90, -10))
    _add(tmp_path, _lot("2024-03-01", -long_units, 150, "2024-01-02", 150 * long_units))

    assert _positions(tmp_path) == [[[]]]
    assert _closes(tmp_path) == 0


def test_a_backdated_cover_meets_the_short_open_on_its_date(tmp_path: Path) -> None:
    short = _lot("2024-01-02", -2, 100, "2024-01-02", 200)
    later = _lot("2024-03-01", 2, 100, "2024-01-02", -200)
    (tmp_path / "main.bean").write_text(BASE + _text(short) + _text(later))

    _add(tmp_path, _lot("2024-02-01", 1, 100, "2024-01-02", -90, -10))
    _add(tmp_path, _lot("2024-04-01", -1, 100, "2024-01-02", 100))

    assert _positions(tmp_path) == [[[]]]
    assert _closes(tmp_path) == 0
