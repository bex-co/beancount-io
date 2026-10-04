"""Bulk JSON meta may use bare numbers; coerce to Decimal (w3/230)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Food:Groceries USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
"""


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


def test_bare_json_number_meta_writes(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-21",
                    "narration": "tm",
                    "meta": {"count": 1, "rate": 1.5, "cleared": True},
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "amount": "1 USD"},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 0, result.stderr
    assert "Unexpected value" not in result.stderr
    text = ledger.read_text()
    assert "count:" in text and "rate:" in text and "cleared:" in text


def _row(meta: dict[str, object], posting_meta: dict[str, object] | None = None) -> dict[str, object]:
    posting: dict[str, object] = {"account": "Expenses:Food:Groceries", "amount": "1 USD"}
    if posting_meta is not None:
        posting["meta"] = posting_meta
    return {
        "date": "2024-03-21",
        "narration": "typed",
        "meta": meta,
        "postings": [posting, {"account": "Assets:Bank:Checking"}],
    }


FLOAT_AMOUNT = {"kind": "amount", "number": 0.1, "currency": "USD"}
FLOAT_NUMBER = {"kind": "number", "value": 0.1}
GOOD_ROW = _row({"ok": {"kind": "number", "value": "2"}})


@pytest.mark.parametrize(
    ("row", "location"),
    [
        (_row({"rate": FLOAT_AMOUNT}), "Row 2, meta"),
        (_row({"rate": FLOAT_NUMBER}), "Row 2, meta"),
        (_row({}, {"rate": FLOAT_AMOUNT}), "Row 2, postings.0.meta"),
        (_row({}, {"rate": FLOAT_NUMBER}), "Row 2, postings.0.meta"),
    ],
    ids=["txn-amount", "txn-number", "posting-amount", "posting-number"],
)
@pytest.mark.parametrize("into", [None, "parts/new.bean"], ids=["main", "into"])
def test_typed_float_meta_is_refused_without_writing(
    tmp_path: Path, row: dict[str, object], location: str, into: str | None
) -> None:
    """A typed float would persist its binary expansion (w1/045); refuse the batch instead."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([GOOD_ROW, row]))
    args = ["--json", "--file", str(ledger), "add", "transactions", "--from", str(rows)]
    if into is not None:
        args += ["--into", into]
    result = _bea(tmp_path, *args)
    assert result.returncode != 0, result.stdout
    error = json.loads(result.stdout or result.stderr)["error"]
    assert error["result"]["rejected_rows"] == [1]
    detail = next(d for d in error["details"] if d.startswith(location))
    assert "'rate'" in detail and "'0.1'" in detail
    assert ledger.read_text() == LEDGER
    assert not (tmp_path / "parts").exists()


def test_typed_float_meta_row_is_rejected_under_partial(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([GOOD_ROW, _row({"rate": FLOAT_AMOUNT})]))
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows), "--partial")
    assert result.returncode != 0
    text = ledger.read_text()
    assert "ok: 2" in text
    assert "rate:" not in text


def test_typed_decimal_string_meta_persists_exactly(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    typed = {"rate": {"kind": "amount", "number": "0.1", "currency": "USD"}, "count": {"kind": "number", "value": 3}}
    rows.write_text(json.dumps([_row(typed, {"share": {"kind": "number", "value": "0.1"}})]))
    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 0, result.stdout + result.stderr
    text = ledger.read_text()
    assert "rate: 0.1 USD" in text
    assert "count: 3" in text
    assert "share: 0.1" in text
