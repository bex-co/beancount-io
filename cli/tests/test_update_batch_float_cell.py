"""A decimal cell in a JSON batch-update mapping is that row's refusal (w5/1028).

The shared JSON reader keeps `1.25` as a typed marker that Update's request
serializer could not encode, so one malformed row aborted the whole batch
before any row was judged: the valid row got no preview and no write.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app
from tests.test_update_batch import _ledger

runner = CliRunner()


@pytest.mark.parametrize("bad", [1.25, 7, "Expenses:Nope"], ids=["decimal", "integer", "unknown-account"])
def test_a_bad_row_leaves_the_valid_row_to_apply(tmp_path: Path, bad: object) -> None:
    ledger = _ledger(tmp_path)
    mapping = tmp_path / "map.json"
    mapping.write_text(json.dumps([{"id": "aaa", "account": "Expenses:Groceries"}, {"id": "bbb", "account": bad}]))

    preview = runner.invoke(app, ["--json", "--file", str(ledger), "update", "transactions", "--from", str(mapping)])
    assert preview.exit_code == 0, preview.output
    rows = json.loads(preview.output)["data"]["rows"]
    assert [row["status"] for row in rows] == ["ok", "rejected"]

    applied = runner.invoke(app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping), "--apply"])
    assert applied.exit_code == 1, applied.output
    assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
