"""A total or compound cost that books the short lot's cost covers it (w5/1006).

`{0 # 100 USD}` and `{50 # 50 USD}` on one share are the same 100 USD lot as
`{100 USD}`, but the matcher compared only the per-unit field, so the cover
lost the multi-line label and opened a positive lot beside the short.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_cover_short_context import BASE, LABEL, _closes, _positions
from tests.test_import_source_facts import _bea


def _cover(tmp_path: Path, number: str | None, total: str, *, cash: str, gain: str | None) -> None:
    postings: list[dict[str, object]] = [
        {
            "account": "Assets:Stock",
            "units": {"number": "1", "currency": "HOOL"},
            "cost": {"number": number, "number_total": total, "currency": "USD", "date": "2024-01-03", "label": LABEL},
        },
        {"account": "Assets:Cash", "units": {"number": cash, "currency": "USD"}},
    ]
    if gain is not None:
        postings.append({"account": "Income:Gains", "units": {"number": gain, "currency": "USD"}})
    (tmp_path / "row.json").write_text(json.dumps([{"date": "2024-02-01", "narration": "Cover", "postings": postings}]))
    result = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "row.json"))
    assert result.returncode == 0, result.stderr or result.stdout


def _short(tmp_path: Path) -> None:
    short = '2024-01-03 * "Short"\n  Assets:Stock -1 HOOL {100 USD, 2024-01-03, "First\\nLot"}\n'
    (tmp_path / "main.bean").write_text(BASE + short + "  Assets:Cash 100.00 USD\n")


@pytest.mark.parametrize(
    ("number", "total"), [("0", "100"), (None, "100"), ("50", "50")], ids=["zero-per", "null-per", "compound"]
)
def test_a_total_cost_cover_empties_the_inventory(tmp_path: Path, number: str | None, total: str) -> None:
    _short(tmp_path)

    _cover(tmp_path, number, total, cash="-90", gain="-10")

    assert _positions(tmp_path) == [[[]]]
    assert _closes(tmp_path) == 0


def test_a_different_effective_cost_is_a_new_lot(tmp_path: Path) -> None:
    _short(tmp_path)

    _cover(tmp_path, "25", "50", cash="-75", gain=None)

    assert _positions(tmp_path) != [[[]]]
    assert _closes(tmp_path) != 0
