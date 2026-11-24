"""`add transactions --partial` bisects for rows an existing assertion refuses (w5/537).

w5/123 made `--partial` drop the rows a refused batch's errors name, but an
existing balance assertion the batch breaks is reported on the ledger's own
line: no row can be named, and recovery fell back to one full load per row
over a growing batch — 34 seconds for 800 rows. The first refused row is now
found by bisection, so one bad row costs a load per halving.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import pytest

from bea_engine import managed_load, protocol
from bea_engine.ledger import adding

LEDGER = (
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Expenses:Food USD\n"
    "2026-12-31 balance Assets:Checking 0 USD\n"
)


def _rows(count: int, bad: set[int]) -> list[dict[str, Any]]:
    """Rows paying for food in cash; a bad row pays from checking, which the assertion holds at zero."""
    return [
        {
            "date": "2026-02-01",
            "narration": f"r{n}",
            "postings": [
                {"account": "Expenses:Food", "amount": "1 USD"},
                {"account": "Assets:Checking" if n in bad else "Assets:Cash"},
            ],
        }
        for n in range(count)
    ]


@pytest.fixture
def loads(monkeypatch: pytest.MonkeyPatch) -> list[Path]:
    seen: list[Path] = []
    real = managed_load.load_file

    def counting(path: Any, *args: Any, **kwargs: Any) -> Any:
        seen.append(Path(path))
        return real(path, *args, **kwargs)

    monkeypatch.setattr(managed_load, "load_file", counting)
    return seen


def _partial(ledger: Path, rows: list[dict[str, Any]]) -> protocol.LedgerError:
    with pytest.raises(protocol.LedgerError) as raised:
        adding.answer(ledger, "transactions", {"rows": rows, "partial": True})
    return raised.value


def _halvings(count: int) -> int:
    """The loads bisecting `count` rows for one refused row may take."""
    return 2 * math.ceil(math.log2(count)) + 6


def _balance_detail(ledger: Path, row: int, accumulated: str) -> str:
    return f"Row {row}: {ledger}:4: Balance failed for 'Assets:Checking': expected 0 USD != accumulated {accumulated}"


def test_one_assertion_breaking_row_costs_a_load_per_halving(tmp_path: Path, loads: list[Path]) -> None:
    ledger = tmp_path / "main.bean"
    sizes = []
    for count in (100, 400):
        ledger.write_text(LEDGER)
        loads.clear()

        error = _partial(ledger, _rows(count, {count // 2}))

        sizes.append(len(loads))
        assert str(error) == f"Added {count - 1} of {count} transactions; 1 row was rejected."
        assert len(error.details) == 1
        assert error.details[0].startswith(_balance_detail(ledger, count // 2 + 1, "-1 USD"))
        assert error.result == {
            "written": count - 1,
            "written_rows": [n for n in range(count) if n != count // 2],
            "rejected_rows": [count // 2],
        }
        written = ledger.read_text()
        assert written.count(" * ") == count - 1 and f'"r{count // 2}"' not in written

    # A trial per row cost over 100 and 400 loads. A halving costs at most
    # two (a refused candidate also loads the ledger as it was), plus the
    # refused batch, the confirmed rest and the write.
    assert sizes[0] <= _halvings(100) and sizes[1] <= _halvings(400), sizes


def test_several_refused_rows_are_each_found_in_order(tmp_path: Path, loads: list[Path]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    error = _partial(ledger, _rows(200, {5, 120, 121}))

    assert str(error) == "Added 197 of 200 transactions; 3 rows were rejected."
    # Each row is refused after the rows kept before it, as one trial per row decided.
    assert [
        detail.startswith(_balance_detail(ledger, row, "-1 USD"))
        for row, detail in zip((6, 121, 122), error.details, strict=True)
    ] == [True] * 3
    assert error.result is not None and error.result["rejected_rows"] == [5, 120, 121]
    assert ledger.read_text().count(" * ") == 197
    assert len(loads) <= 3 * _halvings(200), len(loads)


def test_a_ledger_refusing_every_write_reports_once_not_per_row(tmp_path: Path, loads: list[Path]) -> None:
    """Without --allow-errors a batch that adds nothing wrong reports the ledger's failure once (w5/725).

    w5/537 judged each row with its own trial; the rows that changed nothing
    were still named with the pre-existing error. The error is quoted as the
    books hold it, and the batch's effect follows as a hint labelled as the
    proposal's (w1/376); no row is judged.
    """
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.replace("Checking 0 USD", "Checking 5 USD"))
    count = 12
    loads.clear()

    error = _partial(ledger, _rows(count, {3}))

    assert str(error).startswith("The ledger already has 1 error(s); nothing was written.")
    assert [detail.startswith("Row ") for detail in error.details] == [False] * len(error.details)
    assert any("expected 5 USD != accumulated 0 USD (5 too little)" in detail for detail in error.details)
    assert "With the proposed write (not written), it would read: expected 5 USD != accumulated -1 USD" in " ".join(
        error.details
    )
    assert error.result == {"written": 0, "written_rows": [], "rejected_rows": list(range(count))}
    assert ledger.read_text().count(" * ") == 0
    assert len(loads) <= 6, len(loads)


def test_a_batch_with_its_own_errors_on_broken_books_judges_each_row(tmp_path: Path, loads: list[Path]) -> None:
    """The per-row guard survives for errors the batch introduces (w5/537); bisecting would cost more.

    The row with its own error keeps its own words. The other rows repeat
    the ledger's error although they cause nothing: attributing a combined
    failure per row is beyond w5/725, which covers the batch that adds
    nothing wrong.
    """
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.replace("Checking 0 USD", "Checking 5 USD"))
    count = 12
    rows = _rows(count, set())
    rows[3]["postings"][0]["account"] = "Expenses:Nope"
    loads.clear()

    error = _partial(ledger, rows)

    assert str(error) == f"Added 0 of {count} transactions; {count} rows were rejected."
    assert [detail.split(":", 1)[0] for detail in error.details] == [f"Row {n + 1}" for n in range(count)]
    assert "Expenses:Nope" in error.details[3]
    assert error.result == {"written": 0, "written_rows": [], "rejected_rows": list(range(count))}
    assert ledger.read_text().count(" * ") == 0
    # Two loads per refused trial; bisecting each row would cost several times that.
    assert len(loads) <= 2 * count + _halvings(count), len(loads)
