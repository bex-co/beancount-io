"""A partial Capital Gains read skips reductions it cannot price (w5/1043).

An unfinished `@ USD` sale keeps the parser's MISSING sentinel as its price
number, which passed the `is None` guard and crashed the multiplication with
`--allow-errors`, instead of returning the completed sale's gain.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Stock HOOL "FIFO"
2026-01-01 open Income:Gains USD
2026-01-01 open Equity:Opening USD
2026-01-01 * "Capital"
  Assets:Cash 1000 USD
  Equity:Opening -1000 USD
2026-01-02 * "Purchase"
  Assets:Stock 2 HOOL {{100 USD}}
  Assets:Cash -200 USD
2026-01-03 * "Completed sale"
  Assets:Stock -1 HOOL {{}} @ 125 USD
  Assets:Cash 125 USD
  Income:Gains -25 USD
2026-01-04 * "Last entry"
  Assets:Stock -1 HOOL {{}}{annotation}
  Assets:Cash {cash} USD
  Income:Gains {gain} USD
"""


def _gains(tmp_path: Path, annotation: str, *args: str, cash: str = "100", gain: str = "0") -> tuple[int, str]:
    ledger = write_ledger(tmp_path, LEDGER.format(annotation=annotation, cash=cash, gain=gain))
    proc = bea(["--file", str(ledger), "--json", "report", "capital-gains", *args], tmp_path)
    return proc.returncode, proc.stdout or proc.stderr


@pytest.mark.parametrize("annotation", [" @ USD", " @@ USD"], ids=["per-unit", "total"])
def test_an_unpriced_reduction_is_left_out_of_a_partial_read(tmp_path: Path, annotation: str) -> None:
    code, out = _gains(tmp_path, annotation, "--allow-errors")

    assert code == 0, out
    data = json.loads(out)["data"]
    assert [(row["sold"], row["gain"]["number"]) for row in data["rows"]] == [("2026-01-03", "25")]
    assert data["totals"]["one_year_or_less"] == {"USD": "25"}
    assert _gains(tmp_path, annotation)[0] == 1


def test_a_zero_price_sale_is_still_a_realized_loss(tmp_path: Path) -> None:
    code, out = _gains(tmp_path, " @ 0 USD", cash="0", gain="100")

    assert code == 0, out
    gains = [row["gain"]["number"] for row in json.loads(out)["data"]["rows"]]
    assert gains == ["25", "-100"]
