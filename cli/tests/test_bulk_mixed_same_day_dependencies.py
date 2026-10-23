"""A batch mixing an out-of-order long sale with a valid short pair books whole (w5/980).

Each trade books alone: the long sale needs its purchase first, the short must
be opened before it is covered. Together the same-day rule moved the short open
behind the long purchase's positive rows as well, so the cover found no short;
the batch was refused (atomic) or lost its cover (`--partial`). The order is now
built row by row where none of the whole-batch orders books.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Long HOOL "FIFO"\n'
    '2024-01-01 open Assets:Short HOOL "FIFO"\n2024-01-01 open Assets:Cash USD\n'
    "2024-01-01 open Income:Gains USD\n2024-01-01 open Equity:Opening USD\n2024-01-01 commodity HOOL\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000 USD\n  Equity:Opening -1000 USD\n'
)


def _row(narration: str, *postings: dict[str, str]) -> dict[str, object]:
    return {"date": "2024-02-01", "narration": narration, "postings": list(postings)}


ROWS = [
    _row(
        "Long sale",
        {"account": "Assets:Long", "amount": "-1 HOOL {} @ 150 USD"},
        {"account": "Assets:Cash", "amount": "150 USD"},
        {"account": "Income:Gains"},
    ),
    _row(
        "Long buy",
        {"account": "Assets:Long", "amount": "1 HOOL {100 USD}"},
        {"account": "Assets:Cash", "amount": "-100 USD"},
    ),
    _row(
        "Short open",
        {"account": "Assets:Short", "amount": "-1 HOOL {150 USD}"},
        {"account": "Assets:Cash", "amount": "150 USD"},
    ),
    _row(
        "Short cover",
        {"account": "Assets:Short", "amount": "1 HOOL {} @ 100 USD"},
        {"account": "Assets:Cash", "amount": "-100 USD"},
        {"account": "Income:Gains"},
    ),
]


def _add(tmp_path: Path, rows: list[dict[str, object]], *flags: str) -> object:
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "batch.json").write_text(json.dumps(rows))
    return _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"), *flags)


def _positions(tmp_path: Path) -> dict[str, str]:
    result = _bea(tmp_path, "query", "SELECT account, sum(number) GROUP BY account ORDER BY account")
    return {row[0]: str(row[1]) for row in json.loads(result.stdout)["data"]["rows"]}


@pytest.mark.parametrize("flags", [[], ["--partial"]], ids=["atomic", "partial"])
def test_the_mixed_batch_writes_all_four_rows(tmp_path: Path, flags: list[str]) -> None:
    added = _add(tmp_path, ROWS, *flags)

    assert added.returncode == 0, added.stdout + added.stderr  # type: ignore[attr-defined]
    assert json.loads(added.stdout)["data"]["written"] == 4  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check").returncode == 0
    positions = _positions(tmp_path)
    assert positions["Assets:Cash"] == "1100"
    assert positions["Income:Gains"] == "-100"
    assert positions.get("Assets:Long", "0") in {"0", "0.00"} and positions.get("Assets:Short", "0") in {"0", "0.00"}


@pytest.mark.parametrize("keep", [(0, 1), (2, 3)], ids=["only-long", "only-short"])
def test_each_isolated_pair_still_books(tmp_path: Path, keep: tuple[int, int]) -> None:
    added = _add(tmp_path, [ROWS[i] for i in keep])

    assert added.returncode == 0, added.stdout + added.stderr  # type: ignore[attr-defined]
    assert json.loads(added.stdout)["data"]["written"] == 2  # type: ignore[attr-defined]


def test_a_batch_that_cannot_book_is_still_refused_untouched(tmp_path: Path) -> None:
    rows = [ROWS[0]]  # a sale with no purchase anywhere
    before_added = _add(tmp_path, rows)
    ledger = (tmp_path / "main.bean").read_bytes()

    assert before_added.returncode != 0  # type: ignore[attr-defined]
    assert ledger == BASE.encode()
