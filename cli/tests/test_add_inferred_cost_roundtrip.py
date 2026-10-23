"""A single add's answer replays when its cost left a part for booking to infer (w5/949).

`{# 0.50 USD}` and `{5 # USD}` leave the per-unit or the total part to booking.
The answer reported the open part as null, which bulk read as the other form:
`{0 # 0.50 USD}` and `{5 USD}`, so the unedited replay did not balance.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = "2024-01-01 open Assets:Broker HOOL\n2024-01-01 open Assets:Cash USD\n"


def _roundtrip(tmp_path: Path, cost: str, cash: str = "-10.50 USD") -> tuple[object, object, object]:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "copy.bean").write_text(LEDGER)
    added = _bea(
        tmp_path,
        "add",
        "transaction",
        "--date",
        "2024-01-02",
        "--narration",
        "Buy",
        "--posting",
        f"Assets:Broker 2 HOOL {cost}",
        "--posting",
        f"Assets:Cash {cash}",
    )
    assert added.returncode == 0, added.stderr  # type: ignore[attr-defined]
    directive = json.loads(added.stdout)["data"]["directive"]
    (tmp_path / "rows.json").write_text(json.dumps([directive]))
    replay = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "rows.json"), ledger="copy.bean")
    return added, replay, directive


def _cost_rows(tmp_path: Path, name: str) -> list[list[object]]:
    result = _bea(
        tmp_path, "query", "SELECT account,sum(cost(position)) GROUP BY account ORDER BY account", ledger=name
    )
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("cost", ["{# 0.50 USD}", "{5 # USD}"], ids=["inferred-per-unit", "inferred-total"])
def test_the_answer_replays_into_the_same_lot(tmp_path: Path, cost: str) -> None:
    _, replay, directive = _roundtrip(tmp_path, cost)

    assert replay.returncode == 0, replay.stderr  # type: ignore[attr-defined]
    posting = directive["postings"][0]
    assert Decimal(posting["cost"]["number"]) == 5 and Decimal(posting["cost"]["number_total"]) == Decimal("0.50")
    assert _bea(tmp_path, "check", ledger="copy.bean").returncode == 0
    assert _cost_rows(tmp_path, "copy.bean") == _cost_rows(tmp_path, "main.bean")


@pytest.mark.parametrize("cost", ["{5.25 USD}", "{{10.50 USD}}", "{5 # 0.50 USD}"])
def test_explicit_costs_still_replay(tmp_path: Path, cost: str) -> None:
    _, replay, _ = _roundtrip(tmp_path, cost)

    assert replay.returncode == 0, replay.stderr  # type: ignore[attr-defined]
    assert _cost_rows(tmp_path, "copy.bean") == _cost_rows(tmp_path, "main.bean")


@pytest.mark.parametrize(
    ("posting", "cash"),
    [("Assets:Broker 1 HOOL {# 5 USD}", "-5 USD"), ("Assets:Broker 2 HOOL {100 # USD}", "-200 USD")],
)
def test_a_part_that_solves_to_zero_stays_unstated(tmp_path: Path, posting: str, cash: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "copy.bean").write_text(LEDGER)

    added = _bea(
        tmp_path, "add", "transaction", "--date", "2024-01-02", "--posting", posting, "--posting", f"Assets:Cash {cash}"
    )
    directive = json.loads(added.stdout)["data"]["directive"]
    (tmp_path / "rows.json").write_text(json.dumps([directive]))
    replay = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "rows.json"), ledger="copy.bean")

    assert added.returncode == 0, added.stderr
    assert replay.returncode == 0, replay.stderr
    cost = directive["postings"][0]["cost"]
    assert cost["number"] is None or cost["number_total"] is None
