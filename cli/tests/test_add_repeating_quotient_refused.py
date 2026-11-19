"""An amount whose arithmetic does not terminate is refused, not written as 28 digits (w1/313).

`bea add transaction -p 'Expenses:Dining 100/3 USD'` wrote
`33.33333333333333333333333333 USD` at exit 0, and so did the bulk `amount`
shorthand. From then on every report printed USD to 26 decimals and the trial
balance grew a rounding line. `add balance --amount '100/3 USD'` offered that
28-digit figure as the fix. All three now refuse before writing and name an
amount to write instead; exact arithmetic is still written evaluated.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

from bea_engine.amounts import Repeating, parse_exact

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Broker
2026-01-01 open Expenses:Dining USD
2026-01-01 open Equity:Opening-Balances USD

2026-01-01 * "Opening"
  Assets:Checking  1000.00 USD
  Equity:Opening-Balances
"""
READING = "33.33333333333333333333333333 USD"


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
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "add", *args],
        env=env,
        input=stdin,
        stdin=None if stdin is not None else subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _ledger(tmp_path: Path) -> str:
    return (tmp_path / "main.bean").read_text(encoding="utf-8")


def _split(tmp_path: Path, amount: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "transaction", "--date", "2026-01-10", "Dinner", "-p", amount, "-p", "Assets:Checking")


def test_a_posting_flag_that_does_not_divide_exactly_is_refused(tmp_path: Path) -> None:
    result = _split(tmp_path, "Expenses:Dining 100/3 USD")

    assert result.returncode == 2, result.stdout + result.stderr
    assert _ledger(tmp_path) == LEDGER
    message = " ".join(result.stderr.split())
    assert "--posting 1 'Expenses:Dining 100/3 USD' does not divide exactly" in message
    assert f"Beancount would store {READING}" in message
    assert "such as 33.33 USD" in message
    assert "Nothing was written." in message


def test_a_bulk_amount_that_does_not_divide_exactly_is_refused(tmp_path: Path) -> None:
    rows = [
        {
            "date": "2026-01-10",
            "narration": "Dinner",
            "postings": [{"account": "Expenses:Dining", "amount": "100/3 USD"}, {"account": "Assets:Checking"}],
        }
    ]
    result = _bea(tmp_path, "transactions", "--from", "-", stdin=json.dumps(rows))

    # Exit 1, like every row the bulk validation refuses (a zero divisor too).
    assert result.returncode == 1, result.stdout + result.stderr
    assert _ledger(tmp_path) == LEDGER
    message = " ".join(result.stderr.split())
    assert "amount '100/3 USD' does not divide exactly" in message
    assert "such as 33.33 USD" in message


def test_a_balance_amount_that_does_not_divide_exactly_is_refused(tmp_path: Path) -> None:
    result = _bea(tmp_path, "balance", "-a", "Assets:Checking", "--date", "2026-01-11", "--amount", "100/3 USD")

    assert result.returncode == 2, result.stdout + result.stderr
    assert _ledger(tmp_path) == LEDGER
    message = " ".join(result.stderr.split())
    assert "--amount '100/3 USD' does not divide exactly" in message
    assert "such as 33.33 USD" in message


def test_exact_arithmetic_is_still_written_evaluated(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "transaction",
        "--date",
        "2026-01-10",
        "Dinner",
        "-p",
        "Expenses:Dining 10/4 USD",
        "-p",
        "Expenses:Dining 84/2 USD",
        "-p",
        "Expenses:Dining (2+3)*4 USD",
        "-p",
        "Assets:Checking",
    )

    assert result.returncode == 0, result.stdout + result.stderr
    written = [" ".join(line.split()) for line in _ledger(tmp_path).removeprefix(LEDGER).strip().splitlines()]
    assert written[1:4] == ["Expenses:Dining 2.5 USD", "Expenses:Dining 42 USD", "Expenses:Dining 20 USD"]


def test_a_total_price_over_three_units_is_still_written(tmp_path: Path) -> None:
    """The grammar divides a `@@` total into a repeating unit price; only the units are judged."""
    result = _split(tmp_path, "Assets:Broker 3 HOOL @@ 100 USD")

    assert result.returncode == 0, result.stdout + result.stderr
    assert "Assets:Broker 3 HOOL @@ 100 USD" in " ".join(_ledger(tmp_path).split())


@pytest.mark.parametrize("units", ["1/3", "-100/3", "100/3*3", "2/7"])
def test_parse_exact_marks_a_quotient_that_does_not_terminate(units: str) -> None:
    entries, errors, _ = parse_exact(f'2026-01-02 * "x"\n  Assets:A {units} USD\n  Assets:B\n')

    assert not errors
    assert isinstance(entries[0].postings[0].units.number, Repeating)


@pytest.mark.parametrize("units", ["10/4", "84/2", "(2+3)*4", "-12345678901.123456789012345678", "1/1024"])
def test_parse_exact_leaves_exact_numbers_unmarked(units: str) -> None:
    entries, errors, _ = parse_exact(f'2026-01-02 * "x"\n  Assets:A {units} USD\n  Assets:B\n')

    assert not errors
    number = entries[0].postings[0].units.number
    assert type(number) is Decimal


def test_parse_exact_marks_a_divided_total_price_but_not_its_units() -> None:
    entries, errors, _ = parse_exact('2026-01-02 * "x"\n  Assets:A 3 HOOL @@ 100 USD\n  Assets:B\n')

    assert not errors
    posting = entries[0].postings[0]
    assert type(posting.units.number) is Decimal
    assert isinstance(posting.price.number, Repeating)
