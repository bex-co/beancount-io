"""Bulk input accepts only the number spellings `add transaction` accepts (w1/110).

`Decimal()` reads `1_000`, Arabic-Indic and full-width digits, so bulk rows
wrote `1000`, `45` and `10` where `--posting` refuses `Invalid token`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from bea_engine.ledger.models import Amount

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Expenses:Food USD\n2026-01-01 open Assets:Cash USD\n2026-01-01 open Assets:Brokerage HOOL\n"


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
        timeout=60,
    )


def _row(posting: dict[str, Any], meta: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "date": "2026-02-01",
        "narration": "x",
        "meta": meta or {},
        "postings": [{"account": "Expenses:Food", **posting}, {"account": "Assets:Cash"}],
    }


def _hool(cost: str = "10", price: str = "11") -> dict[str, Any]:
    return {
        "date": "2026-02-01",
        "narration": "x",
        "postings": [
            {
                "account": "Assets:Brokerage",
                "units": {"number": "1", "currency": "HOOL"},
                "cost": {"number": cost, "currency": "USD"},
                "price": {"number": price, "currency": "USD"},
            },
            {"account": "Assets:Cash"},
        ],
    }


ONE_USD = {"amount": "1 USD"}


@pytest.mark.parametrize(
    ("row", "path"),
    [
        (_row({"amount": "1_000 USD"}), "postings.0.units.number"),
        (_row({"units": {"number": "٤٥", "currency": "USD"}}), "postings.0.units.number"),
        (_row({"units": {"number": "１０", "currency": "USD"}}), "postings.0.units.number"),
        (_row({"units": {"number": "1_000", "currency": "USD"}}), "postings.0.units.number"),
        (_hool(cost="1_0"), "postings.0.cost.number"),
        (_hool(price="１１"), "postings.0.price.number"),
        (_row(ONE_USD, {"qty": {"kind": "number", "value": "1_000"}}), "meta.qty"),
        (_row(ONE_USD, {"qty": {"kind": "number", "value": "٤٥"}}), "meta.qty"),
        (_row(ONE_USD, {"fee": {"kind": "amount", "number": "1e3", "currency": "USD"}}), "meta.fee"),
    ],
    ids=[
        "shorthand-underscore",
        "arabic-indic",
        "full-width",
        "units-underscore",
        "cost",
        "price",
        "meta-number-underscore",
        "meta-number-arabic",
        "meta-amount-exponent",
    ],
)
def test_non_ascii_decimal_spellings_are_refused(tmp_path: Path, row: dict[str, Any], path: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([row], ensure_ascii=False), encoding="utf-8")

    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 1, result.stdout
    details = json.loads(result.stderr)["error"]["details"]
    assert any(d.startswith(f"Row 1, {path}:") for d in details), details
    assert ledger.read_text() == LEDGER


def test_plain_ascii_decimals_still_write(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(
        json.dumps(
            [
                _row({"amount": "1000 USD"}, {"qty": {"kind": "number", "value": "1000"}}),
                _row({"units": {"number": "-12.50", "currency": "USD"}}),
                _hool(),
            ]
        )
    )

    result = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "1000 USD" in text and "qty: 1000" in text and "-12.50 USD" in text and "{10 USD} @ 11 USD" in text


def test_loaded_decimals_still_build_models() -> None:
    """The rule is for text input; a Decimal from a loaded ledger is not re-spelled."""
    from decimal import Decimal

    assert Amount(number=Decimal("1E-8"), currency="USD").number == Decimal("1E-8")
