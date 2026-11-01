"""Cash Flow accepts native rounding that repeats across purchases (w5/1077).

Each three-share purchase at 1000.00 USD books a unit cost of 25 decimals. One
alone reconciles; two used to sum past the 28-digit context, so the combined
period refused a native-valid book as not conserving USD at cost.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2023-01-01 open Assets:Checking USD
2023-01-01 open Assets:Broker HOOL
2023-01-01 open Equity:Opening USD
2023-12-31 * "Capital"
  Assets:Checking 5000.00 USD
  Equity:Opening -5000.00 USD

2024-01-05 * "Purchase 1"
  Assets:Broker               3 HOOL {0 # 1000.00 USD}
  Assets:Checking      -1000.00 USD

2024-01-06 * "Purchase 2"
  Assets:Broker               3 HOOL {0 # 1000.00 USD}
  Assets:Checking      -1000.00 USD
"""


def test_two_repeated_rounding_purchases_reconcile_in_one_period(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", "--time", "2024-01"], tmp_path)
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]
    assert float(data["opening"]["USD"]) == 5000
    assert float(data["closing"]["USD"]) == 3000


SALE = """option "operating_currency" "USD"
2023-01-01 open Assets:Checking USD
2023-01-01 open Assets:Broker HOOL
2023-01-01 open Equity:Opening USD
2023-01-01 open Income:Gains USD
2023-11-30 * "Capital"
  Assets:Checking 5000.00 USD
  Equity:Opening -5000.00 USD
2023-12-31 * "Buy three"
  Assets:Broker 3 HOOL {{1000.00 USD}}
  Assets:Checking -1000.00 USD

2024-01-05 * "Sell three at break-even"
  Assets:Broker              -3 HOOL {} @@ 1000.00 USD
  Assets:Checking       1000.00 USD
  Income:Gains             0.00 USD
"""


def test_costed_sale_with_a_price_is_not_a_currency_exchange(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, SALE)
    proc = bea(["--file", str(ledger), "--json", "report", "cash-flow", "--time", "2024-01"], tmp_path)
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]
    assert float(data["opening"]["USD"]) == 4000
    assert float(data["closing"]["USD"]) == 5000
