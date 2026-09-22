"""A CSV cell error names the row the preview would name (w3/385).

`bea import` numbered rows two ways in one command. The preview's `ROW` column,
the blocked explanations and the duplicate/conflict explanations all used a
1-based data-row index that skips blank rows; `csv_mapper`'s cell-parse errors
used `index + 2`, reconstructing the physical file line and labelling it `Row`.
So "Row 5" in an error and "Row 5" in the table were different records — and
because blank rows are skipped by one and counted by the other, the offset was
not even a constant the reader could correct for.

The oracle here is the preview itself: make the bad cell valid, read the `ROW`
the table assigns that record, and require the error to have named the same
number. That cannot pass on a constant offset.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Bank:Checking USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Expenses:Uncategorized USD
"""

ACCOUNT = "Assets:Bank:Checking"
BAD_DATE = "2026-13-45"
GOOD_DATE = "2026-02-05"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


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


def _import(tmp_path: Path, ledger: Path, source: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "auto",
        "--account",
        ACCOUNT,
        *extra,
    )


def _error_row(stderr: str) -> int:
    match = re.search(r"Row (\d+)", stderr)
    assert match is not None, f"no row number in the error: {stderr!r}"
    return int(match.group(1))


def _preview_row_of(stdout: str, narration: str) -> int:
    """The `ROW` the preview table assigns the record carrying this narration."""
    for line in stdout.splitlines():
        if narration in line:
            return int(line.split()[0])
    raise AssertionError(f"{narration!r} is not in the preview: {stdout!r}")


def _csv(tmp_path: Path, name: str, body: str) -> Path:
    source = tmp_path / name
    source.write_text(body, encoding="utf-8")
    return source


# (id, rows before the failing record, blank rows among them)
SHAPES = [
    pytest.param("", id="bad-row-is-first"),
    pytest.param("2026-02-01,-1.00,before one\n", id="one-good-row-above"),
    pytest.param("2026-02-01,-1.00,before one\n2026-02-02,-2.00,before two\n", id="two-good-rows-above"),
    pytest.param(",,\n", id="one-blank-row-above"),
    pytest.param("2026-02-01,-1.00,before one\n,,\n,,\n", id="good-row-then-two-blanks"),
    pytest.param(",,\n2026-02-01,-1.00,before one\n,,\n", id="blanks-around-a-good-row"),
]


@pytest.mark.parametrize("preamble", SHAPES)
def test_error_names_the_same_row_the_preview_does(tmp_path: Path, ledger: Path, preamble: str) -> None:
    header = "Date,Amount,Description\n"
    failing = _csv(tmp_path, "bad.csv", f"{header}{preamble}{BAD_DATE},-9.00,THE RECORD\n")
    rejected = _import(tmp_path, ledger, failing, "--apply")
    assert rejected.returncode == 2, rejected.stdout

    # The same file with that one cell repaired: the preview is the oracle.
    repaired = _csv(tmp_path, "good.csv", f"{header}{preamble}{GOOD_DATE},-9.00,THE RECORD\n")
    preview = _import(tmp_path, ledger, repaired)
    assert preview.returncode == 0, preview.stderr

    assert _error_row(rejected.stderr) == _preview_row_of(preview.stdout, "THE RECORD")


def test_the_physical_line_is_kept_but_labelled(tmp_path: Path, ledger: Path) -> None:
    """Both numbers are useful; only conflating them was the bug."""
    source = _csv(
        tmp_path,
        "drift.csv",
        f"Date,Amount,Description\n2026-02-01,-1.00,good one\n,,\n,,\n{BAD_DATE},-9.00,THE RECORD\n",
    )

    rejected = _import(tmp_path, ledger, source, "--apply")

    assert rejected.returncode == 2
    # Row 2 of the data, on physical line 5 — the old message said "Row 5".
    assert "Row 2 (line 5)" in rejected.stderr


def test_the_ledger_is_untouched_by_a_rejected_batch(tmp_path: Path, ledger: Path) -> None:
    """The refusal itself was always correct; keep it that way."""
    before = ledger.read_bytes()
    source = _csv(tmp_path, "bad.csv", f"Date,Amount,Description\n{BAD_DATE},-9.00,THE RECORD\n")

    assert _import(tmp_path, ledger, source, "--apply").returncode == 2
    assert ledger.read_bytes() == before


def test_every_cell_diagnostic_uses_the_new_vocabulary(tmp_path: Path, ledger: Path) -> None:
    """The eight diagnostics share one locator, so a sample of them must agree."""
    header = "Date,Amount,Description\n"
    good = "2026-02-01,-1.00,good one\n"
    for name, bad_cell in [("date.csv", f"{BAD_DATE},-9.00,x"), ("amount.csv", "2026-02-05,abc,x")]:
        source = _csv(tmp_path, name, f"{header}{good}{bad_cell}\n")
        rejected = _import(tmp_path, ledger, source, "--apply")
        assert rejected.returncode == 2, rejected.stdout
        assert "Row 2 (line 3)" in rejected.stderr, f"{name}: {rejected.stderr!r}"


def test_mixed_decimal_conventions_name_a_data_row_too(tmp_path: Path, ledger: Path) -> None:
    """The column-level refusal counts data rows as well, blanks excluded."""
    source = _csv(
        tmp_path,
        "mixed.csv",
        'Date,Amount,Description\n,,\n2026-02-01,"1,000.00",us\n2026-02-02,"1.000,00",eu\n',
    )

    rejected = _import(tmp_path, ledger, source, "--apply")

    assert rejected.returncode == 2
    assert "decimal conventions" in rejected.stderr
    # Data rows 1 and 2 despite the blank row above them (physical lines 3, 4).
    assert "row 1 uses" in rejected.stderr and "row 2 uses" in rejected.stderr


def test_blocked_and_duplicate_explanations_are_unchanged(tmp_path: Path, ledger: Path) -> None:
    """The control: these already agreed with the table and must keep agreeing."""
    source = _csv(
        tmp_path,
        "blocked.csv",
        "Date,Amount,Description,Category\n"
        "2026-02-01,-1.00,a,Expenses:Food\n"
        "2026-02-02,-2.00,b,Expenses:Food\n"
        "2026-02-03,-3.00,THE BLOCKED ONE,Expenses:NeverOpened\n",
    )

    preview = _import(tmp_path, ledger, source)

    assert preview.returncode == 0, preview.stderr
    assert _preview_row_of(preview.stdout, "THE BLOCKED ONE") == 3
    assert "Row 3: Account 'Expenses:NeverOpened' is not open" in preview.stdout
