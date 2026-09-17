"""A `@@` total price is written back as a total, never divided (w3/309)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from bea_engine.amounts import split_total_price
from bea_engine.ledger.models import TransactionDirective

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Brokerage
2024-01-01 open Expenses:Food
2024-01-01 open Equity:Opening-Balances
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


def test_flag_total_price_writes_the_exact_total(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-23",
        "--narration",
        "buy",
        "--posting",
        "Assets:Brokerage 3 HOOL @@ 100 USD",
        "--posting",
        "Equity:Opening-Balances",
    )

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "3 HOOL @@ 100 USD" in text
    assert "33.333" not in text

    check = _bea(ledger.parent, "--file", str(ledger), "check")
    assert check.returncode == 0, check.stderr


def test_total_price_survives_beside_a_cost(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-23",
        "--narration",
        "buy",
        "--posting",
        "Assets:Brokerage 3 HOOL {10 USD} @@ 30 USD",
        "--posting",
        "Equity:Opening-Balances",
    )

    assert result.returncode == 0, result.stderr
    assert "3 HOOL {10 USD} @@ 30 USD" in ledger.read_text()


def test_unit_price_is_untouched(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-23",
        "--narration",
        "buy",
        "--posting",
        "Assets:Brokerage 3 HOOL @ 10 USD",
        "--posting",
        "Equity:Opening-Balances",
    )

    assert result.returncode == 0, result.stderr
    assert "3 HOOL @ 10 USD" in ledger.read_text()
    assert "@@" not in ledger.read_text()


def test_bulk_total_price_writes_the_exact_total(ledger: Path) -> None:
    rows = ledger.parent / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-23",
                    "narration": "buy",
                    "postings": [
                        {
                            "account": "Assets:Brokerage",
                            "units": {"number": "3", "currency": "HOOL"},
                            "price_total": {"number": "100", "currency": "USD"},
                        },
                        {"account": "Equity:Opening-Balances"},
                    ],
                }
            ]
        )
    )

    result = _bea(ledger.parent, "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "3 HOOL @@ 100 USD" in text
    assert "33.333" not in text


def test_price_and_price_total_are_mutually_exclusive() -> None:
    posting: dict[str, Any] = {
        "account": "Assets:Brokerage",
        "units": {"number": "3", "currency": "HOOL"},
        "price": {"number": "10", "currency": "USD"},
        "price_total": {"number": "100", "currency": "USD"},
    }
    row = {"date": "2024-03-23", "narration": "buy", "postings": [posting]}

    with pytest.raises(ValidationError, match="price_total"):
        TransactionDirective.model_validate(row)


def test_json_answer_carries_no_render_stash(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-23",
        "--narration",
        "buy",
        "--posting",
        "Assets:Brokerage 3 HOOL @@ 100 USD",
        "--posting",
        "Equity:Opening-Balances",
    )

    assert result.returncode == 0, result.stderr
    directive = json.loads(result.stdout)["data"]["directive"]
    assert "__bea_total_price__" not in json.dumps(directive)
    assert directive["postings"][0]["meta"] == {}


@pytest.mark.parametrize(
    ("text", "total"),
    [
        ("3 HOOL @@ 100 USD", ("100", "USD")),
        ("Assets:Brokerage 3 HOOL @@ 100 USD", ("100", "USD")),
        ("3 HOOL {10 USD} @@ 30 USD", ("30", "USD")),
        ("3 HOOL @@ -100 USD", ("-100", "USD")),
    ],
)
def test_split_total_price_reads_plain_totals(text: str, total: tuple[str, str]) -> None:
    assert split_total_price(text) == total


@pytest.mark.parametrize(
    "text",
    [
        "3 HOOL @ 10 USD",
        "3 HOOL",
        "Assets:X 3 HOOL @ 10 USD ; costs @@ 5 EUR one day",
        'Assets:X 3 HOOL @ 10 USD "memo @@ 1 USD"',
        "3 HOOL @@",
        "3 HOOL @@ USD",
        "3 HOOL @@ 1e3 USD",
    ],
)
def test_split_total_price_ignores_non_totals(text: str) -> None:
    """Quoted, commented, and malformed `@@` spellings fall back to the unit price, never a misread total."""
    assert split_total_price(text) is None


def test_shorthand_total_price_parses_without_a_subprocess() -> None:
    row = {
        "date": "2024-03-23",
        "narration": "buy",
        "postings": [
            {"account": "Assets:Brokerage", "amount": "3 HOOL @@ 100 USD"},
            {"account": "Equity:Opening-Balances"},
        ],
    }

    [posting, _] = TransactionDirective.model_validate(row).postings

    assert posting.units is not None and posting.units.number == Decimal("3")
    assert posting.price is None
    assert posting.price_total is not None
    assert (posting.price_total.number, posting.price_total.currency) == (Decimal("100"), "USD")
