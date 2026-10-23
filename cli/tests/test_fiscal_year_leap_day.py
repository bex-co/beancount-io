"""A February fiscal year keeps leap day in its current year (w5/966).

`substitute` compared today with `02-28` literally, so on February 29 the
relative `fiscal_year` advanced to the next year while `get_fiscal_period`
(and so absolute FY labels) ends that year on the month's last day.
"""

from __future__ import annotations

import datetime

import pytest

from fava.util import date as fava_date
from fava.util.date import FiscalYearEnd, get_fiscal_period, parse_date, substitute


def _today(monkeypatch: pytest.MonkeyPatch, day: datetime.date) -> None:
    monkeypatch.setattr(fava_date, "local_today", lambda: day)


FEB = FiscalYearEnd(2, 28)
FOLLOWING = FiscalYearEnd(14, 28)


@pytest.mark.parametrize(
    ("day", "fye", "label"),
    [
        (datetime.date(2024, 2, 28), FEB, "FY2024"),
        (datetime.date(2024, 2, 29), FEB, "FY2024"),
        (datetime.date(2024, 3, 1), FEB, "FY2025"),
        (datetime.date(2028, 2, 29), FEB, "FY2028"),
        (datetime.date(2023, 2, 28), FEB, "FY2023"),
        (datetime.date(2024, 2, 28), FOLLOWING, "FY2023"),
        (datetime.date(2024, 2, 29), FOLLOWING, "FY2023"),
        (datetime.date(2024, 3, 1), FOLLOWING, "FY2024"),
    ],
)
def test_the_relative_year_contains_leap_day(
    monkeypatch: pytest.MonkeyPatch, day: datetime.date, fye: FiscalYearEnd, label: str
) -> None:
    _today(monkeypatch, day)

    assert substitute("fiscal_year", fye) == label
    assert parse_date(substitute("fiscal_year", fye), fye)[0] <= day < parse_date(label, fye)[1]  # type: ignore[operator]


def test_offsets_follow_the_corrected_base(monkeypatch: pytest.MonkeyPatch) -> None:
    _today(monkeypatch, datetime.date(2024, 2, 29))

    assert substitute("fiscal_year-1", FEB) == "FY2023"
    assert substitute("fiscal_year+1", FEB) == "FY2025"


@pytest.mark.parametrize("fye", [FiscalYearEnd(3, 31), FiscalYearEnd(12, 31), FiscalYearEnd(2, 27)])
def test_other_year_ends_are_unchanged(monkeypatch: pytest.MonkeyPatch, fye: FiscalYearEnd) -> None:
    for day in (datetime.date(2024, 2, 29), datetime.date(2024, 3, 1), datetime.date(2024, 12, 31)):
        _today(monkeypatch, day)
        label = substitute("fiscal_year", fye)
        start, end = get_fiscal_period(int(label[2:]), fye)
        assert start is not None and end is not None and start <= day < end
