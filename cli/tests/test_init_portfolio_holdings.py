"""The portfolio preset's holdings account accepts instrument units (w5/957).

`init --preset portfolio@1` opened `Assets:Holdings` for the operating currency
alone, so the preset's own first purchase (`10 HOOL {20 USD}` plus a fee) was
refused as an invalid currency for the account.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_init_preset import _bea


def _init(tmp_path: Path, currency: str, *balance: str) -> Path:
    books = tmp_path / "portfolio"
    args = ["--no-input", "init", str(books), "--preset", "portfolio@1", "--currency", currency, "--date", "2026-08-01"]
    for item in balance:
        args += ["--opening-balance", item]
    created = _bea(tmp_path, *args)
    assert created.returncode == 0, created.stderr
    return books / "main.bean"


def _buy(tmp_path: Path, ledger: Path, currency: str) -> object:
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "-f",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2026-08-02",
        "--narration",
        "Buy shares",
        "-p",
        f"Assets:Holdings 10 HOOL {{20 {currency}}}",
        "-p",
        f"Expenses:Fees 2 {currency}",
        "-p",
        f"Assets:BrokerCash -202 {currency}",
    )


@pytest.mark.parametrize("currency", ["USD", "EUR"])
@pytest.mark.parametrize("funded", [True, False], ids=["funded", "unfunded"])
def test_the_first_purchase_is_accepted(tmp_path: Path, currency: str, funded: bool) -> None:
    ledger = _init(tmp_path, currency, *(["Assets:BrokerCash 1000"] if funded else []))

    bought = _buy(tmp_path, ledger, currency)

    assert bought.returncode == 0, bought.stderr  # type: ignore[attr-defined]
    assert _bea(tmp_path, "--json", "-f", str(ledger), "check").returncode == 0
    held = _bea(tmp_path, "--json", "-f", str(ledger), "query", "SELECT sum(number) WHERE account = 'Assets:Holdings'")
    assert json.loads(held.stdout)["data"]["rows"] == [["10"]]


def test_cash_and_fee_accounts_stay_restricted_to_the_operating_currency(tmp_path: Path) -> None:
    ledger = _init(tmp_path, "USD", "Assets:BrokerCash 1000")
    text = ledger.read_text()

    assert "open Assets:BrokerCash USD" in text
    assert "open Expenses:Fees USD" in text
    assert "open Assets:Holdings\n" in text
    assert "open Assets:Holdings USD" not in text
