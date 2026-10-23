"""The ledger cache is invalidated when a helper a plugin imports changes (w5/952).

The cached load recorded the plugin modules named in the ledger and not the
modules they import, so editing `fee_math.py` under an unchanged `fees.py` kept
serving the old fee from the cache until the ledger or the plugin itself moved.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "fees"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-01 open Expenses:Fees USD
2024-02-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
PLUGIN = """import time
import fee_math
from decimal import Decimal
from beancount.core.data import Transaction, Posting
from beancount.core.amount import Amount

__plugins__ = ("fees",)

def fees(entries, options):
    time.sleep(1.05)
    with open(__file__.replace("fees.py", "runs.txt"), "a") as runs:
        runs.write("x")
    result = list(entries)
    seed = next(e for e in entries if isinstance(e, Transaction) and e.narration == "Capital")
    number = Decimal(fee_math.FEE)
    result.append(seed._replace(
        meta=seed.meta.copy(), narration="Calculated fee",
        postings=[
            Posting("Assets:Cash", Amount(-number, "USD"), None, None, None, None),
            Posting("Expenses:Fees", Amount(number, "USD"), None, None, None, None),
        ],
    ))
    return result, []
"""


def _fees(tmp_path: Path) -> str:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Expenses:Fees'")
    assert result.returncode == 0, result.stderr
    return str(json.loads(result.stdout)["data"]["rows"][0][0])


def _runs(tmp_path: Path) -> int:
    """How many times the plugin has actually run: a cached read does not run it."""
    marker = tmp_path / "runs.txt"
    return len(marker.read_text()) if marker.exists() else 0


def _books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "fees.py").write_text(PLUGIN)
    helper = tmp_path / "fee_math.py"
    helper.write_text('FEE = "1.00"\n')
    return helper


def test_editing_the_helper_reloads_the_calculation(tmp_path: Path) -> None:
    helper = _books(tmp_path)

    assert _fees(tmp_path) == "1.00"
    assert _fees(tmp_path) == "1.00"
    assert _runs(tmp_path) == 1
    ledger_before = (tmp_path / "main.bean").read_bytes()
    helper.write_text('FEE = "12.50"\n')

    assert _fees(tmp_path) == "12.50"
    assert _runs(tmp_path) == 2
    assert (tmp_path / "main.bean").read_bytes() == ledger_before


def test_removing_the_helper_reloads_the_load(tmp_path: Path) -> None:
    helper = _books(tmp_path)
    assert _fees(tmp_path) == "1.00"
    helper.unlink()

    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Expenses:Fees'", "--allow-errors")

    # The cached answer was not served: the load ran again and could not import.
    payload = json.loads(result.stdout)
    assert payload["ledger_valid"] is False
    assert payload["data"]["rows"] == [] or payload["data"]["rows"][0][0] is None


def test_an_unchanged_helper_keeps_serving_the_cache(tmp_path: Path) -> None:
    _books(tmp_path)
    assert _fees(tmp_path) == "1.00"

    assert _fees(tmp_path) == "1.00"
    assert _fees(tmp_path) == "1.00"

    assert _runs(tmp_path) == 1
