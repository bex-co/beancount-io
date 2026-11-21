"""`-o` naming a spreadsheet workbook is refused, since bea writes no workbook format (w1/351)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash
2026-01-01 open Expenses:Food
2026-01-02 * "Lunch"
  Expenses:Food 12.50 USD
  Assets:Cash
"""
QUERY = "SELECT account, sum(position) GROUP BY account"
WORKBOOKS = ["spend.xlsx", "spend.xlsm", "spend.xls", "spend.ods", "spend.numbers", "SPEND.XLSX", "Spend.Ods"]
EXISTING = b"PK\x03\x04 a workbook the user already had\n"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    (tmp_path / "main.bean").write_text(LEDGER, encoding="utf-8")
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _csv_name(name: str) -> str:
    return name.rsplit(".", 1)[0] + ".csv"


QUERY_CASES = [
    pytest.param([], id="text"),
    pytest.param(["--format", "csv"], id="csv"),
    pytest.param(["--format", "text"], id="explicit-text"),
]


@pytest.mark.parametrize("name", WORKBOOKS)
@pytest.mark.parametrize("extra", QUERY_CASES)
def test_query_to_a_workbook_name_is_refused(tmp_path: Path, name: str, extra: list[str]) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "query", QUERY, *extra, "-o", name)

    assert result.returncode == 2, result.stderr or result.stdout
    assert result.stdout == ""
    assert f"--output {name} names a spreadsheet workbook, which bea does not write" in result.stderr
    assert f"use -o {_csv_name(name)} --spreadsheet-safe (spreadsheets open CSV)" in result.stderr
    assert not (tmp_path / name).exists()


def test_json_query_to_a_workbook_name_is_refused(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "-f", "main.bean", "query", QUERY, "-o", "spend.xlsx")

    assert result.returncode == 2, result.stderr or result.stdout
    assert result.stdout == ""
    assert "drop --json and use -o spend.csv --spreadsheet-safe" in result.stderr
    assert not (tmp_path / "spend.xlsx").exists()


def test_a_native_source_query_hint_leaves_out_spreadsheet_safe(tmp_path: Path) -> None:
    """`--spreadsheet-safe` is refused with `--source`, so the hint does not offer it."""
    result = _bea(tmp_path, "query", "--source", "beancount:main.bean", QUERY, "-o", "spend.ods")

    assert result.returncode == 2, result.stderr or result.stdout
    assert "use -o spend.csv (spreadsheets open CSV)" in result.stderr
    assert "--spreadsheet-safe" not in result.stderr
    assert not (tmp_path / "spend.ods").exists()


@pytest.mark.parametrize("extra", [[], ["--format", "csv"]])
def test_query_leaves_an_existing_workbook_untouched(tmp_path: Path, extra: list[str]) -> None:
    target = tmp_path / "spend.xlsx"
    target.write_bytes(EXISTING)

    result = _bea(tmp_path, "-f", "main.bean", "query", QUERY, *extra, "-o", "spend.xlsx")

    assert result.returncode == 2, result.stderr or result.stdout
    assert target.read_bytes() == EXISTING


@pytest.mark.parametrize("name", WORKBOOKS)
@pytest.mark.parametrize("extra", [["--format", "csv"], []])
def test_report_to_a_workbook_name_is_refused(tmp_path: Path, name: str, extra: list[str]) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "report", "income-statement", *extra, "-o", name)

    assert result.returncode == 2, result.stderr or result.stdout
    assert result.stdout == ""
    assert f"--output {name} names a spreadsheet workbook, which bea does not write" in result.stderr
    assert f"use -o {_csv_name(name)} --spreadsheet-safe (spreadsheets open CSV)" in result.stderr
    assert not (tmp_path / name).exists()


def test_report_leaves_an_existing_workbook_untouched(tmp_path: Path) -> None:
    target = tmp_path / "is.ods"
    target.write_bytes(EXISTING)

    result = _bea(tmp_path, "-f", "main.bean", "report", "balance-sheet", "--format", "csv", "-o", "is.ods")

    assert result.returncode == 2, result.stderr or result.stdout
    assert target.read_bytes() == EXISTING


def test_the_hint_keeps_the_directory_the_caller_spelled(tmp_path: Path) -> None:
    (tmp_path / "out").mkdir()

    result = _bea(tmp_path, "-f", "main.bean", "query", QUERY, "-o", "./out/spend.xlsx")

    assert result.returncode == 2, result.stderr or result.stdout
    assert "use -o ./out/spend.csv --spreadsheet-safe" in result.stderr
    assert not (tmp_path / "out" / "spend.xlsx").exists()


@pytest.mark.parametrize(("command", "name"), [("query", "spend.csv"), ("report", "is.csv")])
def test_a_csv_name_still_writes_csv(tmp_path: Path, command: str, name: str) -> None:
    args = [QUERY] if command == "query" else ["income-statement"]
    result = _bea(tmp_path, "-f", "main.bean", command, *args, "-o", name)

    assert result.returncode == 0, result.stderr or result.stdout
    text = (tmp_path / name).read_text(encoding="utf-8")
    assert "," in text.splitlines()[0]
    assert "----" not in text


@pytest.mark.parametrize(("name", "said"), [("spend.tsv", "looks like TSV"), ("spend.json", "looks like JSON")])
def test_tsv_and_json_names_keep_their_own_refusal(tmp_path: Path, name: str, said: str) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "query", QUERY, "-o", name)

    assert result.returncode == 2, result.stderr or result.stdout
    assert said in result.stderr
    assert "workbook" not in result.stderr
