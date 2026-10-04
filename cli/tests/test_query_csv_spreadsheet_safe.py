"""CSV exports keep values verbatim; `--spreadsheet-safe` neutralises formulas (w1/147).

Payees and narrations often come from imported bank exports, so a cell such as
`=HYPERLINK(...)` is evaluated when the CSV is opened in a spreadsheet. The
default stays byte-faithful, as `bean-query` is, because programs read these
files back; the opt-in flag prefixes formula-looking *text* cells with `'`
(OWASP's CSV-injection guidance) and leaves numbers and amounts alone.
"""

from __future__ import annotations

import csv
import io
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = r"""option "operating_currency" "USD"
2024-01-01 open Assets:Cash
2024-01-01 open Expenses:Food
2024-02-01 * "=HYPERLINK(\"http://x\",\"y\")" "-2+3"
  Expenses:Food 5 USD
  Assets:Cash
2024-02-02 * "@SUM(1+1)" "+cmd|' /C calc'!A0"
  Expenses:Food 1 USD
  Assets:Cash
2024-02-03 * "Grocer" "plain"
  Expenses:Food 2 USD
  Assets:Cash
"""
QUERY = "SELECT payee, narration, position WHERE account = 'Expenses:Food'"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _rows(text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(text)))[1:]


def test_csv_cells_stay_verbatim_by_default(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "--file", str(ledger), "query", QUERY, "-f", "csv")

    assert done.returncode == 0, done.stderr
    assert _rows(done.stdout) == [
        ['=HYPERLINK("http://x","y")', "-2+3", "5 USD"],
        ["@SUM(1+1)", "+cmd|' /C calc'!A0", "1 USD"],
        ["Grocer", "plain", "2 USD"],
    ]


def test_spreadsheet_safe_prefixes_formula_text_only(tmp_path: Path, ledger: Path) -> None:
    out = tmp_path / "out.csv"
    done = _bea(tmp_path, "--file", str(ledger), "query", QUERY, "-o", str(out), "--spreadsheet-safe")

    assert done.returncode == 0, done.stderr
    assert _rows(out.read_text(encoding="utf-8")) == [
        ['\'=HYPERLINK("http://x","y")', "'-2+3", "5 USD"],
        ["'@SUM(1+1)", "'+cmd|' /C calc'!A0", "1 USD"],
        ["Grocer", "plain", "2 USD"],
    ]


def test_spreadsheet_safe_leaves_negative_numbers_alone(tmp_path: Path, ledger: Path) -> None:
    done = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        "SELECT number, position WHERE account = 'Assets:Cash' ORDER BY date LIMIT 1",
        "-f",
        "csv",
        "--spreadsheet-safe",
    )

    assert done.returncode == 0, done.stderr
    assert _rows(done.stdout) == [["-5", "-5 USD"]]


@pytest.mark.parametrize(
    "args",
    [["-f", "text"], ["-f", "beancount"], ["--json"], ["--source"]],
    ids=["text", "beancount", "json", "source"],
)
def test_spreadsheet_safe_outside_local_csv_is_a_usage_error(tmp_path: Path, ledger: Path, args: list[str]) -> None:
    if args == ["--json"]:
        argv = ["--json", "--file", str(ledger), "query", QUERY]
    elif args == ["--source"]:
        argv = ["query", "--source", str(ledger), "-f", "csv", QUERY]
    else:
        argv = ["--file", str(ledger), "query", *args, QUERY]
    done = _bea(tmp_path, *argv, "--spreadsheet-safe")

    assert done.returncode == 2
    assert "--spreadsheet-safe applies to CSV" in done.stderr
