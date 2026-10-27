"""A mixed-type ORDER BY column has one comparison rule, whatever the source order (w5/965).

Each pair was compared natively when Python could and by text when it could
not, so `2 < 10`, `10 < "11"` and `"11" < 2` were all true: a cycle, and the
sort's answer (and `LIMIT 1`) changed with the order of the rows in the file. A
mixed Amount raised AttributeError. A column of mixed kinds is now ordered as a
whole by `str()`; a uniform one keeps its native order.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

HEAD = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
ROWS = {
    "num2": "2",
    "num10": "10",
    "text11": '"11"',
}


def _txn(name: str, ref: str | None) -> str:
    meta = f"  ref: {ref}\n" if ref is not None else ""
    return f'2024-01-02 * "{name}"\n{meta}  Assets:Cash -1 USD\n  Expenses:Food 1 USD\n'


def _query(tmp_path: Path, rows: list[tuple[str, str | None]], select: str) -> list[str]:
    (tmp_path / "main.bean").write_text(HEAD + "".join(_txn(*row) for row in rows))
    result = _bea(tmp_path, "query", select)
    assert result.returncode == 0, result.stderr
    return [str(row[0]) for row in json.loads(result.stdout)["data"]["rows"]]


ORDER = "SELECT narration, entry_meta('ref') AS ref WHERE account = 'Expenses:Food' ORDER BY ref"
TEXT_ORDER = "SELECT narration, str(entry_meta('ref')) AS ref WHERE account = 'Expenses:Food' ORDER BY ref"


@pytest.mark.parametrize("permutation", list(itertools.permutations(ROWS.items())))
def test_every_source_order_gives_the_text_control_order(tmp_path: Path, permutation: tuple) -> None:  # type: ignore[type-arg]
    rows = list(permutation)

    raw = _query(tmp_path, rows, ORDER)
    control = _query(tmp_path, rows, TEXT_ORDER)

    assert raw == control == ["num10", "text11", "num2"]


def test_descending_and_limit_follow_the_same_rule(tmp_path: Path) -> None:
    rows = list(ROWS.items())

    assert _query(tmp_path, rows, ORDER.replace("ORDER BY ref", "ORDER BY ref DESC")) == ["num2", "text11", "num10"]
    assert _query(tmp_path, rows, ORDER + " LIMIT 1") == ["num10"]


def test_a_uniform_numeric_column_stays_numeric(tmp_path: Path) -> None:
    rows = [("a", "10"), ("b", "2"), ("c", "11")]

    assert _query(tmp_path, rows, ORDER) == ["b", "a", "c"]


def test_a_uniform_text_column_stays_lexical(tmp_path: Path) -> None:
    rows = [("a", '"10"'), ("b", '"2"'), ("c", '"11"')]

    assert _query(tmp_path, rows, ORDER) == ["a", "c", "b"]


def test_missing_metadata_still_sorts_first_ascending_and_last_descending(tmp_path: Path) -> None:
    rows = [("num", "2"), ("none", None), ("text", '"11"')]

    assert _query(tmp_path, rows, ORDER) == ["none", "text", "num"]
    assert _query(tmp_path, rows, ORDER + " DESC")[-1] == "none"


@pytest.mark.parametrize("other", ["2", '"two"'])
def test_a_mixed_amount_column_orders_by_text_without_a_python_error(tmp_path: Path, other: str) -> None:
    rows = [("amount", "5 USD"), ("other", other), ("ten", "10 USD")]

    ordered = _query(tmp_path, rows, ORDER)

    assert sorted(ordered) == ["amount", "other", "ten"]
    assert ordered == _query(tmp_path, rows, TEXT_ORDER)


def test_homogeneous_amounts_sort_numerically(tmp_path: Path) -> None:
    rows = [("ten", "10 USD"), ("two", "2 USD"), ("five", "5 USD")]

    assert _query(tmp_path, rows, ORDER) == ["two", "five", "ten"]


def test_multiple_keys_keep_independent_directions(tmp_path: Path) -> None:
    rows = [("a", "2"), ("b", '"11"'), ("c", "2")]

    ordered = _query(
        tmp_path,
        rows,
        "SELECT narration, entry_meta('ref') AS ref WHERE account = 'Expenses:Food' ORDER BY ref ASC, narration DESC",
    )

    assert ordered == ["b", "c", "a"]


STOCK_HEAD = """2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""
# A's quantity is inferred, so its cost has no date; the numbers are equal
# but spelled differently, which is what decided the text fallback.
LOTS = {
    "A": '2024-01-05 * "A"\n  Assets:Stock HOOL {2.0 USD}\n  Assets:Cash -4.00 USD\n',
    "B": '2024-01-05 * "B"\n  Assets:Stock 2 HOOL {2.00 USD, 2024-01-01}\n  Assets:Cash -4.00 USD\n',
    "C": '2024-01-05 * "C"\n  Assets:Stock 2 HOOL {2 USD, 2024-01-02}\n  Assets:Cash -4.00 USD\n',
}
COSTS = {
    "two": '2024-01-05 * "two"\n  Assets:Stock 1 HOOL {2 USD}\n  Assets:Cash -2 USD\n',
    "ten": '2024-01-05 * "ten"\n  Assets:Stock 1 HOOL {10 USD}\n  Assets:Cash -10 USD\n',
    "eleven": '2024-01-05 * "eleven"\n  Assets:Stock 1 HOOL {11 USD}\n  Assets:Cash -11 USD\n',
}


def _costs(tmp_path: Path, rows: list[str], direction: str = "", limit: str = "") -> list[str]:
    (tmp_path / "main.bean").write_text(STOCK_HEAD + "".join(rows))
    select = f"SELECT narration WHERE account = 'Assets:Stock' ORDER BY position.cost {direction} {limit}"
    result = _bea(tmp_path, "query", select)
    assert result.returncode == 0, result.stderr
    return [str(row[0]) for row in json.loads(result.stdout)["data"]["rows"]]


@pytest.mark.parametrize("order", ["".join(p) for p in itertools.permutations("ABC")])
def test_a_dateless_cost_orders_the_same_in_every_source_order(tmp_path: Path, order: str) -> None:
    rows = [LOTS[key] for key in order]

    assert _costs(tmp_path, rows) == ["A", "B", "C"]
    assert _costs(tmp_path, rows, "DESC") == ["C", "B", "A"]
    assert _costs(tmp_path, rows, limit="LIMIT 1") == ["A"]


def test_costs_still_order_numerically(tmp_path: Path) -> None:
    rows = [COSTS["ten"], COSTS["eleven"], COSTS["two"]]

    assert _costs(tmp_path, rows) == ["two", "ten", "eleven"]
    assert _costs(tmp_path, rows, "DESC") == ["eleven", "ten", "two"]
