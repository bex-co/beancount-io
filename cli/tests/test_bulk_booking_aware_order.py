"""A bulk batch books in the first order that validates (w5/884).

The same-day rule reads signs and sets, so a partial holding, the wrong cost
lot, a purchase whose units booking infers, and a short opened and covered
the same day each defeated it: the batch was refused though an order books.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
OPENS = (
    '2024-01-01 open Assets:Cash USD\n2024-01-01 open Assets:Broker HOOL "FIFO"\n'
    "2024-01-01 open Equity:Opening USD\n2024-01-01 open Income:Gains USD\n"
)
CASH = '2024-01-01 * "Cash"\n  Assets:Cash 1000 USD\n  Equity:Opening -1000 USD\n'
OLD_LOT = '2024-01-02 * "Old lot"\n  Assets:Broker 1 HOOL {100 USD}\n  Assets:Cash -100 USD\n'


def _row(narration: str, *postings: dict[str, Any]) -> dict[str, Any]:
    return {"date": "2024-02-01", "narration": narration, "postings": list(postings)}


BROKER = "Assets:Broker"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "-f", str(tmp_path / "main.bean"), *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _add(tmp_path: Path, ledger: str, rows: list[dict[str, Any]]) -> subprocess.CompletedProcess[str]:
    (tmp_path / "main.bean").write_text(ledger)
    (tmp_path / "batch.json").write_text(json.dumps(rows))
    return _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))


SELL_TWO = _row(
    "Sell two",
    {"account": BROKER, "amount": "-2 HOOL {}"},
    {"account": "Assets:Cash", "amount": "300 USD"},
    {"account": "Income:Gains"},
)
BUY_TWO = _row(
    "Buy two", {"account": BROKER, "amount": "2 HOOL {150 USD}"}, {"account": "Assets:Cash", "amount": "-300 USD"}
)


def test_a_sale_needing_the_same_day_purchase_books_beside_a_partial_holding(tmp_path: Path) -> None:
    added = _add(tmp_path, OPENS + CASH + OLD_LOT, [SELL_TWO, BUY_TWO])

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0
    text = (tmp_path / "main.bean").read_text()
    assert text.index("Buy two") < text.index("Sell two")


def test_a_sale_of_a_lot_the_ledger_does_not_hold_follows_its_purchase(tmp_path: Path) -> None:
    sell = _row(
        "Sell",
        {"account": BROKER, "amount": "-1 HOOL {200 USD} @ 250 USD"},
        {"account": "Assets:Cash", "amount": "250 USD"},
        {"account": "Income:Gains"},
    )
    buy = _row(
        "Buy", {"account": BROKER, "amount": "1 HOOL {200 USD}"}, {"account": "Assets:Cash", "amount": "-200 USD"}
    )

    added = _add(tmp_path, OPENS + CASH + OLD_LOT, [sell, buy])

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0


def test_a_purchase_whose_units_booking_infers_precedes_its_sale(tmp_path: Path) -> None:
    sell = _row(
        "Sell",
        {"account": BROKER, "amount": "-2 HOOL {} @ 150 USD"},
        {"account": "Assets:Cash", "amount": "300 USD"},
        {"account": "Income:Gains"},
    )
    buy = _row(
        "Buy",
        {
            "account": BROKER,
            "units": {"number": None, "currency": "HOOL"},
            "cost": {"number": "100", "currency": "USD"},
        },
        {"account": "Assets:Cash", "amount": "-200 USD"},
    )

    added = _add(tmp_path, OPENS + CASH, [sell, buy])

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0


def test_a_short_opened_then_covered_keeps_its_order(tmp_path: Path) -> None:
    short = _row(
        "Open short",
        {"account": BROKER, "amount": "-1 HOOL {150 USD}"},
        {"account": "Assets:Cash", "amount": "150 USD"},
    )
    cover = _row(
        "Cover short",
        {"account": BROKER, "amount": "1 HOOL {} @ 100 USD"},
        {"account": "Assets:Cash", "amount": "-100 USD"},
        {"account": "Income:Gains"},
    )

    added = _add(tmp_path, OPENS, [short, cover])

    assert added.returncode == 0, added.stderr
    text = (tmp_path / "main.bean").read_text()
    assert text.index("Open short") < text.index("Cover short")
    assert _bea(tmp_path, "check").returncode == 0


@pytest.mark.parametrize("held", [2])
def test_a_sale_that_books_in_input_order_keeps_it(tmp_path: Path, held: int) -> None:
    lots = OLD_LOT.replace("1 HOOL", f"{held} HOOL").replace("-100 USD", "-200 USD")

    added = _add(tmp_path, OPENS + CASH + lots, [SELL_TWO, BUY_TWO])

    assert added.returncode == 0, added.stderr
    text = (tmp_path / "main.bean").read_text()
    assert text.index("Sell two") < text.index("Buy two")


def test_a_batch_no_order_books_is_still_refused_and_unwritten(tmp_path: Path) -> None:
    sell = _row(
        "Sell",
        {"account": BROKER, "amount": "-5 HOOL {}"},
        {"account": "Assets:Cash", "amount": "500 USD"},
        {"account": "Income:Gains"},
    )
    before = OPENS + CASH + OLD_LOT

    added = _add(tmp_path, before, [sell, BUY_TWO])

    assert added.returncode == 1, added.stdout
    assert (tmp_path / "main.bean").read_text() == before


def test_a_short_cover_listed_before_its_opening_books_when_every_heuristic_agrees(tmp_path: Path) -> None:
    """Every heuristic leaves this input order alone, so the builder must still be reached (w5/1079)."""
    cost = {"number": "50", "currency": "USD", "date": "2024-02-01"}

    def leg(units: str) -> dict[str, Any]:
        return {"account": BROKER, "units": {"number": units, "currency": "HOOL"}, "cost": cost}

    cover = _row("Cover", leg("2"), {"account": "Assets:Cash", "amount": "-100 USD"})
    opening = _row("Open short", leg("-6"), {"account": "Assets:Cash", "amount": "300 USD"})

    added = _add(tmp_path, OPENS + CASH, [cover, opening])

    assert added.returncode == 0, added.stderr
    assert _bea(tmp_path, "check").returncode == 0
    text = (tmp_path / "main.bean").read_text()
    assert text.index("Open short") < text.index("Cover")
