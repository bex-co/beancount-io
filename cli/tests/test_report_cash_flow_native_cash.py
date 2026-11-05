"""Cash Flow cash boundaries keep native inventory arithmetic (w5/1118)."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from decimal import Decimal, localcontext
from pathlib import Path
from typing import Any

import pytest
from beancount import loader
from beancount.core import data, inventory

from tests.report_helpers import bea, run_env, write_ledger


def _ledger(purchases: int, inferred: bool) -> str:
    text = """option "operating_currency" "USD"
2023-01-01 open Assets:Cash USD
2023-01-01 open Assets:Broker HOOL
2023-01-01 open Equity:Opening USD
2023-12-31 * "Capital"
  Assets:Cash 5000.00 USD
  Equity:Opening -5000.00 USD
"""
    payment = "" if inferred else " -1000.00 USD"
    for n in range(purchases):
        text += f"""2024-01-{5 + n:02d} * "Purchase {n + 1}"
  Assets:Broker 3 HOOL {{{{1000.00 USD}}}}
  Assets:Cash{payment}
"""
    return text


def _native_cash(ledger: Path, before: date, *, allow_errors: bool = False) -> Decimal:
    """Sum independently booked positions before a boundary, using native inventory."""
    with localcontext() as native:
        native.prec = 28
        entries, errors, _ = loader.load_file(str(ledger))
        assert allow_errors or not errors, errors
        cash = inventory.Inventory()
        for entry in entries:
            if isinstance(entry, data.Transaction) and entry.date < before:
                for posting in entry.postings:
                    if posting.account == "Assets:Cash":
                        cash.add_position(posting)
        return next((position.units.number for position in cash if position.units.currency == "USD"), Decimal(0))


def _report(tmp_path: Path, ledger: Path, *args: str) -> dict[str, Any]:
    result = bea(["--no-input", "--offline", "--json", "--file", str(ledger), "report", "cash-flow", *args], tmp_path)
    assert result.returncode == 0, result.stdout + result.stderr
    payload: dict[str, Any] = json.loads(result.stdout)["data"]
    return payload


def _assert_cash(payload: dict[str, Any], ledger: Path, start: date, end: date, *, allow_errors: bool = False) -> None:
    opening = _native_cash(ledger, start, allow_errors=allow_errors)
    closing = _native_cash(ledger, end, allow_errors=allow_errors)
    assert Decimal(payload["opening"]["USD"]) == opening
    assert Decimal(payload["closing"]["USD"]) == closing
    cash = next(account for account in payload["cash_accounts"] if account["account"] == "Assets:Cash")
    assert Decimal(cash["balance"]["USD"]) == closing
    with localcontext() as exact:
        exact.prec = 100
        activity = Decimal(payload["net_change"].get("USD", "0"))
        residual = Decimal(payload["rounding_residual"].get("USD", "0"))
        assert activity + residual == closing - opening


@pytest.mark.parametrize("inferred", [True, False], ids=["inferred", "explicit"])
@pytest.mark.parametrize("purchases", [1, 2, 3])
@pytest.mark.parametrize("month", [1, 2], ids=["active-month", "quiet-month"])
def test_cash_boundaries_match_native_inventory(tmp_path: Path, purchases: int, inferred: bool, month: int) -> None:
    ledger = write_ledger(tmp_path, _ledger(purchases, inferred))
    original = ledger.read_bytes()
    payload = _report(tmp_path, ledger, "--time", f"2024-{month:02d}")

    _assert_cash(payload, ledger, date(2024, month, 1), date(2024, month + 1, 1))
    assert ledger.read_bytes() == original


def test_bounded_inferred_payment_uses_actual_opening_inventory(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, _ledger(3, True))
    payload = _report(tmp_path, ledger, "--from-date", "2024-01-06", "--to-date", "2024-01-06")

    _assert_cash(payload, ledger, date(2024, 1, 6), date(2024, 1, 7))


def test_allow_errors_keeps_native_cash_boundaries(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, _ledger(2, True) + "2024-01-20 balance Assets:Cash 123 USD\n")
    original = ledger.read_bytes()
    payload = _report(tmp_path, ledger, "--time", "2024-01", "--allow-errors")

    _assert_cash(payload, ledger, date(2024, 1, 1), date(2024, 2, 1), allow_errors=True)
    assert payload["ledger_errors"]
    assert ledger.read_bytes() == original


def test_json_export_keeps_native_cash_boundaries(tmp_path: Path) -> None:
    ledger = write_ledger(tmp_path, _ledger(2, True))
    original = ledger.read_bytes()
    exported = tmp_path / "cash-flow.json"
    with exported.open("w") as stream:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "cli.main",
                "--no-input",
                "--offline",
                "--json",
                "--file",
                str(ledger),
                "report",
                "cash-flow",
                "--time",
                "2024-02",
            ],
            cwd=tmp_path,
            env=run_env(tmp_path),
            stdout=stream,
            stderr=subprocess.PIPE,
            text=True,
            timeout=60,
            check=False,
        )
    assert result.returncode == 0, result.stderr
    _assert_cash(json.loads(exported.read_text())["data"], ledger, date(2024, 2, 1), date(2024, 3, 1))
    assert ledger.read_bytes() == original


def test_large_unchanged_cash_does_not_erase_accepted_cost_rounding(tmp_path: Path) -> None:
    capital = "1" + "0" * 100
    ledger = write_ledger(
        tmp_path,
        'option "operating_currency" "USD"\n'
        "2023-01-01 open Assets:Cash USD\n"
        "2023-01-01 open Assets:Broker HOOL\n"
        "2023-01-01 open Assets:Other USD\n"
        "2023-01-01 open Equity:Opening USD\n"
        '2023-12-31 * "Capital"\n'
        f"  Assets:Cash {capital} USD\n  Equity:Opening -{capital} USD\n"
        '2024-01-05 * "Noncash cost movement"\n'
        "  Assets:Broker 3 HOOL {{1000.00 USD}}\n  Assets:Other -1000.00 USD\n",
    )
    original = ledger.read_bytes()

    payload = _report(tmp_path, ledger, "--time", "2024-01")

    _assert_cash(payload, ledger, date(2024, 1, 1), date(2024, 2, 1))
    assert Decimal(payload["net_change"]["USD"]) == Decimal("1e-25")
    assert Decimal(payload["rounding_residual"]["USD"]) == Decimal("-1e-25")
    assert ledger.read_bytes() == original
