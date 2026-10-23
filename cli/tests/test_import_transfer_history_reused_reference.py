"""A transfer keeps its place under an id that later transfers reuse (w5/975).

The transfer index kept one entry per id, the last written, so with two monthly
transfers under one reference the February one vanished from shared-reference
matching: the receiving-side February row looked new and an ordinary apply wrote
it again. Two issuers whose ids are each unique lost the earlier one the same way.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

HEAD = "Date,Description,Amount,Category,Reference\n"
SPEC = "date=Date,narration=Description,amount=Amount,category=Category,id=Reference"
FEB = "2024-02-01,TRANSFER TO SAVINGS,-100.00,Assets:Savings,monthly-ref\n"


def _import(tmp_path: Path, source: str, account: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, "--csv", SPEC, "--account", account, *flags)


def _positions(tmp_path: Path) -> dict[str, str]:
    result = _bea(tmp_path, "query", "SELECT account, sum(number) GROUP BY account ORDER BY account")
    return {row[0]: str(row[1]) for row in json.loads(result.stdout)["data"]["rows"]}


def _books(tmp_path: Path, extra: str = "") -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Checking USD\n'
        "2024-01-01 open Assets:Savings USD\n2024-01-01 open Expenses:Uncategorized USD\n" + extra
    )
    (tmp_path / "savings.csv").write_text(
        HEAD + "2024-02-06,TRANSFER FROM CHECKING,100.00,Assets:Checking,monthly-ref\n"
    )


@pytest.mark.parametrize("delay", [3, 5])
def test_the_earlier_transfer_still_pairs_under_a_reused_reference(tmp_path: Path, delay: int) -> None:
    _books(tmp_path)
    (tmp_path / "checking.csv").write_text(
        HEAD + FEB + "2024-03-01,TRANSFER TO SAVINGS,-100.00,Assets:Savings,monthly-ref\n"
    )
    (tmp_path / "savings.csv").write_text(
        HEAD + f"2024-02-{1 + delay:02d},TRANSFER FROM CHECKING,100.00,Assets:Checking,monthly-ref\n"
    )
    assert _import(tmp_path, "checking.csv", "Assets:Checking", "--duplicates", "include", "--apply").returncode == 0  # type: ignore[attr-defined]
    before = (tmp_path / "main.bean").read_bytes()

    preview = _import(tmp_path, "savings.csv", "Assets:Savings")
    applied = _import(tmp_path, "savings.csv", "Assets:Savings", "--apply")

    rows = json.loads(preview.stdout)["data"]["rows"]  # type: ignore[attr-defined]
    assert [row["status"] for row in rows] == ["possible_duplicate"]
    assert applied.returncode == 4 or json.loads(applied.stdout)["data"]["written"] == 0  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before
    assert _positions(tmp_path)["Assets:Checking"] == "-200.00"


def test_two_issuers_each_keep_their_transfer(tmp_path: Path) -> None:
    _books(tmp_path, "2024-01-01 open Assets:CheckingB USD\n")
    (tmp_path / "checking.csv").write_text(HEAD + FEB)
    (tmp_path / "checking-b.csv").write_text(
        HEAD + "2024-03-01,TRANSFER TO SAVINGS,-100.00,Assets:Savings,monthly-ref\n"
    )
    assert _import(tmp_path, "checking.csv", "Assets:Checking", "--apply").returncode == 0  # type: ignore[attr-defined]
    assert _import(tmp_path, "checking-b.csv", "Assets:CheckingB", "--apply").returncode == 0  # type: ignore[attr-defined]

    preview = _import(tmp_path, "savings.csv", "Assets:Savings")

    rows = json.loads(preview.stdout)["data"]["rows"]  # type: ignore[attr-defined]
    assert [row["status"] for row in rows] == ["possible_duplicate"]


def test_a_distinct_reference_still_pairs(tmp_path: Path) -> None:
    _books(tmp_path)
    (tmp_path / "checking.csv").write_text(HEAD + FEB.replace("monthly-ref", "feb-ref"))
    (tmp_path / "savings.csv").write_text(HEAD + "2024-02-04,TRANSFER FROM CHECKING,100.00,Assets:Checking,feb-ref\n")
    assert _import(tmp_path, "checking.csv", "Assets:Checking", "--apply").returncode == 0  # type: ignore[attr-defined]

    preview = _import(tmp_path, "savings.csv", "Assets:Savings")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]  # type: ignore[attr-defined]
