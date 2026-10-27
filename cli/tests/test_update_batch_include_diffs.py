"""A batch update's answer carries every written file's diff (w5/1029).

The apply loop re-read each file before writing the next and then built the
answer from those refreshed copies, so every earlier file's rows reported
`diff: ""` and the combined diff showed only the last file.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_update_batch import ROWS, batch

ROOT = 'option "operating_currency" "USD"\ninclude "a.bean"\ninclude "b.bean"\n'
FIRST = (
    "2026-01-01 open Assets:Checking\n2026-01-01 open Expenses:Groceries\n2026-01-01 open Expenses:Uncategorized\n"
    '\n2026-01-02 ! "Shop"\n  import-id: "aaa"\n  Expenses:Uncategorized 9.99 USD\n  Assets:Checking\n'
)
SECOND = (
    '2026-01-01 open Expenses:Dining\n\n2026-01-03 ! "Store"\n  import-id: "bbb"\n'
    "  Expenses:Uncategorized 5.00 USD\n  Assets:Checking\n"
)


def test_apply_reports_the_diff_of_every_written_include(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(ROOT)
    (tmp_path / "a.bean").write_text(FIRST)
    (tmp_path / "b.bean").write_text(SECOND)

    preview = json.loads(batch(root, ROWS).stdout)["data"]
    completed = batch(root, ROWS, "--apply")

    assert completed.returncode == 0, completed.stdout
    data = json.loads(completed.stdout)["data"]
    assert data["written"] == 2
    first, second = data["rows"]
    assert "+  Expenses:Groceries 9.99 USD" in first["diff"]
    assert "+  Expenses:Dining 5.00 USD" in second["diff"]
    assert "a.bean" in data["diff"] and "b.bean" in data["diff"]
    assert [row["diff"] for row in data["rows"]] == [row["diff"] for row in preview["rows"]]
    assert data["diff"] == preview["diff"]
