"""Automatic CSV dates weigh the whole column, not its first 200 values (w4/176).

`infer_date_format` stopped after 200 non-empty dates. An export whose first
200 dates were all ambiguous (`03/04/2024`) and whose 201st was `13/04/2024`
was read month-first, and the import then refused that valid date as
malformed — while the same file one row shorter imported day-first.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.csv_mapper import infer_date_format

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
"""


def _bank(tmp_path: Path, ambiguous: int, last: str = "13/04/2024") -> Path:
    source = tmp_path / "bank.csv"
    source.write_text(
        "Date,Description,Amount\n"
        + "".join(f"03/04/2024,Purchase {i},-{i + 1}\n" for i in range(ambiguous))
        + f"{last},Last,-999\n"
    )
    return source


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
        [sys.executable, "-m", "cli.main", *args], env=env, cwd=tmp_path, capture_output=True, text=True, timeout=120
    )


def _preview(
    tmp_path: Path, source: Path, *extra: str, csv: tuple[str, ...] = ("--csv", "auto")
) -> subprocess.CompletedProcess[str]:
    ledger = tmp_path / "main.bean"
    if not ledger.exists():
        ledger.write_text(LEDGER)
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        *csv,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *extra,
    )


@pytest.mark.parametrize("ambiguous", [199, 200, 1000])
def test_a_late_decisive_date_sets_the_convention(tmp_path: Path, ambiguous: int) -> None:
    source = _bank(tmp_path, ambiguous)
    assert infer_date_format(source, "Date") == ("%d/%m/%Y", False)
    result = _preview(tmp_path, source)
    assert result.returncode == 0, result.stderr
    assert "13/04/2024" not in result.stderr
    rendered = json.dumps(json.loads(result.stdout)["data"])
    assert "2024-04-13" in rendered
    assert "2024-04-03" in rendered


def test_an_all_ambiguous_column_still_reports_the_guess(tmp_path: Path) -> None:
    source = _bank(tmp_path, 300, last="03/04/2024")
    assert infer_date_format(source, "Date") == ("%m/%d/%Y", True)


def test_a_date_no_format_parses_leaves_the_column_unreadable(tmp_path: Path) -> None:
    source = _bank(tmp_path, 250, last="2024-13-45")
    assert infer_date_format(source, "Date") == (None, False)


def test_a_remembered_format_is_refused_by_a_late_decisive_date(tmp_path: Path) -> None:
    month_first = tmp_path / "first.csv"
    month_first.write_text("Date,Description,Amount\n04/13/2024,Coffee,-1\n")
    mapping = ("--csv", "date=Date,amount=Amount,narration=Description", "--date-format", "%m/%d/%Y")
    remembered = _preview(tmp_path, month_first, csv=mapping)
    assert remembered.returncode == 0, remembered.stderr

    # Same header, so the month-first format is recalled; its decisive
    # day-first date sits past the old 200-value sample.
    later = _bank(tmp_path, 250)
    refused = _preview(tmp_path, later, csv=())
    assert refused.returncode == 2, refused.stdout
    assert "Remembered --date-format %m/%d/%Y does not match" in refused.stderr
    assert "%d/%m/%Y" in refused.stderr
