"""A plugin copy that changes a stated cost, price or flag is not the written transaction (w5/1011).

Posting quantities all agree, so the unit-only comparison called the copy the
file's own declaration and `list --on-disk` returned its calculated facts.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from datetime import date
from decimal import Decimal
from beancount.core.data import Transaction
from beancount.core.amount import Amount
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for e in entries:
        out.append(e)
        if isinstance(e, Transaction) and e.narration == 'Lot source':
            posts = []
            for p in e.postings:
                if p.account == 'Assets:Stock':
                    if mode in ('label', 'split-label'): p = p._replace(cost=p.cost._replace(label='B'))
                    elif mode == 'date': p = p._replace(cost=p.cost._replace(date=date(2024, 1, 31)))
                    elif mode == 'price': p = p._replace(price=Amount(Decimal('150'), 'USD'))
                if mode == 'flag' and p.account == 'Assets:Cash': p = p._replace(flag='*')
                if mode == 'split-label' and p.account == 'Assets:Cash':
                    half = p._replace(units=p.units._replace(number=p.units.number / 2))
                    posts.extend([half, half])
                else:
                    posts.append(p)
            out.append(e._replace(meta=e.meta.copy(), postings=posts))
    return out, []
"""
HEAD = '2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Assets:Cash USD\n'


def _trade(stock: str) -> str:
    return f'2024-02-01 * "Lot source"\n  Assets:Stock {stock}\n  Assets:Cash -200 USD\n'


def _list(tmp_path: Path, *flags: str, limit: str = "100") -> list[dict]:
    result = _bea(tmp_path, "list", "transaction", "--limit", limit, *flags)
    return json.loads(result.stdout)["data"]


def _books(tmp_path: Path, mode: str, stock: str = '2 HOOL {100 USD, 2024-02-01, "A"} @ 125 USD') -> None:
    (tmp_path / "qa_derive.py").write_text(PLUGIN)
    plugin = f'option "insert_pythonpath" "TRUE"\nplugin "qa_derive" "{mode}"\n' if mode else ""
    (tmp_path / "main.bean").write_text(plugin + HEAD + _trade(stock))


@pytest.mark.parametrize("mode", ["label", "date", "price", "split-label"])
def test_a_copy_with_a_changed_lot_or_price_is_not_on_disk(tmp_path: Path, mode: str) -> None:
    _books(tmp_path, mode)

    assert len(_list(tmp_path)) == 2
    on_disk = _list(tmp_path, "--on-disk", "--sort", "newest", limit="1")
    assert len(on_disk) == 1
    stock = next(p for p in on_disk[0]["postings"] if p["account"] == "Assets:Stock")
    assert stock["cost"]["label"] == "A"
    assert stock["cost"]["date"] == "2024-02-01"
    assert stock["price"] == {"number": "125", "currency": "USD"}


def test_a_copy_with_a_changed_posting_flag_is_not_on_disk(tmp_path: Path) -> None:
    (tmp_path / "qa_derive.py").write_text(PLUGIN)
    (tmp_path / "main.bean").write_text(
        'option "insert_pythonpath" "TRUE"\nplugin "qa_derive" "flag"\n'
        + HEAD
        + '2024-02-01 * "Lot source"\n  Assets:Stock 2 HOOL {100 USD}\n  ! Assets:Cash -200 USD\n'
    )

    assert len(_list(tmp_path)) == 2
    assert len(_list(tmp_path, "--on-disk")) == 1


@pytest.mark.parametrize(
    "stock",
    [
        "2 HOOL {100 USD}",
        '2 HOOL {100 USD, 2024-02-01, "A"} @ 125 USD',
        "2 HOOL {USD} @ 100 USD",
        "2 HOOL {100 USD} @@ 200 USD",
    ],
)
def test_the_written_transaction_stays_on_disk(tmp_path: Path, stock: str) -> None:
    _books(tmp_path, "", stock)

    assert len(_list(tmp_path)) == 1
    assert len(_list(tmp_path, "--on-disk")) == 1
