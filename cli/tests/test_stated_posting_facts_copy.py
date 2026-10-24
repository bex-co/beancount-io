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


INFERRED_PLUGIN = """from beancount.core.data import Transaction
__plugins__ = ('copy_row',)
def copy_row(entries, options, mode):
    out = []
    for e in entries:
        out.append(e)
        if isinstance(e, Transaction) and e.narration == 'Purchase':
            narration = e.narration if mode == 'changed-cost' else 'Derived purchase'
            clone = e._replace(meta=e.meta.copy(), narration=narration)
            if mode == 'changed-cost':
                clone = clone._replace(postings=[
                    p._replace(units=p.units._replace(number=p.units.number / 2),
                               cost=p.cost._replace(number=p.cost.number * 2)) if p.account == 'Assets:Stock' else p
                    for p in e.postings])
            out.append(clone)
    return out, []
"""


@pytest.mark.parametrize(
    ("mode", "cost"),
    [("inferred-copy", "{100 USD}"), ("changed-cost", "{100 USD}"), ("inferred-copy", "{100 # 100 USD}")],
)
def test_an_inferred_quantity_does_not_break_the_comparison(tmp_path: Path, mode: str, cost: str) -> None:
    """The line leaves the quantity to booking; the check still reads the known cost (w5/1011)."""
    (tmp_path / "qa_copy.py").write_text(INFERRED_PLUGIN)
    cash = "-300.00" if "#" in cost else "-200.00"
    (tmp_path / "main.bean").write_text(
        f'option "insert_pythonpath" "TRUE"\nplugin "qa_copy" "{mode}"\n'
        "2024-01-01 open Assets:Stock HOOL\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
        '2024-01-01 * "Opening"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
        f'2024-02-01 * "Purchase"\n  Assets:Stock HOOL {cost}\n  Assets:Cash {cash} USD\n'
    )
    result = _bea(tmp_path, "list", "transaction", "--search", "Purchase", "--on-disk")

    assert result.returncode == 0, result.stdout
    rows = json.loads(result.stdout)["data"]
    assert [row["narration"] for row in rows] == ["Purchase"]


HEADER_COPY = """from beancount.core.data import Transaction
__plugins__ = ('copy_row',)
def copy_row(entries, options):
    out = []
    for e in entries:
        out.append(e)
        if isinstance(e, Transaction) and e.narration == 'Source':
            out.append(e._replace(meta=e.meta.copy(), narration='Derived'))
    return out, []
"""


def _header_copy(tmp_path: Path, body: str) -> None:
    (tmp_path / "qa_header.py").write_text(HEADER_COPY)
    (tmp_path / "main.bean").write_text(
        'option "insert_pythonpath" "TRUE"\noption "operating_currency" "USD"\nplugin "qa_header"\n' + body
    )


def _on_disk(tmp_path: Path) -> set[str]:
    result = _bea(tmp_path, "list", "transaction", "--on-disk", "--limit", "100")
    assert result.returncode == 0, result.stderr or result.stdout
    rows = json.loads(result.stdout)["data"]
    assert len(rows) == len({row["narration"] for row in rows})
    return {row["narration"] for row in rows}


PURCHASE = (
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Assets:Stock HOOL\n2024-01-01 open Equity:Opening USD\n"
    "2024-01-01 open Expenses:Fees USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
    '2024-02-01 * "Source"\n  bank_id: "B1"\n  Assets:Stock 2 HOOL COST\n  Assets:Cash -250.00 USD\n'
)


@pytest.mark.parametrize("cost", ["{100 # USD}", "{{USD}}", "{0 # USD}"])
def test_a_total_component_booking_infers_lists_and_imports(tmp_path: Path, cost: str) -> None:
    """`{100 # USD}` books at 125; the omitted total is unknown, not zero, and no TypeError (w5/1011)."""
    _header_copy(tmp_path, PURCHASE.replace("COST", cost))
    (tmp_path / "fee.csv").write_text("Date,Description,Amount,Reference\n2024-02-02,Bank fee,-10.00,B2\n")
    fee = [
        "import", "fee.csv", "--csv", "date=Date,narration=Description,amount=Amount,id=Reference",
        "--account", "Assets:Cash", "--default-account", "Expenses:Fees", "--apply",
    ]  # fmt: skip

    assert _on_disk(tmp_path) == {"Capital", "Source"}
    written = _bea(tmp_path, *fee)
    repeat = _bea(tmp_path, *fee)

    assert written.returncode == 0, written.stdout
    assert json.loads(written.stdout)["data"]["written"] == 1
    assert json.loads(repeat.stdout)["data"]["written"] == 0


def test_a_compound_cost_is_added_before_it_is_divided(tmp_path: Path) -> None:
    """Dividing the total first rounded away the dollar the per-unit part cancels (w5/1011)."""
    _header_copy(
        tmp_path,
        PURCHASE.replace(
            "2 HOOL COST", "3 HOOL {-10000000000000000000000000000 # 30000000000000000000000000003 USD}"
        ).replace("-250.00 USD", "-3 USD"),
    )
    ledger = tmp_path / "main.bean"
    before = ledger.read_bytes()
    (tmp_path / "bank.csv").write_text("Date,Description,Amount\n2024-02-01,Settlement,-3.00\n")
    settle = ["import", "bank.csv", "--csv", "date=Date,narration=Description,amount=Amount"]
    settle += ["--account", "Assets:Cash", "--default-account", "Expenses:Fees", "--apply"]

    assert _on_disk(tmp_path) == {"Capital", "Source"}
    review = _bea(tmp_path, *settle)
    skipped = _bea(tmp_path, *settle, "--duplicates", "skip")
    assert review.returncode == 4, review.stdout
    assert json.loads(skipped.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


SPLIT_SALE = (
    '2024-01-01 open Assets:Cash USD\n2024-01-01 open Assets:Stock HOOL "FIFO"\n'
    "2024-01-01 open Income:Gains USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
    '2024-01-02 * "Buy one"\n  Assets:Stock 1 HOOL {150 USD}\n  Assets:Cash -150.00 USD\n'
    '2024-01-03 * "Buy another"\n  Assets:Stock 1 HOOL {150 USD}\n  Assets:Cash -150.00 USD\n'
    '2024-02-01 * "Source"\n  Assets:Stock -2 HOOL COST @ 250 USD\n'
    "  Assets:Cash 200.00 USD\n  Assets:Cash 300.00 USD\n  Income:Gains -200.00 USD\n"
)


@pytest.mark.parametrize("cost", ["{{300 USD}}", "{100 # 100 USD}"])
def test_a_total_cost_split_across_lots_is_divided_by_the_stated_quantity(tmp_path: Path, cost: str) -> None:
    """Booking splits the sale into two one-unit lots at 150; the total is the stated two units' (w5/1011)."""
    _header_copy(tmp_path, SPLIT_SALE.replace("COST", cost))

    assert _on_disk(tmp_path) == {"Capital", "Buy one", "Buy another", "Source"}


PRECISION = """from decimal import Decimal
from beancount.core.data import Transaction
__plugins__ = ('derive',)
SATOSHI = Decimal('0.00000001')
def derive(entries, options, mode):
    out = []
    for e in entries:
        out.append(e)
        if not isinstance(e, Transaction) or e.narration != 'Lot source':
            continue
        posts = []
        for p in e.postings:
            if p.account == 'Assets:Stock':
                if mode == 'price': p = p._replace(price=p.price._replace(number=p.price.number + SATOSHI))
                elif mode == 'cost': p = p._replace(cost=p.cost._replace(number=p.cost.number + SATOSHI))
                elif mode == 'label': p = p._replace(cost=p.cost._replace(label=None))
                elif mode == 'currency': p = p._replace(price=p.price._replace(currency='EUR'))
            if p.account == 'Assets:Cash' and mode == 'currency':
                p = p._replace(units=p.units._replace(currency='EUR'))
            if p.account == 'Expenses:Fees' and mode == 'cost':
                p = p._replace(units=p.units._replace(number=p.units.number - 2 * SATOSHI))
            posts.append(p)
        meta = e.meta.copy()
        meta['qa_copy'] = 'yes'
        out.append(e._replace(meta=meta, postings=posts))
    return out, []
"""
BTC_TRADE = (
    'option "operating_currency" "BTC"\n2024-01-01 open Assets:Stock HOOL\n'
    "2024-01-01 open Assets:Cash BTC\n2024-01-01 open Expenses:Fees BTC\n"
    '2024-02-01 * "Lot source"\n  Assets:Stock 2 HOOL {0.01000000 BTC, 2024-02-01, LABEL} @ 0.01250000 BTC\n'
    "  Assets:Cash -0.03000000 BTC\n  Expenses:Fees\n"
)
INFERRED_CURRENCY = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Stock HOOL\n2024-01-01 open Assets:Cash USD, EUR\n'
    '2024-02-01 * "Lot source"\n  Assets:Stock 2 HOOL @ USD\n  Assets:Cash -200\n'
)


@pytest.mark.parametrize(
    ("mode", "book"),
    [
        ("price", BTC_TRADE.replace("LABEL", '"A"')),
        ("cost", BTC_TRADE.replace("LABEL", '"A"')),
        ("label", BTC_TRADE.replace("LABEL", '""')),
        ("currency", INFERRED_CURRENCY),
    ],
    ids=["one-satoshi-price", "one-satoshi-cost", "empty-label-removed", "stated-price-currency"],
)
def test_a_copy_changing_a_stated_component_is_not_on_disk(tmp_path: Path, mode: str, book: str) -> None:
    """Each component the line states is compared exactly, whatever the line leaves open (w5/1011)."""
    (tmp_path / "qa_precision.py").write_text(PRECISION)
    (tmp_path / "main.bean").write_text(f'option "insert_pythonpath" "TRUE"\nplugin "qa_precision" "{mode}"\n' + book)

    assert len(_list(tmp_path)) == 2
    (written,) = _list(tmp_path, "--on-disk")
    assert "qa_copy" not in (written.get("meta") or {})
