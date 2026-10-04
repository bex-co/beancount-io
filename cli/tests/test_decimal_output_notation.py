"""Machine output prints amounts in fixed-point notation, never `1E-8` (w1/053).

`str(Decimal("0.00000001"))` is `1E-8`. Query JSON/CSV, balance and report JSON,
custom-directive values, balance tolerances and typed metadata all used it, and
bea's own inputs refuse exponent notation — so a satoshi read out of the ledger
could not be written back in. Listings already used `format(number, "f")`.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

from bea_engine.protocol import _jsonable
from cli.output import jsonable

CLI_ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2024-01-01 open Assets:Wallet BTC
2024-01-01 open Equity:Opening BTC
2024-01-03 * "Faucet" "one satoshi"
  n2: -0.00000001
  Assets:Wallet   0.00000001 BTC
  Equity:Opening
2024-01-04 price BTC 0.0000001 USD
"""
EXPONENT = re.compile(r"\d[eE][+-]?\d")


def _bea(ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    # conftest's autouse fixture supplies isolated config/cache/data directories.
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), *args],
        cwd=ledger.parent,
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src"), "NO_COLOR": "1", "TERM": "dumb"},
        capture_output=True,
        text=True,
        timeout=60,
    )


def _json(ledger: Path, *args: str) -> Any:
    result = _bea(ledger, "--json", *args)
    assert result.returncode == 0, result.stderr or result.stdout
    assert not EXPONENT.search(result.stdout), result.stdout
    return json.loads(result.stdout)["data"]


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def test_walkers_use_fixed_point() -> None:
    for walker in (_jsonable, jsonable):
        assert walker(Decimal("0.00000001")) == "0.00000001"
        assert walker(Decimal("0E-8")) == "0.00000000"
        assert walker(Decimal("1E+3")) == "1000"
        assert walker(1e-8) == "0.00000001"


def test_query_json_and_csv(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    rows = _json(ledger, "query", "SELECT number, position, balance WHERE account ~ 'Wallet'")["rows"]
    assert rows[0][0] == "0.00000001"
    assert rows[0][1]["units"]["number"] == "0.00000001"
    assert rows[0][2][0]["units"]["number"] == "0.00000001"

    prices = _json(ledger, "query", "SELECT date, currency, amount FROM #prices")["rows"]
    assert prices[0][2] == {"number": "0.0000001", "currency": "USD"}

    csv = _bea(ledger, "query", "-f", "csv", "SELECT number, position")
    assert csv.returncode == 0, csv.stderr
    assert csv.stdout.splitlines()[1:] == ["0.00000001,0.00000001 BTC", "-0.00000001,-0.00000001 BTC"]

    out = tmp_path / "rows.csv"
    exported = _bea(ledger, "query", "-f", "csv", "-o", str(out), "SELECT number")
    assert exported.returncode == 0, exported.stderr
    assert "0.00000001" in out.read_text()
    assert not EXPONENT.search(out.read_text())


def test_balance_and_report_json(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    balance = _json(ledger, "balance")
    assert balance["assets"]["balance_children"] == {"BTC": "0.00000001"}

    trial = _json(ledger, "report", "trial-balance")
    assert trial["equity"]["balance_children"] == {"BTC": "-0.00000001"}


def test_directive_values_round_trip_through_add(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    custom = _json(
        ledger,
        "add",
        "custom",
        "--date",
        "2024-01-05",
        "--type",
        "t",
        "--value",
        "number:0.00000001",
        "--value",
        "amount:0.00000001 USD",
    )
    assert custom["directive"]["values"] == [
        {"kind": "number", "value": "0.00000001"},
        {"kind": "amount", "number": "0.00000001", "currency": "USD"},
    ]

    tolerance = _json(
        ledger, "add", "balance", "--date", "2024-01-05", "-a", "Assets:Wallet", "--amount", "0 ~ 0.00000001 BTC"
    )
    assert tolerance["directive"]["tolerance"] == "0.00000001"

    listed = _json(ledger, "list", "transaction")
    meta = json.dumps(listed)
    assert '{"kind": "number", "value": "-0.00000001"}' in meta

    # What was read back is valid input again.
    value = _json(ledger, "list", "custom")
    number = json.dumps(value).split('"kind": "number", "value": "')[1].split('"')[0]
    again = _bea(ledger, "add", "custom", "--date", "2024-01-06", "--type", "t", "--value", f"number:{number}")
    assert again.returncode == 0, again.stderr
