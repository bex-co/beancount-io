"""A `file:line` id reads its file from the root ledger's folder, as `--into` does (w1/340).

Run from the folder holding `books/`, `--id 2026/jan.bean:1` named no file
from the working directory, fell through to the import-id lookup, and exited
2 with "No transaction with import-id or ref" while `--into 2026/jan.bean`
in the same command resolved against `books/`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea

ROOT = """\
option "operating_currency" "USD"
include "2026/jan.bean"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Dining USD
"""
LEAF = """\
2026-01-05 ! "Mystery"
  Expenses:Uncategorized 5.00 USD
  Assets:Checking
"""


@pytest.fixture
def leaf(tmp_path: Path) -> Path:
    (tmp_path / "books" / "2026").mkdir(parents=True)
    (tmp_path / "books" / "main.bean").write_text(ROOT)
    file = tmp_path / "books" / "2026" / "jan.bean"
    file.write_text(LEAF)
    return file


def _update(tmp_path: Path, *args: str, json_output: bool) -> tuple[int, str, str]:
    flags = ["--json"] if json_output else []
    completed = bea([*flags, "--no-input", "--offline", "--file", "books/main.bean", "update", *args], tmp_path)
    return completed.returncode, completed.stdout, completed.stderr


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_a_single_update_previews_the_root_relative_location(tmp_path: Path, leaf: Path, json_output: bool) -> None:
    before = leaf.read_bytes()
    code, out, err = _update(
        tmp_path,
        "transaction",
        "--id",
        "2026/jan.bean:1",
        "--into",
        "2026/jan.bean",
        "--account",
        "Expenses:Dining",
        json_output=json_output,
    )

    assert code == 0, err
    diff = json.loads(out)["data"]["diff"] if json_output else out
    assert "+  Expenses:Dining 5.00 USD" in diff
    assert leaf.read_bytes() == before


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_a_batch_row_previews_the_root_relative_location(tmp_path: Path, leaf: Path, json_output: bool) -> None:
    (tmp_path / "map.csv").write_text("id,account\n2026/jan.bean:1,Expenses:Dining\n")
    before = leaf.read_bytes()

    code, out, err = _update(tmp_path, "transactions", "--from", "map.csv", json_output=json_output)

    assert code == 0, err
    if json_output:
        data = json.loads(out)["data"]
        assert [row["status"] for row in data["rows"]] == ["ok"]
        assert data["rejected"] == 0
    else:
        assert "rejected" not in out
    assert "+  Expenses:Dining 5.00 USD" in out
    assert leaf.read_bytes() == before


def test_apply_rewrites_the_root_relative_location(tmp_path: Path, leaf: Path) -> None:
    code, _, err = _update(
        tmp_path, "transaction", "--id", "2026/jan.bean:1", "--account", "Expenses:Dining", "--apply", json_output=True
    )

    assert code == 0, err
    assert leaf.read_text() == LEAF.replace("Expenses:Uncategorized", "Expenses:Dining")


def test_a_location_naming_no_file_says_where_it_looked(tmp_path: Path, leaf: Path) -> None:
    code, _, err = _update(
        tmp_path, "transaction", "--id", "2026/feb.bean:1", "--account", "Expenses:Dining", json_output=True
    )

    assert code == 2
    error = json.loads(err)["error"]
    assert error["category"] == "usage"
    cwd, folder = tmp_path.resolve(), leaf.parent.parent.resolve()
    assert f"'2026/feb.bean' is not a file under {cwd} or {folder}." in error["message"]
