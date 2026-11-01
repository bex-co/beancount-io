"""A batch update's preview judges each include beside the earlier ones (w5/1081).

Two category changes in different includes pass alone but together break the
ledger's `onecommodity` rule. Apply rejects the second file after writing the
first; the preview used to call both ready.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_update_batch import batch

ROOT = (
    'option "operating_currency" "USD"\n'
    'plugin "beancount.plugins.onecommodity" "^Expenses:Travel$"\n'
    "2026-08-01 open Assets:Checking USD,EUR\n"
    "2026-08-01 open Expenses:Uncategorized USD,EUR\n"
    "2026-08-01 open Expenses:Travel\n"
    'include "a.bean"\ninclude "b.bean"\n'
)
FIRST = '2026-09-02 ! "Rail"\n  import-id: "usd"\n  Expenses:Uncategorized 10.00 USD\n  Assets:Checking -10.00 USD\n'
SECOND = '2026-09-03 ! "Hotel"\n  import-id: "eur"\n  Expenses:Uncategorized 20.00 EUR\n  Assets:Checking -20.00 EUR\n'
ROWS = [
    {"id": "usd", "account": "Expenses:Travel", "flag": "*"},
    {"id": "eur", "account": "Expenses:Travel", "flag": "*"},
]


def _ledger(tmp_path: Path) -> Path:
    root = tmp_path / "main.bean"
    root.write_text(ROOT)
    (tmp_path / "a.bean").write_text(FIRST)
    (tmp_path / "b.bean").write_text(SECOND)
    return root


def test_preview_rejects_the_edit_that_only_breaks_beside_an_earlier_include(tmp_path: Path) -> None:
    root = _ledger(tmp_path)

    preview = json.loads(batch(root, ROWS).stdout)["data"]

    assert [row["status"] for row in preview["rows"]] == ["ok", "rejected"]
    assert preview["ready"] == 1 and preview["rejected"] == 1


def test_preview_and_apply_agree_on_the_rows(tmp_path: Path) -> None:
    root = _ledger(tmp_path)
    preview = json.loads(batch(root, ROWS).stdout)["data"]

    applied = batch(root, ROWS, "--apply")

    assert applied.returncode == 1
    error = json.loads(applied.stdout)["error"]["result"]
    assert [row["status"] for row in error["rows"]][1] == preview["rows"][1]["status"] == "rejected"
    assert error["written_rows"] == [0] and error["rejected_rows"] == [1]
