"""Ledgers saved with a UTF-8 BOM behave like plain UTF-8 ones (w3/257)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
BOM = b"\xef\xbb\xbf"
ENTRY = (
    'option "operating_currency" "USD"\ninclude "sub.bean"\n'
    "2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n"
)
SUB = '2026-01-01 * "Lunch"\n  Expenses:Food 10.00 USD\n  Assets:Cash\n'


@pytest.fixture
def marked(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_bytes(BOM + ENTRY.encode("utf-8"))
    (tmp_path / "sub.bean").write_bytes(BOM + SUB.encode("utf-8"))
    return file


def test_check_accepts_bom_entry_and_include(marked: Path) -> None:
    assert runner.invoke(app, ["--file", str(marked), "check"]).exit_code == 0

    result = runner.invoke(app, ["--json", "--file", str(marked), "check"])

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"] == {"valid": True, "errors": []}


def test_reads_see_through_the_mark(marked: Path) -> None:
    result = runner.invoke(app, ["--json", "--file", str(marked), "list", "transaction"])

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"][0]["narration"] == "Lunch"

    query = runner.invoke(app, ["--file", str(marked), "query", "SELECT account LIMIT 1"])
    assert query.exit_code == 0, query.output
    assert "Expenses:Food" in query.stdout

    report = runner.invoke(app, ["--file", str(marked), "report", "trial-balance"])
    assert report.exit_code == 0, report.output
    assert "Trial Balance" in report.stdout


def test_errors_still_name_the_real_file(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(BOM + b'2020-01-01 open Assets:Cash USD\n2026-01-01 * "X"\n  Assets:Cash 1 USD\n  Expenses:Food\n')

    result = runner.invoke(app, ["--json", "--file", str(file), "check"])

    assert result.exit_code == 1, result.output
    (detail,) = json.loads(result.stderr)["error"]["details"]
    assert detail.startswith(f"{file}:2: "), detail


def test_add_preserves_the_mark_and_stays_valid(marked: Path) -> None:
    before = marked.read_bytes()

    result = runner.invoke(
        app,
        [
            "--file",
            str(marked),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            "Tea",
            "-p",
            "Expenses:Food 2 USD",
            "-p",
            "Assets:Cash",
        ],
    )

    assert result.exit_code == 0, result.output
    after = marked.read_bytes()
    assert after.startswith(BOM)
    assert after[len(BOM) :].startswith(before[len(BOM) :])
    assert runner.invoke(app, ["--file", str(marked), "check"]).exit_code == 0


def test_format_in_place_removes_the_mark_and_converges(marked: Path) -> None:
    sub = marked.parent / "sub.bean"

    first = runner.invoke(app, ["format", str(marked), str(sub), "-i"])

    assert first.exit_code == 0, first.output
    assert not marked.read_bytes().startswith(BOM)
    assert not sub.read_bytes().startswith(BOM)

    again = runner.invoke(app, ["format", str(marked), str(sub), "-i"])

    assert again.exit_code == 0, again.output
    assert "0/2" in again.stdout


def test_format_check_reports_a_marked_file_as_needing_formatting(marked: Path) -> None:
    result = runner.invoke(app, ["format", str(marked), "--check"])

    assert result.exit_code == 1, result.output
    assert "need formatting" in result.stderr
    assert marked.read_bytes().startswith(BOM)


def test_writes_never_introduce_a_mark(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(ENTRY.replace('include "sub.bean"\n', "") + SUB)

    result = runner.invoke(
        app,
        [
            "--file",
            str(file),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            "Tea",
            "-p",
            "Expenses:Food 2 USD",
            "-p",
            "Assets:Cash",
        ],
    )

    assert result.exit_code == 0, result.output
    assert not file.read_bytes().startswith(BOM)
