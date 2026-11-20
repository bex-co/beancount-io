"""`bea update` never retargets a review row onto its own bank account (w1/328).

Sibling of w5/468, which made `bea import` refuse a counter account equal to
the `--account` being imported. Clearing the same review queue with
`bea update` had no such guard: the entry then posted `+5.00 USD` and
`-5.00 USD` to one account with exit 0, and the bank charge left the books.
"""

from __future__ import annotations

import json
from pathlib import Path

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
"""

SPLIT_LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
2026-07-01 ! "Split lunch"
  import-id: "split-1"
  Expenses:Food  3.00 USD
  Expenses:Uncategorized  5.00 USD
  Assets:Checking  -8.00 USD
"""


def test_single_retarget_onto_own_source_is_refused(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    result = _bea(tmp_path, "update", "transaction", "--id", "id-1", "--account", "Assets:Checking", "--apply")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "cancel out" in result.stderr
    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_old_new_retarget_onto_own_source_is_refused(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    result = _bea(
        tmp_path,
        "update",
        "transaction",
        "--id",
        "id-1",
        "--account",
        "Expenses:Uncategorized=Assets:Checking",
        "--apply",
    )

    assert result.returncode == 2, result.stdout + result.stderr
    assert "cancel out" in result.stderr
    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_batch_rejects_only_the_self_canceling_row(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "queue.csv").write_text("id,account,flag\nid-2,Assets:Checking,*\nid-1,Expenses:Food,*\n")

    result = _bea(tmp_path, "update", "transactions", "--from", str(tmp_path / "queue.csv"), "--apply")

    assert result.returncode == 1, result.stdout + result.stderr
    payload = json.loads(result.stderr)["error"]["result"]
    assert [row["status"] for row in payload["rows"]] == ["rejected", "ok"]
    assert "cancel out" in payload["rows"][0]["reason"]
    assert payload["written"] == 1
    assert "Expenses:Food" in (tmp_path / "main.bean").read_text()


def test_merging_a_leg_into_an_expense_already_posted_still_writes(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(SPLIT_LEDGER)

    result = _bea(tmp_path, "update", "transaction", "--id", "split-1", "--account", "Expenses:Food", "--apply")

    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert "  Expenses:Uncategorized" not in (tmp_path / "main.bean").read_text()
