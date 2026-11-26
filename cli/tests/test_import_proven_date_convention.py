"""A day-first bank's export that reads either way follows the one that proved it (w1/379).

A UK bank's July export had days past the twelfth, so `bea import` read it
day-first. Its August export ran 3–11 August, and a flag-free import of the
remembered mapping read it month-first: 3 August became 8 March. The settings
line then called that fresh guess "remembered from july.csv", and JSON
reported it as `remembered.date_format`.
"""

from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = (
    'option "operating_currency" "GBP"\n'
    "2026-01-01 open Assets:Current GBP\n"
    "2026-01-01 open Expenses:Uncategorized GBP\n"
)
HEADER = "Date,Description,Amount\n"
ACCOUNT = ("--account", "Assets:Current")
COLUMNS = "date=Date,amount=Amount,narration=Description"


@pytest.fixture
def book(tmp_path: Path, bea_config_dir: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    exports = {
        "july.csv": "14/07/2026,TESCO,-12.40\n21/07/2026,PRET,-6.10\n28/07/2026,BOOTS,-9.99\n",
        "august.csv": "03/08/2026,TESCO,-15.20\n07/08/2026,PRET,-5.80\n11/08/2026,BOOTS,-4.25\n",
        "september.csv": "15/09/2026,TESCO,-7.00\n",
        "us-july.csv": "07/14/2026,TESCO,-12.40\n",
        "us-august.csv": "08/03/2026,TESCO,-15.20\n",
        "switched.csv": "08/13/2026,TESCO,-3.00\n",
        "october.csv": "02/10/2026,PRET,-1.50\n",
        "dash.csv": "03-08-2026,TESCO,-15.20\n05-08-2026,PRET,-5.80\n",
    }
    for name, rows in exports.items():
        (tmp_path / name).write_text(HEADER + rows)
    return ledger


def _import(book: Path, name: str, *args: str) -> Any:
    result = runner.invoke(app, ["--json", "--no-input", "--file", str(book), "import", str(book.parent / name), *args])
    assert result.exit_code == 0, result.output
    return json.loads(result.stdout)["data"]


def _dates(data: Any) -> list[str]:
    return [row["date"] for row in data["rows"]]


def _record(config: Path) -> Any:
    (record,) = (config / "importers").glob("csv-*.json")
    (entry,) = json.loads(record.read_text())["sources"]
    return entry


def _remembered_line(data: Any) -> str:
    (line,) = [note for note in data["notes"] if note.startswith("Using settings remembered from")]
    return str(line)


def test_an_ambiguous_export_reads_the_way_the_last_one_proved(book: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    preview = _import(book, "august.csv")

    assert _dates(preview) == ["2026-08-03", "2026-08-07", "2026-08-11"]
    assert preview["date_format"] == "%d/%m/%Y"
    assert any(
        note.startswith("Read august.csv day-first as july.csv was (--date-format %d/%m/%Y)")
        for note in preview["notes"]
    ), preview["notes"]
    applied = _import(book, "august.csv", "--apply")
    assert applied["written"] == 3
    text = book.read_text()
    assert '2026-08-03 ! "TESCO"' in text and '2026-08-11 ! "BOOTS"' in text
    assert "2026-03-08" not in text and "2026-11-08" not in text


def test_a_format_read_from_the_file_is_never_called_remembered(book: Path, bea_config_dir: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    for name in ("august.csv", "september.csv"):
        data = _import(book, name)
        assert "--date-format" not in _remembered_line(data)
        assert data["remembered"]["source"] == "july.csv"
        assert data["remembered"]["date_format"] is None
        assert data["date_format"] == "%d/%m/%Y"
    assert "Read the date format from september.csv: --date-format %d/%m/%Y." in data["notes"]
    # The proof is no setting: nothing a flag-free run must replay as typed.
    assert _record(bea_config_dir)["date_format"] is None


def test_an_unambiguous_export_still_reads_as_it_proves(book: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")
    _import(book, "august.csv", "--apply")

    assert _dates(_import(book, "september.csv", "--apply")) == ["2026-09-15"]


def test_a_month_first_account_still_reads_month_first(book: Path) -> None:
    _import(book, "us-july.csv", *ACCOUNT, "--apply")

    data = _import(book, "us-august.csv", "--apply")

    assert _dates(data) == ["2026-08-03"]
    assert data["date_format"] == "%m/%d/%Y"
    assert any(note.startswith("Read us-august.csv month-first as us-july.csv was") for note in data["notes"])


def test_an_export_that_proves_the_other_convention_says_it_changed(book: Path, bea_config_dir: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    data = _import(book, "switched.csv", "--apply")

    assert _dates(data) == ["2026-08-13"]
    assert (
        "The date convention changed: switched.csv's dates read month-first (--date-format %m/%d/%Y), "
        "where july.csv's read day-first. Read it as its dates prove."
    ) in data["notes"]
    entry = _record(bea_config_dir)
    assert (entry["proven_date_format"], entry["proven_date_source"]) == ("%m/%d/%Y", "switched.csv")
    # The next export that reads either way follows the newer proof.
    october = _import(book, "october.csv")
    assert _dates(october) == ["2026-02-10"]
    assert any(note.startswith("Read october.csv month-first as switched.csv was") for note in october["notes"])


def test_a_typed_date_format_still_wins(book: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    data = _import(book, "august.csv", "--date-format", "%m/%d/%Y")

    assert _dates(data) == ["2026-03-08", "2026-07-08", "2026-11-08"]
    assert not any("as july.csv was" in note for note in data["notes"])


def test_a_record_without_a_proof_gains_one_from_the_next_export_that_has_one(book: Path, bea_config_dir: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")
    (record,) = (bea_config_dir / "importers").glob("csv-*.json")
    stored = json.loads(record.read_text())
    for entry in stored["sources"]:
        # As a record written before w1/379 stands.
        del entry["proven_date_format"], entry["proven_date_source"]
    record.write_text(json.dumps(stored))

    unproven = _import(book, "october.csv")
    assert _dates(unproven) == ["2026-02-10"]
    assert any("cannot be told apart" in note for note in unproven["notes"])

    _import(book, "september.csv", "--apply")
    entry = _record(bea_config_dir)
    assert (entry["proven_date_format"], entry["proven_date_source"]) == ("%d/%m/%Y", "september.csv")
    assert _dates(_import(book, "october.csv")) == ["2026-10-02"]


def test_an_explicit_refresh_that_proves_nothing_keeps_the_proof(book: Path, bea_config_dir: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    refreshed = _import(book, "october.csv", "--csv", COLUMNS, *ACCOUNT)

    # A refresh of the same header and account breaks the tie the same way.
    assert _dates(refreshed) == ["2026-10-02"]
    entry = _record(bea_config_dir)
    assert (entry["proven_date_format"], entry["proven_date_source"]) == ("%d/%m/%Y", "july.csv")
    assert _dates(_import(book, "august.csv")) == ["2026-08-03", "2026-08-07", "2026-08-11"]


def test_the_remembered_line_pasted_back_reads_the_same_dates(book: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")
    recalled = _import(book, "august.csv")
    line = _remembered_line(recalled).removeprefix("Using settings remembered from july.csv for august.csv: ")

    pasted = _import(book, "august.csv", *shlex.split(line.removesuffix(".")))

    assert pasted["config_source"] == "--csv"
    assert _dates(pasted) == _dates(recalled) == ["2026-08-03", "2026-08-07", "2026-08-11"]


def test_an_ambiguous_export_in_another_shape_follows_the_proved_convention(book: Path, bea_config_dir: Path) -> None:
    # July proved day-first with slashes. A dash-separated export whose days
    # never pass the twelfth rules out that exact format but reads either way
    # within dashes — the proved convention still decides it, not the
    # month-first default (w1/379: the proof is the convention, not the string).
    _import(book, "july.csv", *ACCOUNT, "--apply")

    data = _import(book, "dash.csv")

    assert _dates(data) == ["2026-08-03", "2026-08-05"]
    assert data["date_format"] == "%d-%m-%Y"
    # Nothing exact was proved, so july.csv's proof stands for the next file.
    entry = _record(bea_config_dir)
    assert (entry["proven_date_format"], entry["proven_date_source"]) == ("%d/%m/%Y", "july.csv")


def test_a_refresh_that_proves_the_other_convention_says_it_changed(book: Path, bea_config_dir: Path) -> None:
    _import(book, "july.csv", *ACCOUNT, "--apply")

    data = _import(book, "switched.csv", "--csv", COLUMNS, *ACCOUNT)

    assert _dates(data) == ["2026-08-13"]
    assert any(note.startswith("The date convention changed: switched.csv's") for note in data["notes"])
    entry = _record(bea_config_dir)
    assert (entry["proven_date_format"], entry["proven_date_source"]) == ("%m/%d/%Y", "switched.csv")
