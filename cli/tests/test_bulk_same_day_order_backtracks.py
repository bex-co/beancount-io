"""A row that books first must not strand the rest of a same-day batch (w5/980).

The row-by-row builder placed the first row that booked and never revisited it.
A B→C transfer listed before A→B and the purchase opened an unlabelled short
in B, and a sale listed before its split opened a short the split could not
reduce; both complete, natively valid batches were refused (atomic) or lost a
row (`--partial`).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_import_source_facts import _bea

CHAIN_BASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:BrokerA HOOL "FIFO"
2024-01-01 open Assets:BrokerB HOOL "FIFO"
2024-01-01 open Assets:BrokerC HOOL "FIFO"
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
SPLIT_BASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL "FIFO"
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""


def _txn(narration: str, *postings: dict[str, Any]) -> dict[str, Any]:
    return {"date": "2024-02-01", "narration": narration, "postings": list(postings)}


def _leg(account: str, number: int) -> dict[str, Any]:
    cost: dict[str, str] = {"number": "100", "currency": "USD", "date": "2024-02-01", "label": "Lot"}
    if number < 0:
        cost = {"currency": "USD"}
    return {"account": account, "units": {"number": str(number), "currency": "HOOL"}, "cost": cost}


BUY = _txn(
    "Buy A", _leg("Assets:BrokerA", 1), {"account": "Assets:Cash", "units": {"number": "-100.00", "currency": "USD"}}
)
AB = _txn("Transfer A to B", _leg("Assets:BrokerA", -1), _leg("Assets:BrokerB", 1))
BC = _txn("Transfer B to C", _leg("Assets:BrokerB", -1), _leg("Assets:BrokerC", 1))


def _stock(number: int, cost: dict[str, str]) -> dict[str, Any]:
    return {"account": "Assets:Stock", "units": {"number": str(number), "currency": "HOOL"}, "cost": cost}


def _cost(number: int) -> dict[str, str]:
    return {"number": str(number), "currency": "USD", "date": "2024-02-01", "label": "A"}


PURCHASE = _txn("Purchase", _stock(3, _cost(100)), {"account": "Assets:Cash", "amount": "-300.00 USD"})
SPLIT = _txn("Two-for-one split", _stock(-3, _cost(100)), _stock(6, _cost(50)))
SALE = _txn(
    "Sell split shares",
    _stock(-4, _cost(50)) | {"price_total": {"number": "240.00", "currency": "USD"}},
    {"account": "Assets:Cash", "amount": "240.00 USD"},
    {"account": "Income:Gains"},
)


def _add(tmp_path: Path, base: str, rows: list[dict[str, Any]], *flags: str) -> dict[str, Any]:
    (tmp_path / "main.bean").write_text(base)
    (tmp_path / "batch.json").write_text(json.dumps(rows))
    added = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"), *flags)
    assert added.returncode == 0, added.stdout + added.stderr
    assert _bea(tmp_path, "check").returncode == 0
    return json.loads(added.stdout)["data"]  # type: ignore[no-any-return]


def _lots(tmp_path: Path) -> dict[str, str]:
    result = _bea(
        tmp_path,
        "query",
        "SELECT str(cost_number), sum(number) WHERE account = 'Assets:Stock' GROUP BY 1 ORDER BY 1",
    )
    return {str(row[0]): str(row[1]) for row in json.loads(result.stdout)["data"]["rows"]}


def _cash(tmp_path: Path) -> str:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Assets:Cash'")
    return str(json.loads(result.stdout)["data"]["rows"][0][0])


@pytest.mark.parametrize("flags", [[], ["--partial"]], ids=["atomic", "partial"])
def test_a_reversed_custody_chain_writes_every_transfer(tmp_path: Path, flags: list[str]) -> None:
    data = _add(tmp_path, CHAIN_BASE, [BC, AB, BUY], *flags)

    assert data["written"] == 3
    assert _cash(tmp_path) == "900.00"
    totals = _bea(tmp_path, "query", "SELECT account, sum(number) WHERE currency = 'HOOL' GROUP BY account")
    by_account = {row[0]: str(row[1]) for row in json.loads(totals.stdout)["data"]["rows"]}
    assert by_account == {"Assets:BrokerA": "0", "Assets:BrokerB": "0", "Assets:BrokerC": "1"}


@pytest.mark.parametrize("flags", [[], ["--partial"]], ids=["atomic", "partial"])
def test_a_sale_listed_before_its_split_and_purchase_books_whole(tmp_path: Path, flags: list[str]) -> None:
    data = _add(tmp_path, SPLIT_BASE, [SALE, SPLIT, PURCHASE], *flags)

    assert data["written"] == 3
    assert _cash(tmp_path) == "940.00"
    assert _lots(tmp_path) == {"100": "0", "50": "2"}


def test_a_genuinely_unbalanced_purchase_is_still_refused(tmp_path: Path) -> None:
    bad = json.loads(json.dumps(PURCHASE))
    bad["postings"][1]["amount"] = "-301.00 USD"
    (tmp_path / "main.bean").write_text(SPLIT_BASE)
    (tmp_path / "batch.json").write_text(json.dumps([SALE, SPLIT, bad]))

    refused = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))

    assert refused.returncode == 1
    assert (tmp_path / "main.bean").read_text() == SPLIT_BASE
