"""A posting whose comment touches its account is retargeted (w5/1047).

`Expenses:Uncategorized; keep counter note` read as the token
`Expenses:Uncategorized;`, so an account update skipped the posting: an
account-only update wrote nothing, and with `--flag` it cleared the flag while
leaving the money uncategorized.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

FORMS = {
    "elided-compact": "  Expenses:Uncategorized; keep counter note",
    "flag-elided-compact": "  *Expenses:Uncategorized; keep counter note",
    "elided-spaced": "  Expenses:Uncategorized ; keep counter note",
    "amount-compact": "  Expenses:Uncategorized 10 USD; keep counter note",
    "elided-bare": "  Expenses:Uncategorized",
}


def _ledger(tmp_path: Path, posting: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n'
        "2026-01-01 open Expenses:Uncategorized USD\n2026-01-01 open Expenses:Food USD\n"
        f'2026-01-02 ! "Coffee"\n  ref: "R1"\n  Assets:Cash -10 USD\n{posting}\n'
    )
    return ledger


@pytest.mark.parametrize("form", list(FORMS))
@pytest.mark.parametrize("flag", [False, True], ids=["account-only", "combined"])
@pytest.mark.parametrize("batch", [False, True], ids=["single", "batch"])
def test_the_commented_posting_moves(tmp_path: Path, form: str, flag: bool, batch: bool) -> None:
    ledger = _ledger(tmp_path, FORMS[form])
    if batch:
        row: dict[str, str] = {"id": "R1", "account": "Expenses:Food", **({"flag": "*"} if flag else {})}
        (tmp_path / "map.json").write_text(json.dumps([row]))
        args = ["update", "transactions", "--from", str(tmp_path / "map.json"), "--apply"]
    else:
        args = ["update", "transaction", "--id", "R1", "--account", "Expenses:Food", "--apply"]
        args += ["--flag", "*"] if flag else []

    applied = _bea(tmp_path, *args)

    assert applied.returncode == 0, applied.stderr
    text = ledger.read_text()
    assert "Expenses:Food" in text.split('"Coffee"')[1]
    if "note" in FORMS[form]:
        assert "; keep counter note" in text
    totals = _bea(tmp_path, "query", "SELECT account, sum(number) WHERE account ~ 'Expenses' GROUP BY account")
    assert json.loads(totals.stdout)["data"]["rows"] == [["Expenses:Food", "10"]]
    assert _bea(tmp_path, "check").returncode == 0
