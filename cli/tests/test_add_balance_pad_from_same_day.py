"""`add balance --pad-from` refuses to pad away the assertion day's own transactions (w1/339).

A statement's closing balance is the balance at the end of its last day, and
Beancount checks an assertion at the start of its day. The plain assertion on
that day fails with the start-of-day hint; with `--pad-from` the pad absorbed
exactly the day's transactions, exit 0, and the account counted them twice.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Rent USD
2026-01-01 open Equity:Opening-Balances USD
2026-01-02 * "Opening"
  Assets:Checking 3000.00 USD
  Equity:Opening-Balances
2026-01-10 * "Landlord" "Rent"
  Expenses:Rent 1200.00 USD
  Assets:Checking
"""
PAD = ("--account", "Assets:Checking", "--pad-from", "Equity:Opening-Balances")


def _bea(ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(ledger.parent / "config"),
        XDG_CACHE_HOME=str(ledger.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", "--file", str(ledger), *args],
        env=env,
        cwd=ledger.parent,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _ledger(tmp_path: Path, text: str = LEDGER) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def _pad(ledger: Path, date: str, amount: str, *global_options: str) -> subprocess.CompletedProcess[str]:
    return _bea(ledger, *global_options, "add", "balance", "--date", date, "--amount", amount, *PAD)


def _message(result: subprocess.CompletedProcess[str]) -> str:
    return " ".join((result.stdout + result.stderr).split())


def test_a_closing_balance_on_its_own_day_is_refused(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-10", "1800.00 USD")

    assert result.returncode == 2, result.stderr
    message = _message(result)
    assert (
        "Assets:Checking holds 3000.00 USD at the start of 2026-01-10 and 1800.00 USD at its end: that day's own "
        "postings reach 1800.00 USD." in message
    )
    assert "Balance assertions run at the start of the day" in message
    assert "padding to 1800.00 USD would insert -1200.00 USD and count them twice" in message
    assert "--date 2026-01-11 needs no pad. Pass --force to pad anyway. Nothing was written." in message
    assert f"{ledger}:8 Landlord: -1200.00 USD" in message
    assert ledger.read_text() == LEDGER


def test_the_json_refusal_names_the_postings(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-10", "1800.00 USD", "--json")

    assert result.returncode == 2, result.stderr
    error: dict[str, Any] = json.loads(result.stdout or result.stderr)["error"]
    assert error["category"] == "usage"
    assert "--date 2026-01-11 needs no pad" in error["message"]
    assert error["details"] == [f"{ledger}:8 Landlord: -1200.00 USD"]
    assert ledger.read_text() == LEDGER


def test_an_empty_account_is_not_padded_with_its_first_deposit(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-02", "3000.00 USD")

    assert result.returncode == 2, result.stderr
    message = _message(result)
    assert "holds 0 USD at the start of 2026-01-02 and 3000.00 USD at its end" in message
    assert "--date 2026-01-03 needs no pad" in message
    assert f"{ledger}:5 Opening: 3000.00 USD" in message
    assert ledger.read_text() == LEDGER


def test_an_end_of_day_balance_within_tolerance_is_refused(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-10", "1800.25 ~ 0.5 USD")

    assert result.returncode == 2, result.stderr
    assert "that day's own postings reach 1800.25 ~ 0.5 USD" in _message(result)
    assert ledger.read_text() == LEDGER


def test_a_subaccount_posting_names_its_account(tmp_path: Path) -> None:
    ledger = _ledger(
        tmp_path,
        LEDGER.replace("Assets:Checking\n", "Assets:Checking:Joint\n").replace(
            "2026-01-01 open Expenses", "2026-01-01 open Assets:Checking:Joint USD\n2026-01-01 open Expenses"
        ),
    )

    result = _pad(ledger, "2026-01-10", "1800.00 USD")

    assert result.returncode == 2, result.stderr
    assert "Landlord: -1200.00 USD in Assets:Checking:Joint" in _message(result)


def test_force_pads_anyway(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    command = ("add", "balance", "--date", "2026-01-10", "--amount", "1800.00 USD", *PAD, "--force")
    result = _bea(ledger, "--json", *command)

    assert result.returncode == 0, result.stderr
    data: dict[str, Any] = json.loads(result.stdout)["data"]
    assert data["written"] == 2
    assert data["pad"]["amount"] == {"number": "-1200.00", "currency": "USD"}


def test_the_following_day_writes_the_assertion_alone(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-11", "1800.00 USD")

    assert result.returncode == 0, result.stderr
    assert "Book balance already matches 1800.00 USD; omitted the pad from --pad-from" in _message(result)
    assert ledger.read_text().endswith("2026-01-11 balance Assets:Checking  1800.00 USD\n")


def test_a_gap_the_days_postings_leave_open_is_still_padded(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-10", "1700.00 USD")

    assert result.returncode == 0, result.stderr
    assert "the pad inserts -1300.00 USD into Assets:Checking" in _message(result)


def test_a_day_without_postings_is_still_padded(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    result = _pad(ledger, "2026-01-09", "1800.00 USD")

    assert result.returncode == 0, result.stderr
    assert "the pad inserts -1200.00 USD into Assets:Checking" in _message(result)
