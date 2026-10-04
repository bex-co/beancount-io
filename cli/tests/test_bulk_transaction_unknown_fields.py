"""Bulk transaction JSON must reject unknown top-level fields (w3/225)."""

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


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_narrative_typo_is_rejected_not_written(ledger: Path) -> None:
    rows = ledger.parent / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-20",
                    "narrative": "Should be narration",
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "units": {"number": "1.00", "currency": "USD"}},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    before = ledger.read_text()
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert any("narrative" in detail and "Extra inputs" in detail for detail in error["details"])
    assert ledger.read_text() == before


def test_documented_narration_row_still_writes(ledger: Path) -> None:
    rows = ledger.parent / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-03-20",
                    "narration": "Groceries",
                    "postings": [
                        {"account": "Expenses:Food:Groceries", "units": {"number": "1.00", "currency": "USD"}},
                        {"account": "Assets:Bank:Checking"},
                    ],
                }
            ]
        )
    )
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert '2024-03-20 * "Groceries"' in ledger.read_text()


LOT_LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Brokerage AAPL "FIFO"
2026-01-01 open Income:Gains USD
2026-01-02 * "buy cheap"
  Assets:Brokerage  10 AAPL {100 USD}
  Assets:Cash
2026-01-03 * "buy dear"
  Assets:Brokerage  10 AAPL {150 USD}
  Assets:Cash
"""


def _sale(cost: dict[str, object], price: dict[str, object] | None = None) -> list[dict[str, object]]:
    lot: dict[str, object] = {
        "account": "Assets:Brokerage",
        "units": {"number": "-10", "currency": "AAPL"},
        "cost": {"currency": "USD", **cost},
        "price": {"number": "160", "currency": "USD", **(price or {})},
    }
    cash = {"account": "Assets:Cash", "amount": "1600 USD"}
    return [{"date": "2026-02-01", "narration": "sell", "postings": [lot, cash, {"account": "Income:Gains"}]}]


@pytest.mark.parametrize(
    ("rows", "path"),
    [
        (_sale({"number_per": "150"}), "postings.0.cost.number_per"),
        (_sale({"number": "150", "lot_date": "2026-01-03"}), "postings.0.cost.lot_date"),
        (_sale({"number": "150", "merge": True}), "postings.0.cost.merge"),
        (_sale({"number": "150"}, {"total": True}), "postings.0.price.total"),
        (
            [
                {
                    "date": "2026-02-01",
                    "narration": "x",
                    "postings": [
                        {"account": "Assets:Cash", "units": {"number": "5", "currency": "USD", "x": 1}},
                        {"account": "Income:Gains"},
                    ],
                }
            ],
            "postings.0.units.x",
        ),
    ],
    ids=["number_per", "lot_date", "merge", "price-total", "units"],
)
def test_nested_unknown_keys_are_refused_with_their_path(
    tmp_path: Path, rows: list[dict[str, object]], path: str
) -> None:
    """w1/108: a dropped `number_per` used to leave `{USD}`, and FIFO sold the other lot."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LOT_LEDGER)
    payload = tmp_path / "rows.json"
    payload.write_text(json.dumps(rows))

    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(payload))

    assert result.returncode == 1, result.stdout
    details = json.loads(result.stderr)["error"]["details"]
    assert f"Row 1, {path}: Extra inputs are not permitted" in details
    assert ledger.read_text() == LOT_LEDGER


def test_numeric_cost_date_is_refused(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LOT_LEDGER)
    payload = tmp_path / "rows.json"
    payload.write_text(json.dumps(_sale({"number": "150", "date": 1767398400})))

    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(payload))

    assert result.returncode == 1, result.stdout
    details = json.loads(result.stderr)["error"]["details"]
    assert any(d.startswith("Row 1, postings.0.cost.date:") and "YYYY-MM-DD" in d for d in details)
    assert ledger.read_text() == LOT_LEDGER


def test_the_documented_cost_keys_still_sell_the_named_lot(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LOT_LEDGER)
    payload = tmp_path / "rows.json"
    payload.write_text(json.dumps(_sale({"number": "150", "date": "2026-01-03", "label": None})))

    result = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(payload))

    assert result.returncode == 0, result.stderr
    assert "-10 AAPL {150 USD, 2026-01-03} @ 160 USD" in ledger.read_text()
