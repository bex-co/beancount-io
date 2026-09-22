"""A cell error names the line the record really starts on (w3/406).

w3/385 gave `import` one row vocabulary — `Row N (line M)`, where N is the
preview's data-row ordinal and M the physical file line — and explicitly left
quoted multiline cells unverified. This is that case.

The physical line was derived from the record's *position* (`index + 2`), which
is only the file line while one record is one line. A quoted cell containing
newlines breaks that, and every later error pointed at a line inside an earlier
record: the reported fixture named line 3, which holds `and`, for a bad date on
line 5.

The line now comes from the reader. `csv.reader.line_num` counts lines
consumed, so a record starts one past wherever the reader stood before it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
"""
HEADER = "Date,Amount,Description\n"
MULTILINE = '2026-01-02,-5,"Coffee\nand\nfood"\n'  # physical lines 2-4


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _import(tmp_path: Path, ledger: Path, body: str) -> subprocess.CompletedProcess[str]:
    source = tmp_path / "bank.csv"
    source.write_text(HEADER + body, encoding="utf-8")
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "date=Date,amount=Amount,narration=Description",
        "--date-format",
        "%Y-%m-%d",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        "--apply",
    )


def _message(done: subprocess.CompletedProcess[str]) -> str:
    assert done.returncode == 2, done.stdout
    return json.loads(done.stderr)["error"]["message"]


@pytest.mark.parametrize(
    ("body", "locator", "note"),
    [
        pytest.param(
            MULTILINE + "2026-13-02,-7,Dinner\n",
            "Row 2 (line 5)",
            "the record after a three-line quoted cell",
            id="bad-date-after-multiline",
        ),
        pytest.param(
            MULTILINE + "2026-01-03,bad,Dinner\n",
            "Row 2 (line 5)",
            "the amount diagnostic shares the locator",
            id="bad-amount-after-multiline",
        ),
        pytest.param(
            MULTILINE + ",,\n2026-13-02,-7,Dinner\n",
            "Row 2 (line 6)",
            "a skipped blank row advances the line but not the ordinal",
            id="multiline-then-blank",
        ),
        pytest.param(
            '2026-01-02,-5,"a\nb"\n2026-01-03,-6,"c\nd"\n2026-13-04,-7,x\n',
            "Row 3 (line 6)",
            "two multiline records compound the drift",
            id="two-multiline-records",
        ),
        pytest.param(
            "2026-01-02,-5,Coffee and food\n2026-01-03,bad,Dinner\n",
            "Row 2 (line 3)",
            "the single-line control, which was always right",
            id="single-line-control",
        ),
        pytest.param(
            "2026-13-01,-5,First\n",
            "Row 1 (line 2)",
            "the very first data record",
            id="first-record",
        ),
    ],
)
def test_the_locator_names_the_records_own_line(
    tmp_path: Path, ledger: Path, body: str, locator: str, note: str
) -> None:
    message = _message(_import(tmp_path, ledger, body))

    assert message.startswith(locator), f"{note}: {message}"


def test_a_multiline_description_still_imports(tmp_path: Path, ledger: Path) -> None:
    """The control that matters most: quoted newlines are valid CSV, not an error."""
    done = _import(tmp_path, ledger, MULTILINE)

    assert done.returncode == 0, done.stderr
    written = ledger.read_text(encoding="utf-8")
    assert "-5.00 USD" in written or "-5 USD" in written
    # w3/392 collapses the embedded newlines into one line of ledger text.
    assert "Coffee and food" in written, written


def test_the_row_ordinal_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    """w3/385's vocabulary stays; only the parenthesised line was wrong."""
    message = _message(_import(tmp_path, ledger, MULTILINE + ",,\n2026-13-02,-7,Dinner\n"))

    assert message.startswith("Row 2 "), "the blank row still does not consume an ordinal"
