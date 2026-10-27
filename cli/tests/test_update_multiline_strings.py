"""Retargeting a posting leaves account-looking text in multiline strings alone (w5/1025).

The account change scanned every physical line of the entry, so a memo,
narration or posting-metadata string with a continuation line starting with
the old account had that text rewritten along with the real posting.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PREFIX = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Expenses:Uncategorized USD
"""
LITERAL = "Spending plan\n    Expenses:Uncategorized 9.99 USD\n  classify after review"


def _entry(mode: str) -> str:
    header = '2024-01-02 ! "Shop"\n'
    if mode == "narration":
        header = f'2024-01-02 ! "{LITERAL}"\n'
    meta = '  import-id: "review-1"\n'
    if mode == "metadata":
        meta += f'  memo: "{LITERAL}"\n'
    post = "  Expenses:Uncategorized 9.99 USD\n"
    if mode == "posting-meta":
        post += f'    receipt: "{LITERAL}"\n'
    return header + meta + post + "  Assets:Cash -9.99 USD\n"


@pytest.mark.parametrize("mode", ["metadata", "narration", "posting-meta"])
@pytest.mark.parametrize("explicit", [False, True], ids=["bare", "explicit"])
def test_only_the_posting_is_retargeted(tmp_path: Path, mode: str, explicit: bool) -> None:
    source = PREFIX + _entry(mode)
    (tmp_path / "main.bean").write_text(source)
    target = "Expenses:Uncategorized=Expenses:Food" if explicit else "Expenses:Food"
    expected = source.replace(
        "  Expenses:Uncategorized 9.99 USD\n  Assets:Cash", "  Expenses:Food 9.99 USD\n  Assets:Cash"
    )
    expected = expected.replace(
        "  Expenses:Uncategorized 9.99 USD\n    receipt", "  Expenses:Food 9.99 USD\n    receipt"
    )
    expected = expected.replace('2024-01-02 ! "', '2024-01-02 * "', 1)
    args = ["update", "transaction", "--id", "review-1", "--account", target, "--flag", "*"]

    preview = _bea(tmp_path, *args)
    assert preview.returncode == 0, preview.stderr
    assert (tmp_path / "main.bean").read_text() == source

    applied = _bea(tmp_path, *args, "--apply")
    assert applied.returncode == 0, applied.stderr
    assert (tmp_path / "main.bean").read_text() == expected
    assert LITERAL in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0
    totals = _bea(tmp_path, "query", "SELECT account, sum(number) WHERE account ~ 'Expenses' GROUP BY account")
    assert json.loads(totals.stdout)["data"]["rows"] == [["Expenses:Food", "9.99"]]
