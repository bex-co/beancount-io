"""A CSV calendar week and weekday must fall in the year they are stated in (w5/1022).

`%Y-W%W-%w` read `2021-W53-1` as 2022-01-03 and `%U` read `2021-W00-0` as
2020-12-27: no day of 2021 has those week/weekday pairs, yet the row was
previewed ready and the expense written into another year.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_day_of_year_dates import BASE, _import
from tests.test_import_source_facts import _bea

IMPOSSIBLE = [
    ("2021-W53-1", "%Y-W%W-%w"),
    ("2021-W53-0", "%Y-W%U-%w"),
    ("2021-W00-1", "%Y-W%W-%w"),
    ("2021-W00-0", "%Y-W%U-%w"),
    ("21-W53-1", "%y-W%W-%w"),
    ("21-W53-0", "%y-W%U-%w"),
]


@pytest.mark.parametrize(("value", "date_format"), IMPOSSIBLE)
def test_a_week_and_weekday_outside_the_stated_year_is_refused(tmp_path: Path, value: str, date_format: str) -> None:
    preview = _import(tmp_path, value, date_format)
    applied = _import(tmp_path, value, date_format, "--apply")

    assert preview.returncode == 2, preview.stdout  # type: ignore[attr-defined]
    message = json.loads(preview.stderr)["error"]["message"]  # type: ignore[attr-defined]
    assert "cannot parse date" in message and "'Date'" in message and date_format in message
    assert applied.returncode == 2  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == BASE.encode()


@pytest.mark.parametrize("weekday", ["1", "0"])
def test_a_file_with_one_impossible_week_writes_nothing(tmp_path: Path, weekday: str) -> None:
    week = "%W" if weekday == "1" else "%U"
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "bank.csv").write_text(
        f"Date,Description,Amount\n2021-W52-{weekday},Lunch,-2.25\n2021-W53-{weekday},Coffee,-7.75\n"
    )

    applied = _bea(
        tmp_path,
        "import",
        "bank.csv",
        "--csv",
        "date=Date,narration=Description,amount=Amount",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        "--date-format",
        f"%Y-W{week}-%w",
        "--apply",
    )

    assert applied.returncode == 2
    assert (tmp_path / "main.bean").read_bytes() == BASE.encode()


@pytest.mark.parametrize(
    ("value", "date_format", "expected"),
    [
        ("2021-W00-5", "%Y-W%W-%w", "2021-01-01"),
        ("2018-W53-1", "%Y-W%W-%w", "2018-12-31"),
        ("2023-W53-0", "%Y-W%U-%w", "2023-12-31"),
        ("2021-W1-1", "%Y-W%W-%w", "2021-01-04"),
        ("2021-W1-1", "%Y-W%U-%w", "2021-01-04"),
        ("2020-W53-5", "%G-W%V-%u", "2021-01-01"),
    ],
)
def test_valid_week_dates_still_import(tmp_path: Path, value: str, date_format: str, expected: str) -> None:
    preview = _import(tmp_path, value, date_format)

    assert preview.returncode == 0, preview.stderr  # type: ignore[attr-defined]
    assert [row["date"] for row in json.loads(preview.stdout)["data"]["rows"]] == [expected]  # type: ignore[attr-defined]
