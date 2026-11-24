"""`bea update` refusals that sent the caller somewhere else (w1/378).

A ledger that already failed got `bea check`'s bare `main.bean: 1 error(s).`,
with neither "nothing was written" nor the `--allow-errors` remedy every other
writer names. A one-row JSON object was read as CSV and its text quoted back
as column names. A numeric `id`, which `bea list` shows for an importer's
`transaction_id: 12345`, was called missing.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import Result
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Equity:Opening USD

2026-01-01 * "Open"
  Assets:Checking  100.00 USD
  Equity:Opening

2026-01-05 ! "Lunch"
  bank_id: "TX-1"
  import-id: "bank:TX-1"
  Expenses:Uncategorized  4.50 USD
  Assets:Checking

2026-01-06 ! "Dinner"
  transaction_id: 12345
  Expenses:Uncategorized  6.00 USD
  Assets:Checking
"""

FAILING_BALANCE = "\n2026-01-31 balance Assets:Checking 90.00 USD\n"
REFUSAL = "The ledger already has 1 error(s); nothing was written. Pass --allow-errors to write anyway."


def _ledger(tmp_path: Path, extra: str = "") -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER + extra)
    return file


def _update(ledger: Path, *args: str, json_output: bool = False, stdin: str | None = None) -> Result:
    flags = ["--json"] if json_output else []
    return runner.invoke(app, [*flags, "--file", str(ledger), "update", *args], input=stdin)


SINGLE = ("transaction", "--id", "TX-1", "--account", "Expenses:Food")


class TestLedgerThatAlreadyFails:
    def test_text_names_the_remedy(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, FAILING_BALANCE)
        before = ledger.read_bytes()

        result = _update(ledger, *SINGLE)

        assert result.exit_code == 1
        lines = result.stderr.splitlines()
        assert lines[0] == f"Error: {REFUSAL}"
        assert lines[1].startswith(f"  {ledger}:")
        assert "Balance failed for 'Assets:Checking'" in lines[1]
        assert ledger.read_bytes() == before

    def test_json_agrees(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, FAILING_BALANCE)
        before = ledger.read_bytes()

        result = _update(ledger, *SINGLE, json_output=True)

        assert result.exit_code == 1
        error = json.loads(result.stderr)["error"]
        assert error["message"] == REFUSAL
        assert error["category"] == "validation"
        assert len(error["details"]) == 1
        assert "Balance failed for 'Assets:Checking'" in error["details"][0]
        assert ledger.read_bytes() == before

    def test_batch_refuses_the_same_way(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, FAILING_BALANCE)
        mapping = json.dumps([{"id": "TX-1", "account": "Expenses:Food"}])

        result = _update(ledger, "transactions", "--from", "-", json_output=True, stdin=mapping)

        assert result.exit_code == 1
        assert json.loads(result.stderr)["error"]["message"] == REFUSAL

    def test_the_named_remedy_previews(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, FAILING_BALANCE)
        before = ledger.read_bytes()

        result = _update(ledger, *SINGLE, "--allow-errors", json_output=True)

        assert result.exit_code == 0, result.output
        assert "+  Expenses:Food  4.50 USD" in json.loads(result.stdout)["data"]["diff"]
        assert ledger.read_bytes() == before

    def test_a_syntax_error_says_to_fix_it_first(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, '\n2026-02-01 * "Broken\n  Assets:Checking 1 USD\n')
        before = ledger.read_bytes()

        result = _update(ledger, *SINGLE, json_output=True)

        assert result.exit_code == 1
        assert json.loads(result.stderr)["error"]["message"] == (
            "The ledger already has 1 error(s), including a syntax error; nothing was written. "
            "Fix the syntax error first: --allow-errors never writes past one."
        )
        assert ledger.read_bytes() == before


class TestOneRowObject:
    @pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
    def test_is_refused_as_json_not_read_as_csv(self, tmp_path: Path, json_output: bool) -> None:
        ledger = _ledger(tmp_path)
        before = ledger.read_bytes()
        mapping = tmp_path / "one.json"
        mapping.write_text('  {"id": "TX-1", "account": "Expenses:Food"}\n')

        result = _update(ledger, "transactions", "--from", str(mapping), json_output=json_output)

        assert result.exit_code == 2
        expected = f"'{mapping}' (from --from) must hold an array of rows, or CSV with an id column."
        if json_output:
            assert json.loads(result.stderr)["error"]["message"] == expected
        else:
            assert result.stderr.splitlines() == [f"Error: {expected}"]
        assert ledger.read_bytes() == before

    def test_the_array_form_still_previews(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = tmp_path / "rows.json"
        mapping.write_text('[{"id": "TX-1", "account": "Expenses:Food"}]')

        result = _update(ledger, "transactions", "--from", str(mapping), json_output=True)

        assert result.exit_code == 0, result.output
        assert [row["status"] for row in json.loads(result.stdout)["data"]["rows"]] == ["ok"]


class TestNumericId:
    @pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
    def test_an_integer_is_read_as_its_decimal_text(self, tmp_path: Path, json_output: bool) -> None:
        ledger = _ledger(tmp_path)
        before = ledger.read_bytes()
        mapping = json.dumps([{"id": 12345, "account": "Expenses:Food"}])

        result = _update(ledger, "transactions", "--from", "-", json_output=json_output, stdin=mapping)

        assert result.exit_code == 0, result.output
        if json_output:
            data = json.loads(result.stdout)["data"]
            assert data["rejected"] == 0
            assert data["rows"][0]["id"] == "12345"
            assert data["rows"][0]["status"] == "ok"
            assert "+  Expenses:Food  6.00 USD" in data["diff"]
        else:
            assert "needs an 'id'" not in result.output
            assert "+  Expenses:Food  6.00 USD" in result.stdout
        assert ledger.read_bytes() == before

    def test_an_integer_applies(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path)
        mapping = json.dumps([{"id": 12345, "account": "Expenses:Food", "flag": "*"}])

        result = _update(ledger, "transactions", "--from", "-", "--apply", stdin=mapping)

        assert result.exit_code == 0, result.output
        assert '2026-01-06 * "Dinner"\n  transaction_id: 12345\n  Expenses:Food  6.00 USD' in ledger.read_text()

    @pytest.mark.parametrize(
        ("value", "kind", "echo"),
        [
            ("1.5", "the number 1.5", "1.5"),
            ("12345.0", "the number 12345.0", "12345.0"),
            ("true", "the boolean true", True),
            ('{"n": 12345}', "an object", {"n": 12345}),
            ("[12345]", "an array", [12345]),
        ],
        ids=["float", "integral-float", "boolean", "object", "array"],
    )
    def test_any_other_type_is_named(self, tmp_path: Path, value: str, kind: str, echo: object) -> None:
        ledger = _ledger(tmp_path)
        before = ledger.read_bytes()
        mapping = f'[{{"id": {value}, "account": "Expenses:Food"}}]'

        result = _update(ledger, "transactions", "--from", "-", json_output=True, stdin=mapping)

        assert result.exit_code == 0, result.output
        (row,) = json.loads(result.stdout)["data"]["rows"]
        assert row["status"] == "rejected"
        assert row["reason"] == f"Row 1: 'id' must be text or a whole number, not {kind}."
        assert row["id"] == echo
        assert ledger.read_bytes() == before

    @pytest.mark.parametrize("value", ["null", '""'], ids=["null", "empty"])
    def test_a_missing_id_is_still_called_missing(self, tmp_path: Path, value: str) -> None:
        ledger = _ledger(tmp_path)
        mapping = f'[{{"id": {value}, "account": "Expenses:Food"}}]'

        result = _update(ledger, "transactions", "--from", "-", json_output=True, stdin=mapping)

        (row,) = json.loads(result.stdout)["data"]["rows"]
        assert row["reason"] == "Row 1: An update needs an 'id': an import-id, a ref, a bank ID, or file:line."
