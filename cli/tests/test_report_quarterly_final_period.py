"""A complete final quarter is a reporting period even when it is empty (w3/384).

`_flow_ranges` (w3/375) drops a *clipped fragment* that carries no entries, and
decides "whole vs fragment" with `interval.get_prev(last.begin) == last.begin`.
That test assumes `get_prev` is idempotent on a period start — true for year,
month, week and day, but `_IntervalQuarter.get_prev` scanned `[10, 7, 4]` with
a strict `>`, so every date in April, July and October answered the *previous*
quarter's start. A whole Q4 therefore read as a fragment and vanished from a
full-year quarterly breakdown whenever it was empty.

The same non-idempotence made `number_of_days` report the wrong quarter's
length for those months, so the unit tests below pin `get_prev` directly rather
than only through the report.
"""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fava.util.date import Quarter  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-02-10 * "Grocer"
  Expenses:Food   10.00 USD
  Assets:Cash
"""

WEEKLY_LEDGER = """option "operating_currency" "USD"
2019-12-01 open Assets:Cash USD
2019-12-01 open Expenses:Food USD
2020-03-10 * "Grocer"
  Expenses:Food   10.00 USD
  Assets:Cash
2020-12-31 * "Year-end lunch"
  Expenses:Food    5.00 USD
  Assets:Cash
"""


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


def _ledger(tmp_path: Path, text: str = LEDGER) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(text, encoding="utf-8")
    return path


def _periods(tmp_path: Path, ledger: Path, *args: str) -> list[str]:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "report", "income-statement", *args)
    assert done.returncode == 0, done.stderr
    return [period["date"] for period in json.loads(done.stdout)["data"]["periods"]]


class TestQuarterGetPrev:
    """`get_prev` answers the start of the quarter the date falls in."""

    @pytest.mark.parametrize(
        ("month", "expected"),
        [
            (1, 1),
            (2, 1),
            (3, 1),
            (4, 4),
            (5, 4),
            (6, 4),
            (7, 7),
            (8, 7),
            (9, 7),
            (10, 10),
            (11, 10),
            (12, 10),
        ],
    )
    def test_every_month_maps_to_its_own_quarter(self, month: int, expected: int) -> None:
        assert Quarter.get_prev(datetime.date(2026, month, 15)) == datetime.date(2026, expected, 1)

    @pytest.mark.parametrize("month", [1, 4, 7, 10])
    def test_idempotent_on_every_quarter_start(self, month: int) -> None:
        """The property `_flow_ranges` relies on, and that `>` broke for 3 of 4."""
        start = datetime.date(2026, month, 1)
        assert Quarter.get_prev(start) == start

    @pytest.mark.parametrize(("month", "days"), [(1, 90), (4, 91), (7, 92), (10, 92)])
    def test_number_of_days_is_the_surrounding_quarters_length(self, month: int, days: int) -> None:
        """2026 is not a leap year; Q1 is 90 days, and each date sees its own quarter."""
        assert Quarter.number_of_days(datetime.date(2026, month, 15)) == days


def test_full_year_quarterly_reports_four_periods(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    assert _periods(tmp_path, ledger, "-t", "2026", "-i", "quarterly") == [
        "2026-03-31",
        "2026-06-30",
        "2026-09-30",
        "2026-12-31",
    ]


def test_the_human_table_shows_the_empty_final_quarter_as_zero(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    done = _bea(tmp_path, "--file", str(ledger), "report", "income-statement", "-t", "2026", "-i", "quarterly")

    assert done.returncode == 0, done.stderr
    # The filter's own end date is in the title line too, so match the breakdown
    # row: a period end followed by its cells, not the bare date anywhere.
    rows = [line for line in done.stdout.splitlines() if line.startswith("2026-")]
    assert [line.split()[0] for line in rows] == ["2026-03-31", "2026-06-30", "2026-09-30", "2026-12-31"]
    assert rows[-1].split()[-2:] == ["0.00", "USD"], "an empty complete quarter reads 0.00, like Q2 and Q3"


def test_the_envelope_no_longer_contradicts_itself(tmp_path: Path) -> None:
    """`end_exclusive` 2027-01-01 with `truncated: false` must mean four quarters."""
    ledger = _ledger(tmp_path)
    done = _bea(
        tmp_path, "--json", "--file", str(ledger), "report", "income-statement", "-t", "2026", "-i", "quarterly"
    )
    assert done.returncode == 0, done.stderr
    envelope = json.loads(done.stdout)
    data = envelope["data"]

    assert data["period"]["end_exclusive"] == "2027-01-01"
    assert envelope["truncated"] is False
    assert len(data["periods"]) == 4


def test_multi_year_filter_keeps_its_trailing_quarter(tmp_path: Path) -> None:
    """The note's wider case: 2025 Q1-Q4 plus 2026 Q1-Q4, not Q1-Q3."""
    ledger = _ledger(tmp_path)

    periods = _periods(tmp_path, ledger, "-t", "2025-01 - 2026-12", "-i", "quarterly")

    assert len(periods) == 8
    assert periods[-1] == "2026-12-31"


def test_intervals_agree_about_the_same_filter(tmp_path: Path) -> None:
    """Monthly was always right; quarterly and yearly must tell the same story."""
    ledger = _ledger(tmp_path)

    assert len(_periods(tmp_path, ledger, "-t", "2026", "-i", "monthly")) == 12
    assert len(_periods(tmp_path, ledger, "-t", "2026", "-i", "quarterly")) == 4
    assert len(_periods(tmp_path, ledger, "-t", "2026", "-i", "yearly")) == 1


class TestWeeklyFragmentsStillDropped:
    """w3/375's definition of done, which this fix must not undo."""

    def test_month_filter_ends_on_its_last_whole_week(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, WEEKLY_LEDGER)

        periods = _periods(tmp_path, ledger, "-t", "2020-03", "-i", "weekly")

        assert periods[-1] == "2020-03-29", "the empty 2020-03-30..31 fragment stays dropped"

    def test_a_fragment_carrying_entries_is_kept(self, tmp_path: Path) -> None:
        ledger = _ledger(tmp_path, WEEKLY_LEDGER)

        periods = _periods(tmp_path, ledger, "-t", "2020-12", "-i", "weekly")

        assert periods[-1] == "2020-12-31", "a fragment with a transaction in it is a real period"
