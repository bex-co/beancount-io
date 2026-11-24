"""A CSV row that changes nothing names the cells CSV carries (w1/380).

`bea update transactions --from queue.csv` read an id-only row as the same
`{"id": ...}` a bare JSON row is, and the engine told it to pass `'account',
'flag', 'tags', or 'narration'`. The CSV form refuses a `tags` or `narration`
column, so half of that remedy could not be followed. A JSON row, where all
four fields are accepted, keeps the four-field sentence.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from bea_engine import protocol
from bea_engine.ledger import updating
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

CSV_MAPPING = "id,account,flag\ndemo-1,Expenses:Food,*\ndemo-2,,\n"
JSON_MAPPING = json.dumps([{"id": "demo-1", "account": "Expenses:Food", "flag": "*"}, {"id": "demo-2"}])

CSV_REASON = "Row 2: Nothing to change: fill its account or flag cell, or drop the row."
JSON_REASON = "Row 2: Nothing to change: pass 'account', 'flag', 'tags', or 'narration' alongside 'id'."


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _batch(
    ledger: Path, mapping: str, *, json_output: bool = True, apply: bool = False, stdin: bool = False
) -> tuple[int, str]:
    if stdin:
        source, given = ["--from", "-"], mapping
    else:
        path = ledger.parent / "queue.map"
        path.write_text(mapping)
        source, given = ["--from", str(path)], None
    flags = ["--json"] if json_output else []
    tail = ["--apply"] if apply else []
    result = runner.invoke(app, [*flags, "--file", str(ledger), "update", "transactions", *source, *tail], input=given)
    return result.exit_code, result.output


@pytest.mark.parametrize(("mapping", "reason"), [(CSV_MAPPING, CSV_REASON), (JSON_MAPPING, JSON_REASON)])
@pytest.mark.parametrize("stdin", [False, True], ids=["file", "stdin"])
def test_preview_words_the_row_for_its_form(tmp_path: Path, mapping: str, reason: str, stdin: bool) -> None:
    ledger = _ledger(tmp_path)

    code, out = _batch(ledger, mapping, stdin=stdin)

    assert code == 0, out
    rows = json.loads(out)["data"]["rows"]
    assert [row["status"] for row in rows] == ["ok", "rejected"]
    assert rows[1]["reason"] == reason
    assert ledger.read_text() == LEDGER


def test_csv_preview_text_names_only_the_csv_cells(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    code, out = _batch(ledger, CSV_MAPPING, json_output=False)

    assert code == 0, out
    assert CSV_REASON in out
    assert "narration" not in out
    assert "tags" not in out


@pytest.mark.parametrize(("mapping", "reason"), [(CSV_MAPPING, CSV_REASON), (JSON_MAPPING, JSON_REASON)])
def test_apply_keeps_the_row_rejected_with_its_wording(tmp_path: Path, mapping: str, reason: str) -> None:
    ledger = _ledger(tmp_path)

    code, out = _batch(ledger, mapping, apply=True)

    assert code == 1, out
    error = json.loads(out)["error"]
    assert error["message"] == "Updated 1 of 2 transactions; 1 row was rejected."
    assert error["details"][0] == reason
    assert error["result"]["rejected_rows"] == [1]
    assert error["result"]["rows"][1]["reason"] == reason
    assert "Expenses:Food  4.50 USD" in ledger.read_text()


def test_the_engine_refuses_an_unknown_form(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    with pytest.raises(protocol.UsageError, match=r"'form' must be 'json' or 'csv'"):
        updating.answer(ledger, "transactions", {"rows": [{"id": "demo-2", "flag": "*"}], "form": "xml"})

    assert ledger.read_text() == LEDGER
