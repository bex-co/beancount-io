"""Capital Gains and Cash Flow state the date window they were bounded to (w5/1036).

`--from-date / --to-date` filtered the rows, but `period`, `as_of` and the
heading still described the whole ledger: an empty selected day read
`No sales.` under months that held sales.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Stock HOOL
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
2024-01-01 * "Buy"
  Assets:Stock 3 HOOL {100 USD}
  Assets:Cash -300 USD
2024-01-02 * "Sell one"
  Assets:Stock -1 HOOL {100 USD} @ 110 USD
  Assets:Cash 110 USD
  Income:Gains -10 USD
2024-01-31 * "Sell another"
  Assets:Stock -1 HOOL {100 USD} @ 120 USD
  Assets:Cash 120 USD
  Income:Gains -20 USD
"""


def _report(tmp_path: Path, kind: str, *args: str, as_json: bool = True) -> object:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = bea(["--file", str(ledger), *(["--json"] if as_json else []), "report", kind, *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"] if as_json else proc.stdout


@pytest.mark.parametrize("kind", ["capital-gains", "cash-flow"])
@pytest.mark.parametrize(
    ("args", "first", "last"),
    [
        (["--from-date", "2024-01-02", "--to-date", "2024-01-02"], "2024-01-02", "2024-01-02"),
        (["--from-date", "2024-01-15", "--to-date", "2024-01-15"], "2024-01-15", "2024-01-15"),
        (["--from-date", "2024-01-15"], "2024-01-15", "2024-01-31"),
        (["--to-date", "2024-01-15"], "2024-01-01", "2024-01-15"),
        (["--time", "2024-01-10 - 2024-01-31", "--to-date", "2024-01-20"], "2024-01-10", "2024-01-20"),
        # The calendar's last day bounds nothing and has no day after it (w5/1049).
        (["--to-date", "9999-12-31"], "2024-01-01", "2024-01-31"),
        # A lone to-date before the first entry is that day, not a reversed range (w1/248).
        (["--to-date", "2023-06-01"], "2023-06-01", "2023-06-01"),
        (["--from-date", "2024-03-01"], "2024-03-01", "2024-03-01"),
        # Sharing only the period's last day still overlaps it.
        (["--time", "2024-01", "--from-date", "2024-01-31"], "2024-01-31", "2024-01-31"),
    ],
    ids=[
        "populated-day",
        "quiet-day",
        "from-only",
        "to-only",
        "time-intersection",
        "maximum-to",
        "to-before-ledger",
        "from-after-ledger",
        "time-last-day",
    ],
)
def test_the_window_is_the_reported_period(tmp_path: Path, kind: str, args: list[str], first: str, last: str) -> None:
    data = _report(tmp_path, kind, *args)

    assert data["period"]["start"] == first  # type: ignore[index]
    assert data["as_of"] == last  # type: ignore[index]
    heading = _report(tmp_path, kind, *args, as_json=False)
    assert f"{first} through {last}" in heading  # type: ignore[operator]


def test_unbounded_gains_keep_the_whole_period(tmp_path: Path) -> None:
    data = _report(tmp_path, "capital-gains")

    assert data["period"]["start"] == "2024-01-01" and data["as_of"] == "2024-01-31"  # type: ignore[index]
    assert data["totals"]["one_year_or_less"] == {"USD": "30"}  # type: ignore[index]
    assert "bounds" not in data  # type: ignore[operator]


@pytest.mark.parametrize("kind", ["capital-gains", "cash-flow"])
@pytest.mark.parametrize(
    ("args", "message"),
    [
        (
            ["--time", "2025", "--to-date", "2024-06-01"],
            "--to-date 2024-06-01 is before the --time period 2025-01-01 through 2025-12-31.",
        ),
        (
            ["--time", "2023", "--from-date", "2024-01-15"],
            "--from-date 2024-01-15 is after the --time period 2023-01-01 through 2023-12-31.",
        ),
        (
            ["--time", "2024-01", "--from-date", "2024-02-01", "--to-date", "2024-02-10"],
            "--from-date 2024-02-01 is after the --time period 2024-01-01 through 2024-01-31.",
        ),
    ],
    ids=["to-before-time", "from-after-time", "window-after-time"],
)
def test_a_window_outside_time_is_refused(tmp_path: Path, kind: str, args: list[str], message: str) -> None:
    """A window sharing no day with `--time` read as a reversed period, exit 0 (w1/248)."""
    ledger = write_ledger(tmp_path, LEDGER)
    before = ledger.read_bytes()
    proc = bea(["--file", str(ledger), "report", kind, *args], tmp_path)

    assert proc.returncode == 2, proc.stdout
    assert message in proc.stderr
    assert proc.stdout == ""
    assert ledger.read_bytes() == before
