"""A decomposed Unicode posting account is retargeted like its composed form (w5/1038).

The loader reads `Expenses:Café` in NFC, but the source editor compared the
raw decomposed token with it and skipped the posting: an account-only update
wrote nothing, and a combined one changed the flag but left 9.99 USD in Café.
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

CAFE = unicodedata.normalize("NFD", "Expenses:Café")


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        f"2026-01-01 open Assets:Cash USD\n2026-01-01 open {CAFE} USD\n2026-01-01 open Expenses:Dining USD\n"
        f'2026-01-02 ! "Lunch"\n  ref: "t1"\n  {CAFE} 9.99 USD\n  Assets:Cash -9.99 USD\n',
        encoding="utf-8",
    )
    return ledger


def _dining(tmp_path: Path) -> list[list[object]]:
    result = _bea(tmp_path, "query", "SELECT account, sum(number) WHERE account ~ 'Expenses' GROUP BY account")
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("old", ["Expenses:Café", CAFE], ids=["composed-request", "decomposed-request"])
@pytest.mark.parametrize("flags", [[], ["--flag", "*"]], ids=["account-only", "with-flag"])
@pytest.mark.parametrize("batch", [False, True], ids=["single", "batch"])
def test_the_decomposed_posting_moves(tmp_path: Path, old: str, flags: list[str], batch: bool) -> None:
    ledger = _ledger(tmp_path)
    if batch:
        row: dict[str, str] = {"id": "t1", "account": f"{old}=Expenses:Dining"}
        if flags:
            row["flag"] = "*"
        (tmp_path / "map.json").write_text(json.dumps([row]))
        args = ["update", "transactions", "--from", str(tmp_path / "map.json"), "--apply"]
    else:
        args = ["update", "transaction", "--id", "t1", "--account", f"{old}=Expenses:Dining", *flags, "--apply"]

    applied = _bea(tmp_path, *args)

    assert applied.returncode == 0, applied.stderr
    assert _dining(tmp_path) == [["Expenses:Dining", "9.99"]]
    assert "  Expenses:Dining 9.99 USD" in ledger.read_text(encoding="utf-8")
    assert _bea(tmp_path, "check").returncode == 0
