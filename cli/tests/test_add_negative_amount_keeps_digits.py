"""A negative amount wider than 28 significant digits is written as typed (w5/263).

Beancount's grammar evaluates a leading minus under the 28-digit decimal
context, so `add transaction --posting`, the bulk amount shorthand with a cost
or price, and `add balance --amount` wrote a rounded number at exit 0 while the
positive twin in the same command kept every digit.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Assets:Wallet
2026-01-01 open Equity:Opening
2026-01-01 commodity SHIB
"""
WIDE = "12345678901.123456789012345678"  # 29 significant digits
ROUNDED = "12345678901.12345678901234568"  # what unary minus made of it
FITS = "1234567890.123456789012345678"  # 28: the control


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
    ledger = tmp_path / "main.bean"
    if not ledger.exists():
        ledger.write_text(LEDGER, encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "add", *args],
        env=env,
        input=stdin,
        stdin=None if stdin is not None else subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _transaction(tmp_path: Path, *postings: str) -> subprocess.CompletedProcess[str]:
    flags = [part for posting in postings for part in ("-p", posting)]
    return _bea(tmp_path, "transaction", "--date", "2026-02-01", "-n", "A", *flags)


def _written(tmp_path: Path) -> str:
    return (tmp_path / "main.bean").read_text(encoding="utf-8").removeprefix(LEDGER)


@pytest.mark.parametrize("number", [WIDE, FITS])
def test_posting_flag_writes_both_signs_exactly(tmp_path: Path, number: str) -> None:
    result = _transaction(tmp_path, f"Assets:Wallet {number} SHIB", f"Equity:Opening -{number} SHIB")

    assert result.returncode == 0, result.stderr
    written = _written(tmp_path)
    assert f" {number} SHIB" in written
    assert f" -{number} SHIB" in written
    postings = json.loads(result.stdout)["data"]["directive"]["postings"]
    assert [posting["units"]["number"] for posting in postings] == [number, f"-{number}"]


def test_posting_flag_with_a_price_keeps_the_negative_digits(tmp_path: Path) -> None:
    result = _transaction(tmp_path, f"Assets:Wallet -{WIDE} SHIB @ 2 USD", "Assets:Checking")

    assert result.returncode == 0, result.stderr
    assert f" -{WIDE} SHIB @ 2 USD" in _written(tmp_path)


def test_a_repeating_quotient_beside_a_wide_number_is_refused(tmp_path: Path) -> None:
    """The quotient that fills even the wide precision is refused, not written as 28 threes (w1/313)."""
    refused = _transaction(
        tmp_path,
        f"Assets:Wallet -{WIDE} SHIB",
        "Assets:Wallet -1/3 SHIB",
        f"Equity:Opening {WIDE} SHIB",
        "Equity:Opening",
    )

    assert refused.returncode == 2, refused.stdout + refused.stderr
    assert "--posting 2 'Assets:Wallet -1/3 SHIB' does not divide exactly" in " ".join(refused.stderr.split())
    assert _written(tmp_path) == ""

    result = _transaction(
        tmp_path,
        f"Assets:Wallet -{WIDE} SHIB",
        "Assets:Wallet -0.33 SHIB",
        f"Equity:Opening {WIDE} SHIB",
        "Equity:Opening",
    )

    assert result.returncode == 0, result.stderr
    written = _written(tmp_path)
    assert f" -{WIDE} SHIB" in written
    assert ROUNDED not in written


def test_an_inferred_leg_beside_a_wide_number_is_refused_at_its_line(tmp_path: Path) -> None:
    """Booking now reports the transaction instead of raising, so the refusal is a validation (w5/538)."""
    result = _transaction(tmp_path, f"Assets:Wallet {WIDE} SHIB", "Equity:Opening")

    assert result.returncode == 1, result.stdout + result.stderr
    assert "Proposed append (not written): Beancount cannot book this transaction" in result.stderr
    assert "28 significant digits" in result.stderr
    assert "InvalidOperation" not in result.stdout + result.stderr
    assert _written(tmp_path) == ""


def test_bulk_shorthand_keeps_the_negative_digits(tmp_path: Path) -> None:
    rows = [
        {
            "date": "2026-04-01",
            "narration": "plain",
            "postings": [
                {"account": "Assets:Wallet", "amount": f"{WIDE} SHIB"},
                {"account": "Equity:Opening", "amount": f"-{WIDE} SHIB"},
            ],
        },
        {
            "date": "2026-04-02",
            "narration": "priced",
            "postings": [
                {"account": "Assets:Wallet", "amount": f"-{WIDE} SHIB @ 2 USD"},
                {"account": "Assets:Checking"},
            ],
        },
    ]
    result = _bea(tmp_path, "transactions", "--from", "-", stdin=json.dumps(rows))

    assert result.returncode == 0, result.stderr
    written = _written(tmp_path)
    assert written.count(f" -{WIDE} SHIB") == 2
    assert ROUNDED not in written


def test_balance_amount_keeps_the_negative_digits(tmp_path: Path) -> None:
    funded = _transaction(tmp_path, f"Assets:Wallet -{WIDE} SHIB", f"Equity:Opening {WIDE} SHIB")
    assert funded.returncode == 0, funded.stderr

    result = _bea(tmp_path, "balance", "-a", "Assets:Wallet", "--date", "2026-03-01", "--amount", f"-{WIDE} SHIB")

    assert result.returncode == 0, result.stderr
    assert f"2026-03-01 balance Assets:Wallet -{WIDE} SHIB" in " ".join(_written(tmp_path).split())
    assert ROUNDED not in _written(tmp_path)
