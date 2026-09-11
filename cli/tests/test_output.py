from __future__ import annotations

import io
import os
import shutil
import sys

import pytest

from cli.commands.list import _transaction_table
from cli.output import table


def test_table_aligns_columns_to_widest_cell(capsys: pytest.CaptureFixture[str]) -> None:
    table(["A", "BB"], [["1", "2"], ["333", "4"]])
    out = capsys.readouterr().out
    assert out.splitlines() == ["A    BB", "---  --", "1    2 ", "333  4 "]


def test_table_header_only_when_no_rows(capsys: pytest.CaptureFixture[str]) -> None:
    table(["DATE", "ACCOUNT"], [])
    out = capsys.readouterr().out
    assert out.splitlines() == ["DATE  ACCOUNT", "----  -------"]


class _Tty(io.StringIO):
    def isatty(self) -> bool:
        return True


class _Pipe(io.StringIO):
    def isatty(self) -> bool:
        return False


HEADERS = ["DATE", "FLAG", "PAYEE", "NARRATION", "POSTING AMOUNTS"]
WIDE_ROWS = [
    (
        ["2026-08-02", "*", "Cafe", "Coffee"],
        [("Expenses:Dining:AVeryLongRestaurantName", "12.50 USD"), ("Assets:Checking", "-12.50 USD")],
    )
]


def test_piped_transaction_table_matches_single_line_rendering(monkeypatch: pytest.MonkeyPatch) -> None:
    pipe = _Pipe()
    monkeypatch.setattr(sys, "stdout", pipe)
    _transaction_table(HEADERS, WIDE_ROWS)
    got = pipe.getvalue()

    table(
        HEADERS,
        [
            [
                "2026-08-02",
                "*",
                "Cafe",
                "Coffee",
                "Expenses:Dining:AVeryLongRestaurantName: 12.50 USD; Assets:Checking: -12.50 USD",
            ]
        ],
    )
    assert pipe.getvalue()[len(got) :] == got


def test_terminal_wraps_long_postings_under_the_row(monkeypatch: pytest.MonkeyPatch) -> None:
    tty = _Tty()
    monkeypatch.setattr(sys, "stdout", tty)
    monkeypatch.setattr(shutil, "get_terminal_size", lambda *args, **kwargs: os.terminal_size((80, 24)))
    _transaction_table(HEADERS, WIDE_ROWS)
    lines = tty.getvalue().splitlines()

    assert all(len(line) <= 80 for line in lines)
    assert lines[2].startswith("2026-08-02") and lines[2].rstrip().endswith("Coffee")
    assert lines[3] == "  Expenses:Dining:AVeryLongRestaurantName: 12.50 USD"
    assert lines[4].startswith("  Assets:Checking") and lines[4].endswith("-12.50 USD")


def test_terminal_truncates_long_narration_with_an_ellipsis(monkeypatch: pytest.MonkeyPatch) -> None:
    tty = _Tty()
    monkeypatch.setattr(sys, "stdout", tty)
    monkeypatch.setattr(shutil, "get_terminal_size", lambda *args, **kwargs: os.terminal_size((80, 24)))
    _transaction_table(
        HEADERS,
        [(["2026-08-02", "*", "Cafe", "A very long narration that keeps going and going"], [("Assets:Cash", "1 USD")])],
    )
    lines = tty.getvalue().splitlines()

    assert all(len(line) <= 80 for line in lines)
    assert lines[2].rstrip().endswith("...")


def test_terminal_keeps_fitting_rows_single_line(monkeypatch: pytest.MonkeyPatch) -> None:
    tty = _Tty()
    monkeypatch.setattr(sys, "stdout", tty)
    monkeypatch.setattr(shutil, "get_terminal_size", lambda *args, **kwargs: os.terminal_size((200, 24)))
    _transaction_table(HEADERS, WIDE_ROWS)
    lines = tty.getvalue().splitlines()

    assert len(lines) == 3
    assert "Expenses:Dining:AVeryLongRestaurantName: 12.50 USD; Assets:Checking: -12.50 USD" in lines[2]


def test_jsonable_keeps_lot_dates_and_labels_on_costs() -> None:
    import datetime
    from decimal import Decimal

    from beancount.core.amount import Amount
    from beancount.core.inventory import Inventory
    from beancount.core.position import Cost, Position

    from cli.output import jsonable

    first = Position(Amount(Decimal("1"), "AAPL"), Cost(Decimal("100"), "USD", datetime.date(2026, 2, 1), "first"))
    second = Position(Amount(Decimal("1"), "AAPL"), Cost(Decimal("100"), "USD", datetime.date(2026, 2, 2), "second"))
    inventory = Inventory([first, second])

    assert jsonable(Amount(Decimal("5"), "USD")) == {"number": "5", "currency": "USD"}
    assert jsonable(Position(Amount(Decimal("5"), "USD"), None)) == {
        "units": {"number": "5", "currency": "USD"},
        "cost": None,
    }
    assert jsonable(first)["cost"] == {"number": "100", "currency": "USD", "date": "2026-02-01", "label": "first"}
    assert jsonable(Cost(Decimal("1"), "USD", None, None)) == {
        "number": "1",
        "currency": "USD",
        "date": None,
        "label": None,
    }
    assert sorted(lot["cost"]["label"] for lot in jsonable(inventory)) == ["first", "second"]
