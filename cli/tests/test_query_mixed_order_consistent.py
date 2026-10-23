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
