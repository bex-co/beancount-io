"""The engine's formula-trigger set matches its frontend twin.

`bea report --format csv` neutralises formula-looking text cells inside the
frontend process, while `bea query -f csv --spreadsheet-safe` does the same
inside the engine process. The two environments cannot import each other's
modules (ADR014), so each carries its own copy of OWASP's trigger tuple. A
trigger added to one side but not the other would leave one export
injectable; this pins that the copies agree.
"""

from __future__ import annotations

import pytest

from bea_engine import query as engine_query
from cli import report_csv as frontend_report


def test_the_trigger_tuples_stay_one_tuple() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: a
    # trigger added to one side must land in the other.
    assert engine_query._FORMULA_TRIGGERS == frontend_report.FORMULA_TRIGGERS


TRIGGER_CELLS = [
    '=HYPERLINK("http://x","y")',
    "+cmd|' /C calc'!A0",
    "-2+3",
    "@SUM(1+1)",
    "\tindented",
    "\rcarriage",
]

PLAIN_CELLS = [
    "",
    "Grocer",
    "plain",
    "123.45",
    "'already quoted",
    "semi;colon",
]


@pytest.mark.parametrize("cell", TRIGGER_CELLS)
def test_trigger_cells_are_neutralised_on_both_sides(cell: str) -> None:
    assert frontend_report._inert(cell) == engine_query._inert_formula(cell) == "'" + cell


@pytest.mark.parametrize("cell", PLAIN_CELLS)
def test_plain_cells_pass_through_on_both_sides(cell: str) -> None:
    assert frontend_report._inert(cell) == engine_query._inert_formula(cell) == cell


def test_the_samples_exercise_the_neutralising_path() -> None:
    """A sample set with no trigger cell would pass even if one side stopped prefixing."""
    assert frontend_report._inert("=x").startswith("'")
    assert engine_query._inert_formula("=x").startswith("'")
    assert frontend_report.FORMULA_TRIGGERS
