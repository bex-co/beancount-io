"""A refused bulk batch counts its recoverable rows in at most two loads (w1/167).

The `--partial` hint used to be built by validating the rows one prefix at a
time — a full ledger load per row, over a minute for a dozen rows on a large
ledger. The count now comes from the batch error's own line numbers plus one
confirming load.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from bea_engine import managed_load, protocol
from bea_engine.ledger import adding

LEDGER = "2026-01-01 open Expenses:Food USD\n2026-01-01 open Assets:Cash USD\n"


def _row(n: int, account: str = "Expenses:Food", meta: bool = False) -> dict[str, Any]:
    food: dict[str, Any] = {"account": account, "amount": f"{n} USD"}
    if meta:
        food["meta"] = {"receipt": f"R-{n}", "cleared": True}
    return {
        "date": f"2026-02-{n:02d}",
        "narration": f"r{n}",
        "meta": {"batch": "b"} if meta else {},
        "postings": [food, {"account": "Assets:Cash"}],
    }


@pytest.fixture
def loads(monkeypatch: pytest.MonkeyPatch) -> list[Path]:
    seen: list[Path] = []
    real = managed_load.load_file

    def counting(path: Any, *args: Any, **kwargs: Any) -> Any:
        seen.append(Path(path))
        return real(path, *args, **kwargs)

    monkeypatch.setattr(managed_load, "load_file", counting)
    return seen


@pytest.mark.parametrize("bad", [0, 3, 7], ids=["first", "middle", "last"])
@pytest.mark.parametrize("meta", [False, True], ids=["plain", "with-meta"])
@pytest.mark.parametrize("ending", ["\n", "\r\n", ""], ids=["lf", "crlf", "no-final-newline"])
def test_refusal_counts_valid_rows_in_two_loads(
    tmp_path: Path, loads: list[Path], bad: int, meta: bool, ending: str
) -> None:
    ledger = tmp_path / "main.bean"
    text = LEDGER.replace("\n", "\r\n") if ending == "\r\n" else LEDGER
    ledger.write_bytes((text if ending else LEDGER.rstrip("\n")).encode())
    before = ledger.read_bytes()
    rows = [_row(n + 1, "Expenses:Nope" if n == bad else "Expenses:Food", meta) for n in range(8)]

    with pytest.raises(protocol.LedgerError) as raised:
        adding.answer(ledger, "transactions", {"rows": rows})

    assert "Pass --partial to append the 7 valid rows." in str(raised.value)
    assert 1 <= len(loads) <= 2, loads
    assert ledger.read_bytes() == before

    with pytest.raises(protocol.LedgerError) as partial:
        adding.answer(ledger, "transactions", {"rows": rows, "partial": True})
    assert partial.value.result is not None
    assert partial.value.result["written"] == 7
    assert partial.value.result["rejected_rows"] == [bad]


def test_refusal_into_an_included_file(tmp_path: Path, loads: list[Path]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER + 'include "parts/2026.bean"\n')
    (tmp_path / "parts").mkdir()
    (tmp_path / "parts" / "2026.bean").write_text("")
    rows = [_row(1), _row(2, "Expenses:Nope"), _row(3)]

    with pytest.raises(protocol.LedgerError) as raised:
        adding.answer(ledger, "transactions", {"rows": rows}, into=Path("parts/2026.bean"))

    assert "Pass --partial to append the 2 valid rows." in str(raised.value)
    assert 1 <= len(loads) <= 2, loads


def test_no_count_when_every_row_fails(tmp_path: Path, loads: list[Path]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = [_row(1, "Expenses:Nope"), _row(2, "Expenses:Nope")]

    with pytest.raises(protocol.LedgerError) as raised:
        adding.answer(ledger, "transactions", {"rows": rows})

    assert "--partial" not in str(raised.value)
    assert 1 <= len(loads) <= 2, loads
