"""A hand-written sale whose lots are not in booking order is still a twin of its import (w5/998).

Past twelve booked legs only runs of consecutive legs were tried for each
fill, so a manual sale listing thirteen lots by unit cost matched neither
fill, and importing the same sale as two statement fills wrote it a second time.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from tests.test_import_multi_fill_many_lots import IMPORTER
from tests.test_import_source_facts import _bea


def _books(tmp_path: Path, *, by_cost: bool) -> Path:
    lots = [
        {
            "qty": 2**i,
            "cost": 10 + i // 2 if i % 2 == 0 else 20 + i // 2,
            "date": dt.date(2023, 1, 2) + dt.timedelta(days=i),
        }
        for i in range(13)
    ]
    quantity = sum(x["qty"] for x in lots)
    basis = sum(x["qty"] * x["cost"] for x in lots)
    base = (
        'option "operating_currency" "USD"\n2023-01-01 open Assets:Cash USD\n'
        '2023-01-01 open Assets:Stock HOOL "FIFO"\n2023-01-01 open Equity:Opening USD\n'
        '2023-01-01 open Income:Gains USD\n2023-01-01 * "Capital"\n'
        "  Assets:Cash 500000.00 USD\n  Equity:Opening -500000.00 USD\n"
    )
    for x in lots:
        base += f'{x["date"]} * "Buy"\n  Assets:Stock {x["qty"]} HOOL {{{x["cost"]} USD}}\n'
        base += f"  Assets:Cash -{x['qty'] * x['cost']}.00 USD\n"
    reserve = dt.date(2023, 1, 2) + dt.timedelta(days=13)
    base += (
        f'{reserve} * "Reserve"\n  Assets:Stock {quantity} HOOL {{10 USD}}\n  Assets:Cash -{quantity * 10}.00 USD\n'
        "2024-02-01 price HOOL 30 USD\n"
    )
    chosen = sorted(lots, key=lambda x: x["cost"]) if by_cost else lots
    manual = '2024-02-01 * "Sale"\n' + "".join(
        f"  Assets:Stock -{x['qty']} HOOL {{{x['cost']} USD, {x['date']}}} @ 30 USD\n" for x in chosen
    )
    manual += f"  Assets:Cash {quantity * 30}.00 USD\n  Income:Gains -{quantity * 30 - basis}.00 USD\n"
    (tmp_path / "main.bean").write_text(base + manual)
    (tmp_path / "sale.statement").write_text(
        '2024-02-01 * "Sale"\n'
        + "".join(f"  Assets:Stock -{q} HOOL {{USD}} @ 30 USD\n" for q in (63, quantity - 63))
        + f"  Assets:Cash {quantity * 30}.00 USD\n  Income:Gains\n"
    )
    (tmp_path / "importer.py").write_text(IMPORTER)
    return tmp_path / "main.bean"


@pytest.mark.parametrize("by_cost", [False, True], ids=["acquisition-order", "cost-order"])
def test_the_already_booked_sale_is_a_possible_duplicate_not_new(tmp_path: Path, by_cost: bool) -> None:
    ledger = _books(tmp_path, by_cost=by_cost)
    before = ledger.read_bytes()

    preview = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]
    assert applied.returncode == 4, applied.stdout
    assert ledger.read_bytes() == before
