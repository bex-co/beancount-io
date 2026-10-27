"""An id ending in a non-decimal Unicode digit is metadata, not a file:line (w5/1041).

`statement:²` passed `isdigit()` and then `int()` raised ValueError: a single
update exited 1 with a traceback and a batch aborted every row, its valid
neighbour included.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea


def _ledger(tmp_path: Path, key: str, identity: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n'
        f'2026-01-02 ! "Coffee"\n  {key}: "{identity}"\n  Assets:Cash -9.99 USD\n  Expenses:Food 9.99 USD\n'
        f'2026-01-03 ! "Taxi"\n  {key}: "statement:2"\n  Assets:Cash -5.01 USD\n  Expenses:Food 5.01 USD\n',
        encoding="utf-8",
    )
    return ledger


def _flags(tmp_path: Path) -> list[str]:
    listed = _bea(tmp_path, "list", "transaction", "--sort", "oldest")
    return [row["flag"] for row in json.loads(listed.stdout)["data"]]


@pytest.mark.parametrize("identity", ["statement:²", "statement:②"])
@pytest.mark.parametrize("key", ["ref", "import-id"])
def test_a_single_update_resolves_the_unicode_suffixed_id(tmp_path: Path, key: str, identity: str) -> None:
    _ledger(tmp_path, key, identity)

    applied = _bea(tmp_path, "update", "transaction", "--id", identity, "--flag", "*", "--apply")

    assert applied.returncode == 0, applied.stderr
    assert _flags(tmp_path) == ["*", "!"]


@pytest.mark.parametrize("identity", ["statement:²", "statement:②"])
def test_a_batch_writes_both_rows(tmp_path: Path, identity: str) -> None:
    _ledger(tmp_path, "ref", identity)
    (tmp_path / "map.json").write_text(
        json.dumps([{"id": identity, "flag": "*"}, {"id": "statement:2", "flag": "*"}]), encoding="utf-8"
    )

    applied = _bea(tmp_path, "update", "transactions", "--from", str(tmp_path / "map.json"), "--apply")

    assert applied.returncode == 0, applied.stderr
    assert _flags(tmp_path) == ["*", "*"]


def test_a_real_file_and_line_still_resolves(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, "ref", "statement:²")

    applied = _bea(tmp_path, "update", "transaction", "--id", f"{ledger}:4", "--flag", "*", "--apply")

    assert applied.returncode == 0, applied.stderr
    assert _flags(tmp_path) == ["*", "!"]
