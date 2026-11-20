"""PIVOT BY and `min()`/`max()` order values the way ORDER BY does (w1/333).

Upstream compared pivot keys, pivot rows and min/max candidates natively, so
a transaction without a payee (`PIVOT BY month, payee`) or metadata mixing
`ref: "A-12"` with `ref: 5` raised a bare TypeError, reported as exit 1, while
`ORDER BY` on the same column answered (w5/562, w5/760, w5/965). Now a NULL
comes first, a column of mixed kinds compares by its text, and a uniform
column keeps its native order.
"""

from __future__ import annotations

import csv
import io
import itertools
import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from bea_engine import query
from tests.test_query_mixed_order_and_sets import _bea

PAYEES = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Rent USD

2026-01-05 * "Cafe" "Lunch"
  Expenses:Food  12.00 USD
  Assets:Checking

2026-01-10 * "Rent"
  Expenses:Rent  900.00 USD
  Assets:Checking

2026-02-05 * "Cafe" "Lunch"
  Expenses:Food  8.00 USD
  Assets:Checking
"""
MIXED = """2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-05 * "Cafe" "Lunch"
  ref: "A-12"
  Expenses:Food  12.00 USD
  Assets:Checking
2026-01-06 * "Cafe" "Lunch"
  ref: 5
  Expenses:Food  8.00 USD
  Assets:Checking
"""

NULL_COLUMN = "SELECT month, payee, sum(number) WHERE account ~ '^Expenses' GROUP BY month, payee PIVOT BY month, payee"
NULL_ROW = "SELECT payee, month, sum(number) WHERE account ~ '^Expenses' GROUP BY payee, month PIVOT BY payee, month"
MIXED_PIVOT = (
    "SELECT account, entry_meta('ref') AS r, sum(number) WHERE account ~ 'Food' GROUP BY account, r PIVOT BY account, r"
)
EXTREMES = "SELECT min(entry_meta('ref')), max(entry_meta('ref'))"

# (ledger, query, columns, rows): JSON cells, with CSV writing a NULL as empty.
CASES = {
    "null-pivot-column": (
        PAYEES,
        NULL_COLUMN,
        ["month/payee", "NULL", "Cafe"],
        [[1, "900.00", "12.00"], [2, None, "8.00"]],
    ),
    "null-pivot-row": (
        PAYEES,
        NULL_ROW,
        ["payee/month", "1", "2"],
        [[None, "900.00", None], ["Cafe", "12.00", "8.00"]],
    ),
    "mixed-pivot-column": (
        MIXED,
        MIXED_PIVOT,
        ["account/r", "5", "A-12"],
        [["Expenses:Food", "8.00", "12.00"]],
    ),
    "mixed-min-max": (
        MIXED,
        EXTREMES,
        ["min(entry_meta('ref'))", "max(entry_meta('ref'))"],
        [["5", "A-12"]],
    ),
}


def _run(tmp_path: Path, ledger: str, *args: str) -> str:
    path = tmp_path / "main.bean"
    path.write_text(ledger)
    result = _bea(tmp_path, *args[:-1], "--file", str(path), "query", args[-1])
    assert result.returncode == 0, result.stderr or result.stdout
    assert "TypeError" not in result.stdout + result.stderr
    return result.stdout


def _json(tmp_path: Path, ledger: str, statement: str) -> tuple[list[str], list[list[Any]]]:
    data = json.loads(_run(tmp_path, ledger, "--json", statement))["data"]
    return [column["name"] for column in data["columns"]], data["rows"]


@pytest.mark.parametrize("case", list(CASES))
def test_json_answers(tmp_path: Path, case: str) -> None:
    ledger, statement, columns, rows = CASES[case]

    assert _json(tmp_path, ledger, statement) == (columns, rows)


@pytest.mark.parametrize("case", list(CASES))
def test_csv_answers(tmp_path: Path, case: str) -> None:
    ledger, statement, columns, rows = CASES[case]
    path = tmp_path / "main.bean"
    path.write_text(ledger)

    result = _bea(tmp_path, "--file", str(path), "query", "-f", "csv", statement)

    assert result.returncode == 0, result.stderr
    expected = [columns] + [["" if cell is None else str(cell) for cell in row] for row in rows]
    assert list(csv.reader(io.StringIO(result.stdout))) == expected


@pytest.mark.parametrize("case", list(CASES))
def test_text_answers(tmp_path: Path, case: str) -> None:
    ledger, statement, columns, rows = CASES[case]

    lines = _run(tmp_path, ledger, statement).splitlines()

    assert lines[0].split() == columns
    body = [line.split() for line in lines[2:]]
    assert body == [[str(cell) for cell in row if cell is not None] for row in rows]


def test_a_null_key_heads_its_column_beside_other_value_columns(tmp_path: Path) -> None:
    statement = NULL_COLUMN.replace("sum(number)", "sum(number) AS total, count(number) AS n")

    columns, rows = _json(tmp_path, PAYEES, statement)

    assert columns == ["month/payee", "NULL/total", "NULL/n", "Cafe/total", "Cafe/n"]
    assert rows == [[1, "900.00", 1, "12.00", 1], [2, None, None, "8.00", 1]]


def test_a_pivot_without_value_columns_keeps_only_its_row_keys(tmp_path: Path) -> None:
    columns, rows = _json(tmp_path, PAYEES, "SELECT month, payee GROUP BY month, payee PIVOT BY month, payee")

    assert (columns, rows) == (["month/payee"], [[1], [2]])


def test_uniform_pivot_keys_keep_their_native_order(tmp_path: Path) -> None:
    months = "".join(
        f'2026-{m:02d}-05 * "Cafe" "Lunch"\n  Expenses:Food  {m}.00 USD\n  Assets:Checking\n' for m in range(1, 12)
    )

    columns, rows = _json(tmp_path, PAYEES + months, NULL_ROW)

    assert columns == ["payee/month", *(str(m) for m in range(1, 12))]
    assert [row[0] for row in rows] == [None, "Cafe"]


def _refs(values: tuple[str, ...]) -> str:
    head = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
    return head + "".join(
        f'2024-01-02 * "r"\n  ref: {value}\n  Expenses:Food 1 USD\n  Assets:Cash -1 USD\n' for value in values
    )


MIN_MAX = "SELECT min(entry_meta('ref')), max(entry_meta('ref')) WHERE account = 'Expenses:Food'"
ORDERED = "SELECT entry_meta('ref') AS ref WHERE account = 'Expenses:Food' ORDER BY ref"


@pytest.mark.parametrize("values", list(itertools.permutations(["2", "10", '"11"'])))
def test_mixed_min_max_match_order_by_in_every_source_order(tmp_path: Path, values: tuple[str, ...]) -> None:
    ledger = _refs(values)

    _, extremes = _json(tmp_path, ledger, MIN_MAX)
    _, ordered = _json(tmp_path, ledger, ORDERED)

    # Text order: "10" < "11" < "2".
    assert extremes == [["10", "2"]]
    assert extremes[0] == [ordered[0][0], ordered[-1][0]]


def test_uniform_min_max_stay_numeric(tmp_path: Path) -> None:
    _, extremes = _json(tmp_path, _refs(("10", "2", "11")), MIN_MAX)

    assert extremes == [["2", "11"]]


def test_mixed_min_max_keep_each_value_as_it_is(tmp_path: Path) -> None:
    path = tmp_path / "main.bean"
    path.write_text(MIXED)

    (row,) = query.connect(path).execute(EXTREMES).fetchall()

    assert row == (Decimal("5"), "A-12")
    assert [type(value) for value in row] == [Decimal, str]
