"""Holdings groups keep a wide token quantity as booked (w5/1074).

A group started from zero, so `0 + x` rounded a 29-digit quantity before the
offsetting lot reduced it: the SHIB group read 0.12345678901234568 instead of
0.123456789012345678, and which account sorted first changed the answer.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:{wide} SHIB
2024-01-01 open Assets:{whole} SHIB
2024-01-01 open Equity:Opening USD
2024-01-01 price SHIB 1 USD
2024-01-02 * "Tokens held"
  Assets:{wide} 12345678901.123456789012345678 SHIB {{0 USD}}
  Equity:Opening 0 USD
2024-01-03 * "Offsetting token holding"
  Assets:{whole} -12345678901 SHIB {{0 USD}}
  Equity:Opening 0 USD
"""


@pytest.mark.parametrize(("wide", "whole"), [("Alpha", "Beta"), ("Beta", "Alpha")], ids=["wide-first", "wide-second"])
def test_the_commodity_group_holds_the_native_total(tmp_path: Path, wide: str, whole: str) -> None:
    ledger = write_ledger(tmp_path, LEDGER.format(wide=wide, whole=whole))

    proc = bea(
        ["--file", str(ledger), "--json", "report", "holdings", "--time", "2024-01", "--group-by", "commodity"],
        tmp_path,
    )

    assert proc.returncode == 0, proc.stderr
    (group,) = json.loads(proc.stdout)["data"]["groups"]
    assert group["units"] == {"number": "0.123456789012345678", "currency": "SHIB"}


def test_an_account_group_keeps_its_wide_quantity(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, LEDGER.format(wide="Alpha", whole="Beta"))

    proc = bea(["--file", str(ledger), "--json", "report", "holdings", "--time", "2024-01"], tmp_path)

    groups = {group["account"]: group["units"]["number"] for group in json.loads(proc.stdout)["data"]["groups"]}
    assert groups["Assets:Alpha"] == "12345678901.123456789012345678"
