"""A batch row rejected while planning does not reserve its transaction (w5/1051).

The row's target was claimed before its account retarget was checked, so a
rejected first row left the entry "already targeted" and the valid row after
it was refused too, leaving 10 USD in the review queue.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-02 ! "Coffee"
  ref: "R1"
  Expenses:Uncategorized 10 USD
  Assets:Cash
2026-01-03 ! "Bus"
  ref: "G1"
  Expenses:Uncategorized 7 USD
  Assets:Cash
"""


@pytest.mark.parametrize(
    "bad",
    [{"id": "R1", "account": "Expenses:Nope=Expenses:Food"}, {"id": "R1", "flag": "not a flag"}],
    ids=["unknown-old-account", "malformed-flag"],
)
def test_the_valid_row_after_a_rejected_one_still_applies(tmp_path: Path, bad: dict[str, str]) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    rows = [bad, {"id": "R1", "account": "Expenses:Food", "flag": "*"}, {"id": "G1", "account": "Expenses:Food"}]
    (tmp_path / "map.json").write_text(json.dumps(rows))

    applied = _bea(tmp_path, "update", "transactions", "--from", str(tmp_path / "map.json"), "--apply")

    result = json.loads(applied.stderr)["error"]["result"]
    assert result["written_rows"] == [1, 2]
    assert result["rejected_rows"] == [0]
    totals = _bea(tmp_path, "query", "SELECT account, sum(number) WHERE account ~ 'Expenses' GROUP BY account")
    assert json.loads(totals.stdout)["data"]["rows"] == [["Expenses:Food", "17"]]
