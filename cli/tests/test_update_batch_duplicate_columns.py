"""A batch-update CSV mapping may not repeat a column (w5/1027).

A repeated `id`, `account` or `flag` header kept only its last cell: a second
`id` selected another transaction and a second `account` another category,
written without a word, where the same repeat in a JSON mapping is refused.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app
from tests.test_update_batch import LEDGER, _ledger

runner = CliRunner()


@pytest.mark.parametrize(
    ("body", "column"),
    [
        ("id,account,id\naaa,Expenses:Groceries,bbb\n", "'id'"),
        ("id,account,account\naaa,Expenses:Groceries,Expenses:Dining\n", "'account'"),
        ("id,flag,flag\naaa,*,!\n", "'flag'"),
        (" id ,account,id\naaa,Expenses:Groceries,bbb\n", "'id'"),
    ],
    ids=["id", "account", "flag", "trimmed-id"],
)
@pytest.mark.parametrize("apply", [False, True], ids=["preview", "apply"])
def test_a_repeated_column_is_refused_and_nothing_is_written(
    tmp_path: Path, body: str, column: str, apply: bool
) -> None:
    ledger = _ledger(tmp_path)
    mapping = tmp_path / "map.csv"
    mapping.write_text(body)

    result = runner.invoke(
        app,
        ["--file", str(ledger), "update", "transactions", "--from", str(mapping), *(["--apply"] if apply else [])],
    )

    assert result.exit_code == 2, result.output
    assert f"repeats column {column}" in result.output
    assert ledger.read_text() == LEDGER


def test_unique_columns_in_any_order_still_apply(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    mapping = tmp_path / "map.csv"
    mapping.write_text("flag,account,id\n*,Expenses:Groceries,aaa\n")

    result = runner.invoke(app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping), "--apply"])

    assert result.exit_code == 0, result.output
    assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
