"""Reports keep a token residual exactly as Beancount holds it (w5/1054).

The report inventory added each first position to a Decimal zero, which rounds
a 29-digit quantity to 28 digits before any real sum; after a whole-token
return the 18-decimal residual came out `0.12345678901234568` instead of
`0.123456789012345678`.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.report_helpers import bea, write_ledger

LEDGER = """option "operating_currency" "USD"
2024-01-01 commodity SHIB
2024-01-01 open Assets:Cash SHIB
2024-01-01 open Equity:Opening SHIB
2024-01-02 * "Receive"
  Assets:Cash 12345678900.123456789012345678 SHIB
  Equity:Opening -12345678900.123456789012345678 SHIB
2024-01-03 * "Return"
  Assets:Cash -12345678900 SHIB
  Equity:Opening 12345678900 SHIB
"""
EXACT = Decimal("0.123456789012345678")


def _json(tmp_path: Path, *args: str) -> dict[str, object]:
    ledger = write_ledger(tmp_path, LEDGER)
    proc = bea(["--file", str(ledger), "--json", *args], tmp_path)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)["data"]  # type: ignore[no-any-return]


def _cash(node: dict[str, object]) -> Decimal | None:
    if node.get("account") == "Assets:Cash":
        return Decimal(str(node["balance"]["SHIB"]))  # type: ignore[index]
    for child in node.get("children", []):  # type: ignore[union-attr]
        found = _cash(child)
        if found is not None:
            return found
    return None


@pytest.mark.parametrize("kind", ["trial-balance", "balance-sheet"])
def test_tree_reports_keep_the_residual(tmp_path: Path, kind: str) -> None:
    data = _json(tmp_path, "report", kind, "--conversion", "units")

    tree = data["assets"] if "assets" in data else data["trees"]["assets"]  # type: ignore[index]
    assert _cash(tree) == EXACT  # type: ignore[arg-type]


def test_the_register_keeps_the_residual(tmp_path: Path) -> None:
    data = _json(tmp_path, "report", "register", "Assets:Cash", "--conversion", "units")

    assert Decimal(str(data["rows"][-1]["balance"]["SHIB"])) == EXACT  # type: ignore[index]
