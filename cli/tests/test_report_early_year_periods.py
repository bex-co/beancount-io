"""Relative periods and ISO weeks keep their four-digit year before year 1000 (w5/936).

`substitute` wrote `year-1027` as `999` and the ISO-week branch rebuilt
`0999-W01` as `999-W1`; `parse_date` requires four digits, so it rejected its
own replacement while the equivalent absolute spelling worked.
"""

from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

import pytest

from fava.util import date as fava_date
from fava.util.date import FiscalYearEnd, parse_date, substitute
from tests.test_import_source_facts import _bea

TODAY = datetime.date(2026, 6, 15)


@pytest.fixture(autouse=True)
def _today(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fava_date, "local_today", lambda: TODAY)


@pytest.mark.parametrize(
    ("relative", "absolute"),
    [
        ("year-1027", "0999"),
        ("year-2025", "0001"),
        ("year-1026", "1000"),
        ("fiscal_year-1027", "FY0999"),
        ("quarter-4108", "0999-Q2"),
        ("month-12324", "0999-06"),
        ("fiscal_quarter-4108", "FY0999-Q2"),
    ],
)
def test_a_relative_term_before_year_1000_parses_as_its_absolute_spelling(relative: str, absolute: str) -> None:
    fye = FiscalYearEnd(12, 31)

    replaced = substitute(relative, fye)

    assert replaced.upper() == absolute.upper()
    assert parse_date(replaced, fye) == parse_date(absolute, fye)
    assert parse_date(replaced, fye) != (None, None)


def test_a_relative_week_before_year_1000_is_padded() -> None:
    weeks_back = (TODAY - datetime.date(999, 6, 15)).days // 7

    replaced = substitute(f"week-{weeks_back}", None)

    assert re.fullmatch(r"0999-W\d{2}", replaced)
    assert parse_date(replaced)[0] is not None
    assert parse_date("0999-W01") == (datetime.date(998, 12, 31), datetime.date(999, 1, 7))


def test_ordinary_years_and_invalid_weeks_are_unchanged() -> None:
    assert substitute("year-1", None) == "2025"
    assert substitute("week", None) == "2026-W25"
    assert parse_date("2024-W10") == (datetime.date(2024, 3, 4), datetime.date(2024, 3, 11))
    with pytest.raises(ValueError):
        parse_date("2021-W53")


def test_an_absolute_iso_week_before_year_1000_reports(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n'
        "0001-01-01 open Assets:Cash USD\n0001-01-01 open Income:Salary USD\n"
        '0999-01-02 * "Three-digit year"\n  Assets:Cash 2.00 USD\n  Income:Salary -2.00 USD\n'
    )

    result = _bea(tmp_path, "report", "income-statement", "--time", "0999-W01", "--interval", "yearly")

    assert result.returncode == 0, result.stderr
    assert "2.00" in json.dumps(json.loads(result.stdout)["data"])
