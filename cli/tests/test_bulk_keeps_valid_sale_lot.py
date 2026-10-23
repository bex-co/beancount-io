"""An eager same-day reorder must not change which lot a valid sale takes (w5/1002).

The existing sale books against the old inventory as written; moving its
same-day purchase in front made LIFO/HIFO take the new 200 USD lot, so the
combined profit fell from 100 to 0. Only the independent sale whose inferred
purchase comes later needs moving.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Existing HOOL "{method}"
2024-01-01 open Assets:New HOOL "FIFO"
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening USD
2024-01-01 commodity HOOL
2024-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
2024-01-02 * "Old holding"
  Assets:Existing 2 HOOL {{100 USD, "Old"}}
  Assets:Cash -200 USD
"""
ROWS = [
    {
        "date": "2024-02-01",
        "narration": "Existing sale",
        "postings": [
            {"account": "Assets:Existing", "amount": "-1 HOOL {USD} @ 150 USD"},
            {"account": "Assets:Cash", "amount": "150 USD"},
            {"account": "Income:Gains"},
        ],
    },
    {
        "date": "2024-02-01",
        "narration": "New sale",
        "postings": [
            {"account": "Assets:New", "amount": "-1 HOOL {USD} @ 150 USD"},
            {"account": "Assets:Cash", "amount": "150 USD"},
            {"account": "Income:Gains"},
        ],
    },
    {
        "date": "2024-02-01",
        "narration": "Existing buy",
        "postings": [
            {"account": "Assets:Existing", "amount": '1 HOOL {200 USD, "New"}'},
            {"account": "Assets:Cash", "amount": "-200 USD"},
        ],
    },
    {
        "date": "2024-02-01",
        "narration": "Inferred buy",
        "postings": [
            {
                "account": "Assets:New",
                "units": {"number": None, "currency": "HOOL"},
                "cost": {"number": "100", "currency": "USD"},
            },
            {"account": "Assets:Cash", "amount": "-100 USD"},
        ],
    },
]


@pytest.mark.parametrize("method", ["LIFO", "HIFO"])
def test_the_existing_sale_keeps_its_old_lot(tmp_path: Path, method: str) -> None:
    (tmp_path / "main.bean").write_text(BASE.format(method=method))
    (tmp_path / "batch.json").write_text(json.dumps(ROWS))

    result = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(result.stdout)["data"]["written"] == 4
    gains = _bea(tmp_path, "query", "SELECT sum(number) WHERE account='Income:Gains'")
    assert json.loads(gains.stdout)["data"]["rows"] == [["-100"]]
