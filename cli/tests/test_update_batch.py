"""`bea update transactions --from`: batch mapping, per-row results, partial writes."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from bea_engine import protocol
from bea_engine.ledger import updating
from cli.main import app

runner = CliRunner()
CLI_ROOT = Path(__file__).parent.parent
SOURCE_ROOT = CLI_ROOT / "src"

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Expenses:Dining
2026-01-01 open Expenses:Groceries
2026-01-01 open Expenses:Uncategorized

2026-01-02 ! "Mystery Shop"
  import-id: "aaa"
  Expenses:Uncategorized 9.99 USD
  Assets:Checking

2026-01-03 ! "Corner Store"
  import-id: "bbb"
  Expenses:Uncategorized 5.00 USD
  Assets:Checking
"""

ROWS = [
    {"id": "aaa", "account": "Expenses:Groceries", "flag": "*"},
    {"id": "bbb", "account": "Expenses:Dining", "flag": "*"},
]


def _ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def run_engine(*args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "bea_engine", *args],
        input=stdin,
        capture_output=True,
        text=True,
        check=False,
        env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
    )


def batch(ledger: Path, rows: Any, *flags: str) -> subprocess.CompletedProcess[str]:
    return run_engine(
        "update", "--file", str(ledger), "--type", "transactions", "--request", json.dumps({"rows": rows}), *flags
    )


class TestEngineBatch:
    def test_preview_answers_per_row_results_and_writes_nothing(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, ROWS)
        assert completed.returncode == 0, completed.stdout
        data = json.loads(completed.stdout)["data"]
        assert data["written"] == 0
        assert data["ready"] == 2
        assert [row["status"] for row in data["rows"]] == ["ok", "ok"]
        assert data["rows"][0]["changes"] == [
            "account: Expenses:Uncategorized → Expenses:Groceries",
            "flag: ! → *",
        ]
        assert data["rows"][0]["lineno"] == 7
        assert "-  Expenses:Uncategorized 9.99 USD" in data["rows"][0]["diff"]
        assert "-  Expenses:Uncategorized 5.00 USD" in data["diff"]
        assert ledger.read_text() == LEDGER

    def test_apply_writes_every_valid_row(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, ROWS, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert json.loads(completed.stdout)["data"]["written"] == 2
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
        assert "Expenses:Dining 5.00 USD" in ledger.read_text()
        check = run_engine("check", "--file", str(ledger))
        assert check.returncode == 0

    def test_preview_with_a_reject_still_exits_0(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [*ROWS, {"id": "nope", "flag": "*"}])
        assert completed.returncode == 0, completed.stdout
        data = json.loads(completed.stdout)["data"]
        assert [row["status"] for row in data["rows"]] == ["ok", "ok", "rejected"]
        assert data["rows"][2]["reason"] == "Row 3: No transaction with import-id or ref 'nope' in this ledger."
        assert ledger.read_text() == LEDGER

    def test_apply_with_a_reject_writes_the_valid_rows_and_exits_1(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [{"id": "nope", "flag": "*"}, ROWS[0]], "--apply")
        assert completed.returncode == 1, completed.stdout
        error = json.loads(completed.stdout)["error"]
        assert error["category"] == "validation"
        assert error["message"] == "Updated 1 of 2 transactions; 1 row was rejected."
        assert error["details"] == ["Row 1: No transaction with import-id or ref 'nope' in this ledger."]
        assert error["result"]["written"] == 1
        assert error["result"]["written_rows"] == [1]
        assert error["result"]["rejected_rows"] == [0]
        assert [row["status"] for row in error["result"]["rows"]] == ["rejected", "ok"]
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()

    def test_noop_plus_reject_message(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [{"id": "bbb", "flag": "!"}, {"id": "nope", "flag": "*"}], "--apply")
        assert completed.returncode == 1, completed.stdout
        error = json.loads(completed.stdout)["error"]
        assert error["message"] == "Updated 0 of 2 transactions; 1 row was rejected. 1 was already up to date."
        assert error["result"]["unchanged_rows"] == [0]
        assert ledger.read_text() == LEDGER

    def test_schema_reject_appends_an_example(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [{"id": "aaa"}], "--apply")
        assert completed.returncode == 1, completed.stdout
        details = json.loads(completed.stdout)["error"]["details"]
        assert details[0] == "Row 1: Nothing to change: pass 'account', 'flag', 'tags', or 'narration' alongside 'id'."
        assert any(line.startswith("Example row:") for line in details)
        assert ledger.read_text() == LEDGER

    def test_in_loop_revalidation_rejects_late(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        from bea_engine.ledger import write as ledger_write

        root = tmp_path / "main.bean"
        root.write_text('option "operating_currency" "USD"\ninclude "a.bean"\ninclude "b.bean"\n')
        first = tmp_path / "a.bean"
        first.write_text(
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "aaa"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        second = tmp_path / "b.bean"
        second.write_text(
            "2026-01-01 open Expenses:Dining\n"
            '\n2026-01-03 ! "Store"\n'
            '  import-id: "bbb"\n'
            "  Expenses:Uncategorized 5.00 USD\n"
            "  Assets:Checking\n"
        )
        real_validate = ledger_write.validate_candidate
        calls = 0

        def fail_fourth(candidate: Path, target: Path, **kwargs: Any) -> list[str]:
            nonlocal calls
            calls += 1
            if calls == 4:
                raise protocol.LedgerError("the second file no longer validates")
            return real_validate(candidate, target, **kwargs)

        monkeypatch.setattr(ledger_write, "validate_candidate", fail_fourth)
        with pytest.raises(protocol.LedgerError, match="Updated 1 of 2 transactions"):
            updating.answer(root, "transactions", {"rows": ROWS}, apply=True)
        assert "Expenses:Groceries 9.99 USD" in first.read_text()
        assert "Expenses:Uncategorized 5.00 USD" in second.read_text()

    def test_in_loop_conflict_reports_written_rows(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        from bea_engine.ledger import write as ledger_write

        ledger = _ledger(tmp_path)

        def fail_once(target: Path, candidate: Path, original: bytes, original_stat: Any) -> None:
            raise protocol.ConflictError("The ledger changed during the operation.")

        monkeypatch.setattr(ledger_write, "replace_checked", fail_once)
        with pytest.raises(protocol.ConflictError, match="already written") as caught:
            updating.answer(ledger, "transactions", {"rows": ROWS}, apply=True)
        assert caught.value.result == {"written": 0, "written_rows": [], "rejected_rows": []}
        assert ledger.read_text() == LEDGER

    def test_second_row_for_one_entry_is_rejected(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [ROWS[0], {"id": "aaa", "flag": "*"}], "--apply")
        assert completed.returncode == 1, completed.stdout
        error = json.loads(completed.stdout)["error"]
        assert "already targeted by row 1" in error["details"][0]
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()

    def test_validation_failure_names_its_row(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [ROWS[0], {"id": "bbb", "account": "Expenses:Nope"}], "--apply")
        assert completed.returncode == 1, completed.stdout
        error = json.loads(completed.stdout)["error"]
        assert error["message"] == "Updated 1 of 2 transactions; 1 row was rejected."
        assert error["details"][0].startswith("Row 2:")
        assert any("Expenses:Nope" in detail for detail in error["details"])
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
        assert "Expenses:Uncategorized 5.00 USD" in ledger.read_text()

    def test_rows_span_files(self, tmp_path: Path) -> None:
        root = tmp_path / "main.bean"
        root.write_text('option "operating_currency" "USD"\ninclude "a.bean"\ninclude "b.bean"\n')
        first = tmp_path / "a.bean"
        first.write_text(
            "2026-01-01 open Assets:Checking\n"
            "2026-01-01 open Expenses:Groceries\n"
            "2026-01-01 open Expenses:Uncategorized\n"
            '\n2026-01-02 ! "Shop"\n'
            '  import-id: "aaa"\n'
            "  Expenses:Uncategorized 9.99 USD\n"
            "  Assets:Checking\n"
        )
        second = tmp_path / "b.bean"
        second.write_text(
            "2026-01-01 open Expenses:Dining\n"
            '\n2026-01-03 ! "Store"\n'
            '  import-id: "bbb"\n'
            "  Expenses:Uncategorized 5.00 USD\n"
            "  Assets:Checking\n"
        )
        completed = batch(root, ROWS, "--apply")
        assert completed.returncode == 0, completed.stdout
        assert json.loads(completed.stdout)["data"]["written"] == 2
        assert "Expenses:Groceries 9.99 USD" in first.read_text()
        assert "Expenses:Dining 5.00 USD" in second.read_text()
        assert root.read_text() == 'option "operating_currency" "USD"\ninclude "a.bean"\ninclude "b.bean"\n'

    def test_unchanged_rows_are_not_rejected(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        completed = batch(ledger, [ROWS[0], {"id": "bbb", "flag": "!"}], "--apply")
        assert completed.returncode == 0, completed.stdout
        data = json.loads(completed.stdout)["data"]
        assert data["written"] == 1
        assert [row["status"] for row in data["rows"]] == ["ok", "unchanged"]

    def test_empty_and_misshapen_batches_are_usage_errors(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        for rows in ([], {"id": "aaa"}):
            completed = batch(ledger, rows, "--apply")
            assert completed.returncode == 2, completed.stdout
            assert json.loads(completed.stdout)["error"]["category"] == "usage"
        assert ledger.read_text() == LEDGER

    def test_rows_failing_together_are_rejected_with_a_way_forward(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        ledger = _ledger(tmp_path)
        real_validate = updating._validate_text

        def failing_together(target: Path, snapshot: Any, new_text: str, **kwargs: Any) -> list[str]:
            if "Groceries 9.99" in new_text and "Dining 5.00" in new_text:
                raise protocol.LedgerError("the pair never loads together")
            return real_validate(target, snapshot, new_text, **kwargs)

        monkeypatch.setattr(updating, "_validate_text", failing_together)
        with pytest.raises(protocol.LedgerError, match="Updated 0 of 2 transactions"):
            updating.answer(ledger, "transactions", {"rows": ROWS}, apply=True)
        assert ledger.read_text() == LEDGER


class TestBatchCommand:
    def test_json_preview_renders_table_and_diff(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "map.json"
        mapping.write_text(json.dumps(ROWS))
        result = runner.invoke(app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping)])
        assert result.exit_code == 0, result.output
        assert "ROW" in result.output and "STATUS" in result.output
        assert "Expenses:Uncategorized → Expenses:Groceries" in result.output
        assert "-  Expenses:Uncategorized 9.99 USD" in result.output
        assert "Preview only. Review the diff, then repeat with --apply to write." in result.output
        assert ledger.read_text() == LEDGER

    def test_json_apply_reports(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "map.json"
        mapping.write_text(json.dumps(ROWS))
        result = runner.invoke(
            app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping), "--apply"]
        )
        assert result.exit_code == 0, result.output
        assert f"Updated 2 of 2 transactions in {ledger}." in result.output
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()

    def test_csv_apply_is_partial_and_exits_1(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "map.csv"
        mapping.write_text("id,account,flag\naaa,Expenses:Groceries,*\nnope,,*\nbbb,Expenses:Dining,*\n")
        result = runner.invoke(
            app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping), "--apply"]
        )
        assert result.exit_code == 1, result.output
        assert "Updated 2 of 3 transactions; 1 row was rejected." in result.output
        assert "Row 2: No transaction with import-id or ref 'nope' in this ledger." in result.output
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
        assert "Expenses:Dining 5.00 USD" in ledger.read_text()

    def test_csv_preview_flags_rejects(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "map.csv"
        mapping.write_text("id,account,flag\nnope,Expenses:Dining,*\n")
        result = runner.invoke(app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping)])
        assert result.exit_code == 0, result.output
        assert "rejected" in result.output
        assert "Preview only. Fix the 1 rejected row, then preview again." in result.output
        assert ledger.read_text() == LEDGER

    def test_stdin_reads_json_and_csv(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        as_json = runner.invoke(
            app, ["--file", str(ledger), "update", "transactions", "--from", "-", "--apply"], input=json.dumps(ROWS)
        )
        assert as_json.exit_code == 0, as_json.output
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()
        ledger.write_text(LEDGER)
        as_csv = runner.invoke(
            app,
            ["--file", str(ledger), "update", "transactions", "--from", "-", "--apply"],
            input="id,account,flag\naaa,Expenses:Groceries,*\n",
        )
        assert as_csv.exit_code == 0, as_csv.output
        assert "Expenses:Groceries 9.99 USD" in ledger.read_text()

    def test_json_envelope_carries_per_row_results(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "map.json"
        mapping.write_text(json.dumps([*ROWS, {"id": "nope", "flag": "*"}]))
        result = runner.invoke(app, ["--json", "--file", str(ledger), "update", "transactions", "--from", str(mapping)])
        assert result.exit_code == 0, result.output
        payload = json.loads(result.output)
        assert [row["status"] for row in payload["data"]["rows"]] == ["ok", "ok", "rejected"]
        assert payload["target"]["file"] == str(ledger)

    def test_bad_mappings_are_usage_errors(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        cases = {
            "empty.json": "",
            "object.json": '{"id": "aaa"}',
            "broken.json": "[{",
            "headers.csv": "account,flag\naaa,*\n",
            "columns.csv": "id,narration\naaa,x\n",
            "ragged.csv": "id,account\naaa,Expenses:Dining,extra\n",
        }
        for name, body in cases.items():
            mapping = tmp_path / name
            mapping.write_text(body)
            result = runner.invoke(app, ["--file", str(ledger), "update", "transactions", "--from", str(mapping)])
            assert result.exit_code == 2, (name, result.output)
        missing = runner.invoke(
            app, ["--file", str(ledger), "update", "transactions", "--from", str(tmp_path / "nx.json")]
        )
        assert missing.exit_code == 2
        assert "No mappings file" in missing.output
        assert ledger.read_text() == LEDGER
