"""Retried price and balance writes stay single, and conflicts name both values (w3/291, w3/297, w3/367)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking
2024-01-01 open Expenses:Food
2024-01-01 open Equity:Opening-Balances
2024-01-02 * "whole"
  Expenses:Food  10 USD
  Assets:Checking
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _price(ledger: Path, amount: str, *extra: str) -> list[str]:
    return [
        "--file",
        str(ledger),
        "add",
        "price",
        "--date",
        "2024-01-02",
        "--currency",
        "HOOL",
        "--amount",
        amount,
        *extra,
    ]


def _balance(ledger: Path, amount: str, *extra: str) -> list[str]:
    return [
        "--file",
        str(ledger),
        "add",
        "balance",
        "--date",
        "2024-01-03",
        "--account",
        "Assets:Checking",
        "--amount",
        amount,
        *extra,
    ]


def test_identical_price_is_reported_not_duplicated(ledger: Path) -> None:
    assert _bea(ledger.parent, *_price(ledger, "3 USD")).returncode == 0
    again = _bea(ledger.parent, *_price(ledger, "3 USD"))

    assert again.returncode == 0, again.stderr
    assert "already recorded" in again.stdout
    assert ledger.read_text().count("price HOOL") == 1


def test_conflicting_price_names_both_values_and_the_flag(ledger: Path) -> None:
    assert _bea(ledger.parent, *_price(ledger, "3 USD")).returncode == 0
    result = _bea(ledger.parent, *_price(ledger, "4 USD"))

    assert result.returncode == 2, result.stderr
    assert "3 USD" in result.stderr
    assert "4 USD" in result.stderr
    assert "--force" in result.stderr
    assert ledger.read_text().count("price HOOL") == 1


def test_forced_price_records_another_quote(ledger: Path) -> None:
    assert _bea(ledger.parent, *_price(ledger, "3 USD")).returncode == 0
    result = _bea(ledger.parent, *_price(ledger, "4 USD", "--force"))

    assert result.returncode == 0, result.stderr
    assert ledger.read_text().count("price HOOL") == 2


def test_identical_balance_is_reported_not_duplicated(ledger: Path) -> None:
    assert _bea(ledger.parent, *_balance(ledger, "-10 USD")).returncode == 0
    again = _bea(ledger.parent, *_balance(ledger, "-10 USD"))

    assert again.returncode == 0, again.stderr
    assert "already recorded" in again.stdout
    assert ledger.read_text().count("balance Assets:Checking") == 1


def test_conflicting_balance_names_both_values_and_the_flag(ledger: Path) -> None:
    assert _bea(ledger.parent, *_balance(ledger, "-10 USD")).returncode == 0
    result = _bea(ledger.parent, *_balance(ledger, "-9 USD"))

    assert result.returncode == 2, result.stderr
    assert "-10 USD" in result.stderr
    assert "-9 USD" in result.stderr
    assert "--force" in result.stderr
    assert ledger.read_text().count("balance Assets:Checking") == 1


def test_forced_conflicting_balance_still_fails_validation(ledger: Path) -> None:
    assert _bea(ledger.parent, *_balance(ledger, "-10 USD")).returncode == 0
    result = _bea(ledger.parent, *_balance(ledger, "-9 USD", "--force"))

    assert result.returncode == 1, result.stderr
    assert ledger.read_text().count("balance Assets:Checking") == 1


def test_tolerance_change_conflicts_but_force_appends(ledger: Path) -> None:
    assert _bea(ledger.parent, *_balance(ledger, "-10 USD")).returncode == 0
    conflict = _bea(ledger.parent, *_balance(ledger, "-10 ~ 0.5 USD"))

    assert conflict.returncode == 2, conflict.stderr
    assert "~ 0.5 USD" in conflict.stderr
    forced = _bea(ledger.parent, *_balance(ledger, "-10 ~ 0.5 USD", "--force"))

    assert forced.returncode == 0, forced.stderr
    assert ledger.read_text().count("balance Assets:Checking") == 2


def test_repeated_amount_is_refused_on_balance_and_price(ledger: Path) -> None:
    repeated = _bea(
        ledger.parent,
        "--file",
        str(ledger),
        "add",
        "balance",
        "--date",
        "2024-01-04",
        "--account",
        "Assets:Checking",
        "--amount",
        "-10 USD",
        "--amount",
        "-9 USD",
    )

    assert repeated.returncode == 2, repeated.stderr
    assert "exactly once" in repeated.stderr
    assert "balance Assets:Checking" not in ledger.read_text()

    result = _bea(
        ledger.parent,
        "--file",
        str(ledger),
        "add",
        "price",
        "--date",
        "2024-01-05",
        "--currency",
        "HOOL",
        "--amount",
        "3 USD",
        "--amount",
        "4 USD",
    )

    assert result.returncode == 2, result.stderr
    assert "exactly once" in result.stderr


def test_json_duplicates_carry_source_and_zero_written(ledger: Path) -> None:
    assert _bea(ledger.parent, *_price(ledger, "3 USD")).returncode == 0
    price = _bea(ledger.parent, "--json", *_price(ledger, "3 USD"))

    assert price.returncode == 0, price.stderr
    data = json.loads(price.stdout)["data"]
    assert data["written"] == 0
    assert data["duplicate"] is True
    assert data["source"]["filename"].endswith("main.bean")

    assert _bea(ledger.parent, *_balance(ledger, "-10 USD")).returncode == 0
    balance = _bea(ledger.parent, "--json", *_balance(ledger, "-10 USD"))

    assert balance.returncode == 0, balance.stderr
    data = json.loads(balance.stdout)["data"]
    assert data["written"] == 0
    assert data["duplicate"] is True
    assert data["source"]["filename"].endswith("main.bean")


def test_pad_from_retry_reports_the_existing_assertion(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  3357.83 USD
  Equity:Opening-Balances
"""
    )
    args = [
        "--file",
        str(ledger),
        "add",
        "balance",
        "--date",
        "2024-03-10",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "3357.83 USD",
        "--pad-from",
        "Equity:Opening-Balances",
    ]

    assert _bea(tmp_path, *args).returncode == 0
    again = _bea(tmp_path, *args)

    assert again.returncode == 0, again.stderr
    assert "already recorded" in again.stdout
    text = ledger.read_text()
    assert text.count("balance Assets:Bank:Checking") == 1
    assert "pad Assets:Bank:Checking" not in text
