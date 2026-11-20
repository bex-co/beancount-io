"""An update never moves a review leg onto the entry's own source account (w1/328).

`--account Assets:Checking` on a row imported from Assets:Checking moved the
`Expenses:Uncategorized` leg there: the entry posted `+5` and `-5` to one
account, exited 0 and passed `check`, and the charge was gone from the
balance. `bea import` already refuses a counter account equal to its source
(w5/468); the review queue's other door now does too.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "open"
  Assets:Checking  100.00 USD
  Equity:Opening
2026-07-01 ! "Mystery 1"
  import-id: "id-1"
  Expenses:Uncategorized  5.00 USD
  Assets:Checking
2026-07-02 ! "Mystery 2"
  import-id: "id-2"
  Expenses:Uncategorized  7.00 USD
  Assets:Checking
2026-07-03 ! "Split"
  import-id: "id-3"
  Expenses:Food  3.00 USD
  Expenses:Uncategorized  5.00 USD
  Assets:Checking
"""

REASON = "would post against its own source and cancel out. Name the account its money goes to or comes from."


def _checking(tmp_path: Path) -> str:
    totals = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Checking'")
    return json.loads(totals.stdout)["data"]["rows"][0][0]


@pytest.mark.parametrize(
    "account", ["Assets:Checking", "Expenses:Uncategorized=Assets:Checking"], ids=["bare", "old-new"]
)
@pytest.mark.parametrize("apply", [False, True], ids=["preview", "apply"])
def test_the_single_form_refuses_and_writes_nothing(tmp_path: Path, account: str, apply: bool) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    args = ["update", "transaction", "--id", "id-1", "--account", account, "--flag", "*"]

    completed = _bea(tmp_path, *args, *(["--apply"] if apply else []))

    assert completed.returncode == 2, completed.stderr
    message = json.loads(completed.stderr)["error"]["message"]
    assert f"{ledger}:9 already posts to Assets:Checking" in message
    assert REASON in message
    assert message.endswith("Nothing was written.")
    assert ledger.read_text() == LEDGER
    assert _checking(tmp_path) == "80.00"


def test_a_batch_rejects_only_the_cancelling_row(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "queue.csv").write_text("id,account,flag\nid-2,Assets:Checking,*\nid-1,Expenses:Food,*\n")

    applied = _bea(tmp_path, "update", "transactions", "--from", str(tmp_path / "queue.csv"), "--apply")

    assert applied.returncode == 1, applied.stderr
    result = json.loads(applied.stderr)["error"]["result"]
    assert result["written_rows"] == [1]
    assert result["rejected_rows"] == [0]
    assert REASON in result["rows"][0]["reason"]
    assert "Nothing was written" not in result["rows"][0]["reason"]
    assert '2026-07-02 ! "Mystery 2"\n  import-id: "id-2"\n  Expenses:Uncategorized  7.00 USD' in ledger.read_text()
    assert '2026-07-01 * "Mystery 1"\n  import-id: "id-1"\n  Expenses:Food  5.00 USD' in ledger.read_text()
    assert _checking(tmp_path) == "80.00"


def test_merging_into_another_leg_beside_the_source_still_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    applied = _bea(tmp_path, "update", "transaction", "--id", "id-3", "--account", "Expenses:Food", "--apply")

    assert applied.returncode == 0, applied.stderr
    assert json.loads(applied.stdout)["data"]["written"] == 1
    assert "  Expenses:Food  3.00 USD\n  Expenses:Food  5.00 USD\n  Assets:Checking\n" in ledger.read_text()
    assert _checking(tmp_path) == "80.00"
