"""add transaction cost JSON must round-trip into add transactions (w3/240)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Investments:HOOL HOOL
2024-01-01 open Equity:Opening-Balances USD
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


def test_add_transaction_cost_round_trips_to_bulk(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-02",
        "--narration",
        "buy",
        "--posting",
        "Assets:Investments:HOOL 5 HOOL {10.00 USD}",
        "--posting",
        "Assets:Bank:Checking -50 USD",
    )
    assert added.returncode == 0, added.stderr
    directive = json.loads(added.stdout)["data"]["directive"]
    cost = directive["postings"][0]["cost"]
    assert "number" in cost
    assert "number_per" not in cost
    assert cost["number"] == "10.00"
    assert cost["currency"] == "USD"

    # Fresh ledger so bulk add is not a duplicate of the first write.
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    row = {
        "date": directive["date"],
        "narration": directive["narration"],
        "postings": directive["postings"],
    }
    rows.write_text(json.dumps([row]))
    bulk = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))
    assert bulk.returncode == 0, bulk.stderr
    assert "{10.00 USD}" in ledger.read_text() or "{10 USD}" in ledger.read_text()


def _bulk(tmp_path: Path, ledger: Path, postings: list[dict]) -> subprocess.CompletedProcess[str]:
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([{"date": "2024-03-02", "narration": "bulk", "postings": postings}]))
    return _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))


def test_bulk_cost_shorthand_writes_the_exact_lot(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bulk(
        tmp_path,
        ledger,
        [
            {"account": "Assets:Investments:HOOL", "amount": "5 HOOL {10.00 USD}"},
            {"account": "Assets:Bank:Checking", "amount": "-50 USD"},
        ],
    )

    assert result.returncode == 0, result.stderr
    assert "5 HOOL {10.00 USD}" in ledger.read_text()


def test_bulk_shorthand_accepts_cost_date_label_and_price(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bulk(
        tmp_path,
        ledger,
        [
            {"account": "Assets:Investments:HOOL", "amount": '5 HOOL {10 USD, 2024-01-15, "lot-a"} @ 10 USD'},
            {"account": "Assets:Bank:Checking", "amount": "-50 USD"},
        ],
    )

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert '{10 USD, 2024-01-15, "lot-a"}' in text
    assert "@ 10 USD" in text


def test_bulk_shorthand_total_price_writes_the_exact_total(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bulk(
        tmp_path,
        ledger,
        [
            {"account": "Assets:Investments:HOOL", "amount": "3 HOOL @@ 100 USD"},
            {"account": "Equity:Opening-Balances"},
        ],
    )

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "@@ 100 USD" in text
    assert "33.333" not in text


def test_bulk_shorthand_garbage_names_the_accepted_forms(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bulk(
        tmp_path,
        ledger,
        [
            {"account": "Assets:Investments:HOOL", "amount": "lots of words here"},
            {"account": "Assets:Bank:Checking"},
        ],
    )

    assert result.returncode == 1, result.stderr
    assert "posting fragment" in result.stderr
    assert "'-30 USD'" in result.stderr
    assert ledger.read_text() == LEDGER


def test_bulk_total_cost_shorthand_points_at_per_unit_cost(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bulk(
        tmp_path,
        ledger,
        [
            {"account": "Assets:Investments:HOOL", "amount": "3 HOOL {{300 USD}}"},
            {"account": "Assets:Bank:Checking"},
        ],
    )

    assert result.returncode == 1, result.stderr
    assert "per-unit cost" in result.stderr
    assert ledger.read_text() == LEDGER


def test_priced_posting_round_trips_to_bulk(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    buy = [
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "buy",
        "--posting",
        "Assets:Investments:HOOL 5 HOOL {10.00 USD}",
        "--posting",
        "Assets:Bank:Checking -50 USD",
    ]
    assert _bea(tmp_path, *buy).returncode == 0
    sale = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-02",
        "--narration",
        "sell",
        "--posting",
        "Assets:Investments:HOOL -5 HOOL {10.00 USD} @ 12 USD",
        "--posting",
        "Assets:Bank:Checking 60 USD",
        "--posting",
        "Equity:Opening-Balances -10 USD",
    )
    assert sale.returncode == 0, sale.stderr
    directive = json.loads(sale.stdout)["data"]["directive"]

    other = tmp_path / "other.bean"
    other.write_text(LEDGER)
    assert _bea(tmp_path, *[*buy[:1], str(other), *buy[2:]]).returncode == 0
    rows = tmp_path / "rows.json"
    row = {"date": directive["date"], "narration": directive["narration"], "postings": directive["postings"]}
    rows.write_text(json.dumps([row]))
    bulk = _bea(tmp_path, "--file", str(other), "add", "transactions", "--from", str(rows))

    assert bulk.returncode == 0, bulk.stderr
    assert "@ 12 USD" in other.read_text()
