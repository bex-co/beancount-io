"""A `PRINT` export keeps a source-inferred lot quantity open (w5/1066).

Two purchases whose quantities Beancount interpolated book as one undated lot;
the export printed the booked quantities, the reload dated each purchase, and
the later partial sale became ambiguous under strict booking.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker HOOL{booking}
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Trade buy 1"
  Assets:Cash -10.00 USD
  Assets:Broker {qty}HOOL {lot}
2024-01-03 * "Trade buy 2"
  Assets:Cash -10.00 USD
  Assets:Broker {qty}HOOL {lot}
2024-01-04 * "Trade sale"
  Assets:Cash 12.00 USD
  Assets:Broker -2 HOOL {sale} @ 6 USD
  Income:Gains -2.00 USD
"""


def _lots(tmp_path: Path, ledger: Path) -> list[list[object]]:
    result = _bea(
        tmp_path,
        "--json",
        "-f",
        str(ledger),
        "query",
        "SELECT str(cost_date), sum(number) WHERE account = 'Assets:Broker' GROUP BY 1 ORDER BY 1",
    )
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


@pytest.mark.parametrize(
    ("booking", "qty", "lot", "sale"),
    [
        ("", "", "{5 USD}", "{5 USD}"),
        (' "FIFO"', "", "{5 USD}", "{5 USD}"),
        ("", "", "{5 USD, 2023-12-31}", "{5 USD, 2023-12-31}"),
        ("", "2 ", "{5 USD}", "{5 USD, 2024-01-02}"),
    ],
    ids=["strict", "fifo", "dated", "explicit"],
)
def test_the_export_reloads_with_the_same_lots(tmp_path: Path, booking: str, qty: str, lot: str, sale: str) -> None:
    source = tmp_path / "main.bean"
    source.write_text(LEDGER.format(booking=booking, qty=qty, lot=lot, sale=sale))
    out = tmp_path / "export.bean"

    exported = _bea(tmp_path, "-f", str(source), "query", "PRINT", "-f", "beancount", "-o", str(out))

    assert exported.returncode == 0, exported.stderr
    assert _bea(tmp_path, "-f", str(out), "check").returncode == 0
    assert _lots(tmp_path, out) == _lots(tmp_path, source)
