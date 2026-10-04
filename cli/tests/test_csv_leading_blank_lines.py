"""Blank lines before a CSV header do not hide it (w1/152).

`detect_delimiter` skipped blank lines but both `open_records` copies took the
first raw record as the header, so an export starting with an empty line had
an empty header: without `--csv` the import asked for a Python importer, and
with `--csv` it said the file lacked the `Date` column it plainly has.
"""

from __future__ import annotations

import json
from importlib import import_module
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
"""
PREAMBLE = "\n\r\n  \n"
BODY = "Date,Description,Amount\n2026-08-02,COFFEE,-5.00\n"


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _import(ledger: Path, body: str, *extra: str) -> tuple[int, str, str]:
    source = ledger.parent / "s5.csv"
    source.write_bytes(body.encode())
    result = CliRunner().invoke(
        app,
        ["--json", "--no-input", "--file", str(ledger), "import", str(source), "--account", "Assets:Checking", *extra],
    )
    return result.exit_code, result.stdout, result.stderr


@pytest.mark.parametrize("extra", [(), ("--csv", "date=Date,amount=Amount,narration=Description")])
def test_a_header_after_blank_lines_is_read(ledger: Path, extra: tuple[str, ...]) -> None:
    code, stdout, stderr = _import(ledger, PREAMBLE + BODY, *extra, "--apply")

    assert code == 0, stderr
    data = json.loads(stdout)["data"]
    assert [(row["row"], row["amount"]) for row in data["rows"]] == [(1, "-5.00 USD")]
    assert data["written"] == 1


def test_errors_still_name_the_physical_line(ledger: Path) -> None:
    code, _stdout, stderr = _import(ledger, PREAMBLE + BODY + "2026-08-03,TEA,bad\n")

    assert code == 2
    # Lines 1-3 are blank, the header is line 4, COFFEE line 5, TEA line 6.
    assert "Row 2 (line 6): cannot parse amount 'bad'" in json.loads(stderr)["error"]["message"]


@pytest.mark.parametrize("module", ["cli.csv_mapper", "bea_engine.csv_mapper"])
def test_both_readers_skip_leading_blank_records(tmp_path: Path, module: str) -> None:
    source = tmp_path / "s5.csv"
    source.write_text(PREAMBLE + BODY)
    with import_module(module).open_records(source) as (headers, rows):
        assert headers == ["Date", "Description", "Amount"]
        assert [line for line, _row in rows] == [5]
