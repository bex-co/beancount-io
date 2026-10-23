"""A CSV day of the year the named year does not have is refused (w5/986).

`%Y-%j` read `2023-366` as 2024-01-01 (and `%y-%j` read `23-366` likewise): the
row was previewed ready and written to the wrong year instead of refused.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n'
    '2020-01-01 open Equity:Opening USD\n2020-01-01 * "Capital"\n'
    "  Assets:Cash 100.00 USD\n  Equity:Opening -100.00 USD\n"
)


def _import(tmp_path: Path, value: str, date_format: str, *flags: str) -> object:
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "bank.csv").write_text(f"Date,Description,Amount\n{value},Coffee,-7.75\n")
    return _bea(
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
        date_format,
        *flags,
    )


@pytest.mark.parametrize(("value", "date_format"), [("2023-366", "%Y-%j"), ("23-366", "%y-%j"), ("2023-400", "%Y-%j")])
def test_a_day_the_year_does_not_have_is_refused_with_its_row_and_column(
    tmp_path: Path, value: str, date_format: str
) -> None:
    before = BASE.encode()

    preview = _import(tmp_path, value, date_format)
    applied = _import(tmp_path, value, date_format, "--apply")

    assert preview.returncode == 2, preview.stdout  # type: ignore[attr-defined]
    message = json.loads(preview.stderr)["error"]["message"]  # type: ignore[attr-defined]
    assert "cannot parse date" in message and "'Date'" in message and date_format in message
    assert applied.returncode == 2  # type: ignore[attr-defined]
    assert (tmp_path / "main.bean").read_bytes() == before


@pytest.mark.parametrize(
    ("value", "date_format", "expected"),
    [
        ("2024-366", "%Y-%j", "2024-12-31"),
        ("2023-365", "%Y-%j", "2023-12-31"),
        ("2023-1", "%Y-%j", "2023-01-01"),
        ("23-365", "%y-%j", "2023-12-31"),
    ],
)
def test_valid_ordinals_still_import(tmp_path: Path, value: str, date_format: str, expected: str) -> None:
    preview = _import(tmp_path, value, date_format)

    assert preview.returncode == 0, preview.stderr  # type: ignore[attr-defined]
    assert [row["date"] for row in json.loads(preview.stdout)["data"]["rows"]] == [expected]  # type: ignore[attr-defined]
