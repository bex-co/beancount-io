"""A decimal comma keeps its value whatever the number of decimals (w4/164).

Only a comma followed by exactly two digits counted as a decimal comma. With
any other digit count the column fell back to point decimals, where every comma
was deleted as a thousands separator: `-0,5` imported as `-5 USD` and
`-0,1234` as `-1234 USD`, both balanced, applied, and passing `bea check`.

A single comma followed by anything but three digits cannot be a thousands
group, so it now votes for comma decimals; and a point-decimal column only
strips commas proven to be grouping (`1,234,567`, Indian `12,34,567`), refusing
any other comma rather than multiplying the amount.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

from bea_engine.csv_mapper import _parse_amount_cell, _resolve_decimal_comma
from bea_engine.protocol import UsageError

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
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


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _import(tmp_path: Path, ledger: Path, body: str, csv: str, *extra: str) -> subprocess.CompletedProcess[str]:
    source = tmp_path / "bank.csv"
    source.write_text(body, encoding="utf-8")
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        csv,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *extra,
    )


def _cash_numbers(tmp_path: Path, ledger: Path) -> list[str]:
    result = _bea(
        tmp_path, "--json", "--file", str(ledger), "query", "SELECT number WHERE account = 'Assets:Cash' ORDER BY date"
    )
    assert result.returncode == 0, result.stderr
    return [row[0] for row in json.loads(result.stdout)["data"]["rows"]]


@pytest.mark.parametrize("cell", ["-0,5", "-0,1234", "-0,50", "-12,5"])
def test_decimal_comma_keeps_its_value_through_apply_query_and_check(tmp_path: Path, ledger: Path, cell: str) -> None:
    body = f"Date;Description;Amount\n2024-03-01;Purchase;{cell}\n"
    preview = _import(tmp_path, ledger, body, "auto")
    assert preview.returncode == 0, preview.stderr
    expected = cell.replace(",", ".")
    assert expected in preview.stdout

    applied = _import(tmp_path, ledger, body, "auto", "--apply")
    assert applied.returncode == 0, applied.stderr
    assert _cash_numbers(tmp_path, ledger) == [expected]
    check = _bea(tmp_path, "--file", str(ledger), "check")
    assert check.returncode == 0, check.stdout + check.stderr


def test_debit_and_credit_columns_keep_decimal_commas(tmp_path: Path, ledger: Path) -> None:
    body = "Date;Description;Debit;Credit\n2024-03-01;Purchase;0,5;\n2024-03-02;Refund;;0,1234\n"
    applied = _import(tmp_path, ledger, body, "date=Date,narration=Description,debit=Debit,credit=Credit", "--apply")
    assert applied.returncode == 0, applied.stderr
    assert _cash_numbers(tmp_path, ledger) == ["-0.5", "0.1234"]


def test_a_stray_comma_in_a_point_column_is_refused_without_writing(tmp_path: Path, ledger: Path) -> None:
    body = 'Date,Description,Amount\n2024-03-01,Big,"-1,234.56"\n2024-03-02,Small,"-0,5"\n'
    before = ledger.read_bytes()
    for extra in ((), ("--apply",)):
        result = _import(tmp_path, ledger, body, "auto", *extra)
        assert result.returncode == 2, result.stdout
        assert "'-0,5'" in result.stderr
        assert ledger.read_bytes() == before


class TestAmountParser:
    """The column vote and the cell parser, below the CLI."""

    @pytest.mark.parametrize(
        ("cells", "decimal_comma"),
        [
            (["-0,5"], True),
            (["-0,1234"], True),
            (["4,50"], True),
            (["1.000,00", "0,5"], True),
            (["1,234.56"], False),
            (["1,00,000"], False),
            # Three digits after one comma could be either; it stays a group.
            (["1,234"], False),
        ],
    )
    def test_column_vote(self, cells: list[str], decimal_comma: bool) -> None:
        assert _resolve_decimal_comma(list(enumerate(cells, 1))) is decimal_comma

    @pytest.mark.parametrize(
        ("cell", "expected"),
        [
            ("1,234.56", Decimal("1234.56")),
            ("1,234,567", Decimal("1234567")),
            ("12,34,567.89", Decimal("1234567.89")),
            ("1,00,000", Decimal("100000")),
            ("(1,234.50)", Decimal("-1234.50")),
        ],
    )
    def test_point_column_strips_only_real_grouping(self, cell: str, expected: Decimal) -> None:
        assert _parse_amount_cell("Row 1", "Amount", cell, decimal_comma=False) == expected

    @pytest.mark.parametrize("cell", ["0,5", "0,1234", "12,34", "1,2345.00", "1234,567", "1.5,0"])
    def test_point_column_refuses_a_comma_that_is_not_grouping(self, cell: str) -> None:
        with pytest.raises(UsageError, match="cannot parse amount"):
            _parse_amount_cell("Row 1", "Amount", cell, decimal_comma=False)
