"""Import preview tallies count conflict rows (w3/383).

`conflict` is the highest-stakes row status — it alone forces `--apply` to exit
4 — and it was the one status counted nowhere. The engine tracked conflicts as
a boolean for the exit gate, and neither surface's summary had a clause for
them, so an all-conflict preview read:

    … 0 ready, 0 exact duplicates, 0 possible duplicates

A script, or a skimming human, concluded "empty file, nothing to do" when the
real answer was "review required". Per-row reporting was always correct; only
the tallies were blind.
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
2020-01-01 open Assets:Bank:Checking USD
2020-01-01 open Expenses:Uncategorized USD
"""

ACCOUNT = "Assets:Bank:Checking"
HEADER = "Date,Amount,Description,FitId\n"

TALLIES = ("ready", "duplicates", "possible_duplicates", "conflicts", "blocked")


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


def _import(
    tmp_path: Path, ledger: Path, source: Path, *extra: str, as_json: bool = False
) -> subprocess.CompletedProcess[str]:
    prefix = ["--json"] if as_json else []
    return _bea(
        tmp_path,
        *prefix,
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


@pytest.fixture
def seeded(tmp_path: Path) -> tuple[Path, Path]:
    """A ledger holding one applied row, so a reused FitId conflicts."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    first = tmp_path / "a.csv"
    first.write_text(HEADER + "2020-03-01,-12.34,Coffee,ID1\n", encoding="utf-8")
    applied = _import(tmp_path, ledger, first, "--apply", "--duplicates", "include")
    assert applied.returncode == 0, applied.stderr or applied.stdout
    return ledger, first


def _conflict_source(tmp_path: Path) -> Path:
    """The same stable ID carrying different data — the note's repro shape."""
    source = tmp_path / "conflict.csv"
    source.write_text(HEADER + "2020-03-01,-99.00,Coffee,ID1\n", encoding="utf-8")
    return source


def test_human_summary_names_the_conflict(tmp_path: Path, seeded: tuple[Path, Path]) -> None:
    ledger, _ = seeded
    preview = _import(tmp_path, ledger, _conflict_source(tmp_path))

    assert preview.returncode == 0, preview.stderr
    summary = preview.stdout.splitlines()[0]
    assert "1 conflict" in summary, f"an all-conflict preview must not read as empty: {summary!r}"


def test_json_preview_carries_the_conflict_count(tmp_path: Path, seeded: tuple[Path, Path]) -> None:
    ledger, _ = seeded
    preview = _import(tmp_path, ledger, _conflict_source(tmp_path), as_json=True)

    assert preview.returncode == 0, preview.stderr
    data = json.loads(preview.stdout)["data"]
    assert data["conflicts"] == 1
    assert [row["status"] for row in data["rows"]] == ["conflict"]


def test_mixed_preview_tallies_sum_to_the_row_count(tmp_path: Path, seeded: tuple[Path, Path]) -> None:
    """Every row must land in exactly one tally, or the summary still lies."""
    ledger, _ = seeded
    mixed = tmp_path / "mixed.csv"
    mixed.write_text(
        HEADER
        + "2020-03-01,-99.00,Coffee,ID1\n"  # conflict: reused ID, different amount
        + "2020-03-01,-12.34,Coffee,ID1\n"  # duplicate: reused ID, same data
        + "2020-04-01,-7.00,Bagel,ID2\n",  # new/ready
        encoding="utf-8",
    )

    preview = _import(tmp_path, ledger, mixed, as_json=True)

    assert preview.returncode == 0, preview.stderr
    data = json.loads(preview.stdout)["data"]
    assert data["conflicts"] == 1
    assert sum(data[name] for name in TALLIES) == len(data["rows"])


def test_apply_still_refuses_and_reports_the_count(tmp_path: Path, seeded: tuple[Path, Path]) -> None:
    """The exit-4 gate and the no-write guarantee were always right; keep them."""
    ledger, _ = seeded
    before = ledger.read_bytes()

    refused = _import(tmp_path, ledger, _conflict_source(tmp_path), "--apply", as_json=True)

    assert refused.returncode == 4
    assert ledger.read_bytes() == before, "a conflicting apply must write nothing"
    result = json.loads(refused.stderr)["error"]["result"]
    assert result["conflicts"] == 1
    assert result["written"] == 0, "nothing was written, so nothing is accounted as written"


def test_a_clean_preview_says_nothing_about_conflicts(tmp_path: Path) -> None:
    """The control: the clause appears only when there is something to report."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    source = tmp_path / "clean.csv"
    source.write_text(HEADER + "2020-05-01,-3.00,Tea,ID9\n", encoding="utf-8")

    preview = _import(tmp_path, ledger, source)

    assert preview.returncode == 0, preview.stderr
    summary = preview.stdout.splitlines()[0]
    assert "1 ready" in summary
    assert "conflict" not in summary


def _apply_error(tmp_path: Path, ledger: Path, source: Path) -> dict:
    done = _import(tmp_path, ledger, source, "--apply", as_json=True)
    assert done.returncode == 4, done.stdout
    return json.loads(done.stderr)["error"]


def test_an_id_repeated_inside_the_export_points_at_the_file(tmp_path: Path) -> None:
    """w1/168: the advice sent the user to a ledger entry that does not exist."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    before = ledger.read_bytes()
    source = tmp_path / "in3.csv"
    source.write_text(HEADER + "2020-06-03,-1.00,Tea,Q9\n2020-06-03,-2.00,Tea,Q9\n", encoding="utf-8")

    error = _apply_error(tmp_path, ledger, source)

    rows = error["result"]["rows"]
    assert [row["status"] for row in rows] == ["new", "conflict"]
    assert rows[1]["reason"] == "Stable ID repeats row 1 of this import with different transaction data."
    assert "ledger" not in error["message"]
    assert "source file" in error["message"]
    assert error["details"] == [f"Row 2 (conflict): {rows[1]['reason']}"]
    assert ledger.read_bytes() == before


def test_a_ledger_id_conflict_keeps_its_wording(tmp_path: Path, seeded: tuple[Path, Path]) -> None:
    ledger, _ = seeded

    error = _apply_error(tmp_path, ledger, _conflict_source(tmp_path))

    assert error["message"] == (
        "Import needs review; nothing was written. A stable ID already matches a ledger entry with different "
        "data — edit or remove that entry, change the bank ID, or drop the row."
    )
    assert error["result"]["rows"][0]["reason"] == "Stable ID matches an entry with different transaction data."
