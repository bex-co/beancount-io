"""A native importer's price may leave its currency to the transaction (w5/1016).

`Assets:Broker 2 HOOL @ 5` beside `Assets:Cash -10.00 USD` is valid Beancount:
the price currency is inferred as USD. The printer wrote the parser's
`MISSING` sentinel class as the currency and the row was refused at preview.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.test_import_parser_incomplete_counterposting import IMPORTER
from tests.test_import_source_facts import _bea, _written

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Broker HOOL
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
RUN = ["import", "bank.txt", "--config", "importers.py"]


def _books(tmp_path: Path, price: str, bank_id: bool) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importers.py").write_text(IMPORTER.replace('"Assets:Cash"', '"Assets:Broker"'))
    meta = '  bank_id: "trade-1"\n' if bank_id else ""
    (tmp_path / "bank.txt").write_text(
        f'2024-01-02 * "Trade"\n{meta}  Assets:Broker 2 HOOL {price}\n  Assets:Cash -10.00 USD\n'
    )


@pytest.mark.parametrize("price", ["@ 5", "@@ 10", "@ 5 USD"], ids=["unit", "total", "explicit"])
@pytest.mark.parametrize("bank_id", [False, True], ids=["generated", "bank-id"])
def test_an_inferred_price_currency_imports_and_repeats(tmp_path: Path, price: str, bank_id: bool) -> None:
    _books(tmp_path, price, bank_id)

    preview = _bea(tmp_path, *RUN)
    assert preview.returncode == 0, preview.stderr
    assert json.loads(preview.stdout)["data"]["ready"] == 1

    assert _written(_bea(tmp_path, *RUN, "--apply")) == 1
    assert "<class" not in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0
    prices = _bea(tmp_path, "query", "SELECT number(price), currency(price) WHERE account = 'Assets:Broker'")
    ((number, currency),) = json.loads(prices.stdout)["data"]["rows"]
    assert (Decimal(str(number)), currency) == (Decimal("5"), "USD")
    assert _written(_bea(tmp_path, *RUN, "--apply")) == 0
