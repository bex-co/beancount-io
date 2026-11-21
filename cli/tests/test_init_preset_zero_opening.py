"""`init --preset --opening-balance 'ACCOUNT 0'` keeps the confirmed zero (w5/876).

The frontend dropped a falsy amount, so an explicit zero produced books
byte-identical to an omitted balance. The zero is now a boundary assertion
with no opening transaction; omission still asserts nothing.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from tests.test_init_preset import _bea

BASE = ["--json", "init"]
FLAGS = ["--preset", "personal@1", "--currency", "USD", "--date", "2024-02-01"]


def _init(tmp_path: Path, name: str, *balances: str) -> str:
    args = [*BASE, str(tmp_path / name), *FLAGS]
    for balance in balances:
        args += ["--opening-balance", balance]
    created = _bea(tmp_path, *args)
    assert created.returncode == 0, created.stderr or created.stdout
    return (tmp_path / name / "main.bean").read_text(encoding="utf-8")


def test_a_confirmed_zero_differs_from_omission_and_is_queryable(tmp_path: Path) -> None:
    unknown = _init(tmp_path, "unknown")
    zero = _init(tmp_path, "zero", "Assets:Cash 0")

    assert zero != unknown
    assert re.search(r"2024-02-01 balance Assets:Cash +0 USD", zero)
    assert "balance" not in unknown
    # Nothing is posted: no opening transaction and no day shift.
    assert "Opening balance" not in zero
    assert "2024-02-01 open Assets:Cash\n" in zero

    checked = _bea(tmp_path, "--file", str(tmp_path / "zero" / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout
    listed = _bea(tmp_path, "--json", "--file", str(tmp_path / "zero" / "main.bean"), "list", "balance")
    rows = json.loads(listed.stdout)["data"]
    assert [row["account"] for row in rows] == ["Assets:Cash"]


def test_a_zero_beside_a_known_amount_posts_only_the_known_one(tmp_path: Path) -> None:
    mixed = _init(tmp_path, "mixed", "Assets:Cash 100", "Assets:Bank 0")

    assert mixed.count("Opening balance") == 1
    assert re.search(r"2024-02-01 balance Assets:Cash +100 USD", mixed)
    assert re.search(r"2024-02-01 balance Assets:Bank +0 USD", mixed)
    assert "2024-01-31 open Equity:OpeningBalances\n" in mixed
    checked = _bea(tmp_path, "--file", str(tmp_path / "mixed" / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout
