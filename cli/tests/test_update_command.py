"""`bea update transaction`: preview/apply flow, JSON envelope, and exit codes."""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Expenses:Groceries
2026-01-01 open Expenses:Uncategorized

2026-01-02 ! "Mystery Shop"
  import-id: "abc123"
  Expenses:Uncategorized 9.99 USD
  Assets:Checking
"""


def _ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def test_preview_prints_a_diff_and_writes_nothing(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app,
        ["--file", str(ledger), "update", "transaction", "--id", "abc123", "--account", "Expenses:Groceries"],
    )
    assert result.exit_code == 0, result.output
    assert "-  Expenses:Uncategorized 9.99 USD" in result.output
    assert "+  Expenses:Groceries 9.99 USD" in result.output
    assert "Preview only. Review the diff, then repeat with --apply to write." in result.output
    assert ledger.read_text() == LEDGER


def test_apply_rewrites_and_reports(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app,
        [
            "--file",
            str(ledger),
            "update",
            "transaction",
            "--id",
            "abc123",
            "--account",
            "Expenses:Groceries",
            "--flag",
            "*",
            "--apply",
        ],
    )
    assert result.exit_code == 0, result.output
    assert "Updated 1 transaction in " in result.output
    assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
    assert '2026-01-02 * "Mystery Shop"' in ledger.read_text()
    check = runner.invoke(app, ["--file", str(ledger), "check"])
    assert check.exit_code == 0, check.output


def test_json_preview_returns_one_envelope(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app,
        ["--json", "--file", str(ledger), "update", "transaction", "--id", "abc123", "--flag", "*"],
    )
    assert result.exit_code == 0, result.output
    payload = json.loads(result.output)
    assert payload["data"]["written"] == 0
    assert payload["data"]["id"] == "abc123"
    assert payload["data"]["lineno"] == 6
    assert "-2026-01-02" in payload["data"]["diff"]
    assert payload["target"]["into"] == str(ledger)
    assert ledger.read_text() == LEDGER


def test_json_apply_reports_the_write(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app,
        ["--json", "--file", str(ledger), "update", "transaction", "--id", "abc123", "--flag", "*", "--apply"],
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["data"]["written"] == 1


def test_unknown_id_exits_2(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app, ["--file", str(ledger), "update", "transaction", "--id", "nope", "--flag", "*", "--apply"]
    )
    assert result.exit_code == 2
    assert "No transaction with import-id or ref 'nope'" in result.output
    assert ledger.read_text() == LEDGER


def test_no_change_is_a_usage_error(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(app, ["--file", str(ledger), "update", "transaction", "--id", "abc123"])
    assert result.exit_code == 2
    assert "Nothing to change" in result.output
    assert ledger.read_text() == LEDGER


def test_noop_apply_succeeds_without_writing(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    result = runner.invoke(
        app, ["--file", str(ledger), "update", "transaction", "--id", "abc123", "--tag", "x", "--tag", "x", "--apply"]
    )
    assert result.exit_code == 0, result.output
    assert "#x" in ledger.read_text()
    again = runner.invoke(
        app, ["--file", str(ledger), "update", "transaction", "--id", "abc123", "--tag", "x", "--apply"]
    )
    assert again.exit_code == 0, again.output
    assert "already matches" in again.output
