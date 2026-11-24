"""A refused batch apply's example row follows the mapping's form (w1/381).

`bea update transactions --from queue.csv --apply` refused a row that failed
its own shape and appended `Example row: {"id": "9f2c", ...}`, a JSON object
a user editing a CSV cannot paste. A CSV mapping now gets a CSV row under its
header; a JSON mapping keeps the JSON object. Each example is checked by
feeding it back as a mapping: it must pass the row shape and be refused only
because its id names no transaction.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = """\
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
2026-01-01 open Expenses:Food USD

2026-01-02 ! "Coffee"
  import-id: "demo-1"
  Expenses:Uncategorized  4.50 USD
  Assets:Checking

2026-01-03 ! "Lunch"
  import-id: "demo-2"
  Expenses:Uncategorized  12.00 USD
  Assets:Checking
"""

HELP = " Use bea update transactions --help for the full row shape."
CSV_EXAMPLE = "Example row: 9f2c,Expenses:Groceries,* under the header id,account,flag." + HELP
JSON_EXAMPLE = 'Example row: {"id": "9f2c", "account": "Expenses:Groceries", "flag": "*"}.' + HELP

# Each refused row fails its own shape: one changes nothing, one has a bad flag.
CSV_MAPPINGS = {
    "nothing": "id,account,flag\ndemo-1,Expenses:Food,*\ndemo-2,,\n",
    "flag": "id,account,flag\ndemo-1,Expenses:Food,*\ndemo-2,,xx\n",
}
JSON_MAPPINGS = {
    "nothing": json.dumps([{"id": "demo-1", "account": "Expenses:Food", "flag": "*"}, {"id": "demo-2"}]),
    "flag": json.dumps([{"id": "demo-1", "account": "Expenses:Food", "flag": "*"}, {"id": "demo-2", "flag": "xx"}]),
}


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _apply(ledger: Path, mapping: str, *, json_output: bool = True, stdin: bool = False) -> tuple[int, str]:
    if stdin:
        source, given = ["--from", "-"], mapping
    else:
        path = ledger.parent / "queue.map"
        path.write_text(mapping)
        source, given = ["--from", str(path)], None
    flags = ["--json"] if json_output else []
    result = runner.invoke(
        app, [*flags, "--file", str(ledger), "update", "transactions", *source, "--apply"], input=given
    )
    return result.exit_code, result.output


def _details(out: str) -> list[str]:
    details: list[str] = json.loads(out)["error"]["details"]
    return details


@pytest.mark.parametrize("case", sorted(CSV_MAPPINGS))
@pytest.mark.parametrize("stdin", [False, True], ids=["file", "stdin"])
def test_csv_apply_example_is_a_csv_row(tmp_path: Path, case: str, stdin: bool) -> None:
    ledger = _ledger(tmp_path)

    code, out = _apply(ledger, CSV_MAPPINGS[case], stdin=stdin)

    assert code == 1, out
    details = _details(out)
    assert details[-1] == CSV_EXAMPLE
    assert not any("{" in line for line in details)
    assert "Expenses:Food  4.50 USD" in ledger.read_text()


@pytest.mark.parametrize("case", sorted(JSON_MAPPINGS))
def test_json_apply_example_stays_a_json_object(tmp_path: Path, case: str) -> None:
    ledger = _ledger(tmp_path)

    code, out = _apply(ledger, JSON_MAPPINGS[case])

    assert code == 1, out
    assert _details(out)[-1] == JSON_EXAMPLE
    assert "Expenses:Food  4.50 USD" in ledger.read_text()


def test_csv_apply_text_shows_no_json_object(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    code, out = _apply(ledger, CSV_MAPPINGS["nothing"], json_output=False)

    assert code == 1, out
    assert CSV_EXAMPLE in out
    assert '{"id"' not in out


def _example_reasons(ledger: Path, mapping: str) -> list[str]:
    code, out = _apply(ledger, mapping)
    assert code == 1, out
    return [row["reason"] for row in json.loads(out)["error"]["result"]["rows"]]


def test_each_example_pastes_into_its_own_form(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    unknown = ["Row 1: No transaction with import-id, ref, or bank ID '9f2c' in this ledger."]
    csv_row = CSV_EXAMPLE.removeprefix("Example row: ").split(" ", 1)[0]
    json_row = JSON_EXAMPLE.removeprefix("Example row: ").split("}", 1)[0] + "}"

    assert _example_reasons(ledger, f"id,account,flag\n{csv_row}\n") == unknown
    assert _example_reasons(ledger, f"[{json_row}]") == unknown
    assert ledger.read_text() == LEDGER
