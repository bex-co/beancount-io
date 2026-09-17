"""The transaction table carries cost and price, not bare units (w3/366)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker HOOL
2024-01-01 open Income:Gains USD

2024-02-01 * "Buy at cost"
  Assets:Broker    5 HOOL {50.00 USD, "lot-a"}
  Assets:Cash   -250.00 USD

2024-03-01 * "Buy at unit price"
  Assets:Broker    1 HOOL @ 60.00 USD
  Assets:Cash    -60.00 USD

2024-04-01 * "Buy at total price"
  Assets:Broker    2 HOOL @@ 130.00 USD
  Assets:Cash   -130.00 USD

2024-05-01 * "Plain cash move"
  Assets:Cash    -10.00 USD
  Income:Gains    10.00 USD
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
        timeout=60,
    )


def _row(tmp_path: Path, narration: str, *args: str) -> str:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "list", "transaction", "--search", narration, *args)
    assert result.returncode == 0, result.stderr
    rows = [line for line in result.stdout.splitlines() if line.startswith("2024-")]
    assert len(rows) == 1, result.stdout
    return rows[0]


def test_cost_basis_shows_with_its_lot_date_and_label(tmp_path: Path) -> None:
    row = _row(tmp_path, "Buy at cost")
    assert 'Assets:Broker: 5 HOOL {50.00 USD, 2024-02-01, "lot-a"}' in row


def test_unit_price_shows(tmp_path: Path) -> None:
    assert "Assets:Broker: 1 HOOL @ 60.00 USD" in _row(tmp_path, "Buy at unit price")


def test_total_price_shows_as_the_per_unit_price_booking_kept(tmp_path: Path) -> None:
    # `@@ 130.00 USD` for 2 HOOL is booked as `@ 65.00 USD`; the table shows what
    # the ledger holds, matching --details.
    assert "Assets:Broker: 2 HOOL @ 65.00 USD" in _row(tmp_path, "Buy at total price")


def test_plain_postings_are_unchanged(tmp_path: Path) -> None:
    row = _row(tmp_path, "Plain cash move")
    assert "Assets:Cash: -10.00 USD; Income:Gains: 10.00 USD" in row
    assert "{" not in row and "@" not in row


def test_the_table_agrees_with_details(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    details = _bea(tmp_path, "--file", str(ledger), "list", "transaction", "--search", "Buy at cost", "--details")
    assert details.returncode == 0, details.stderr
    assert '5 HOOL {50.00 USD, 2024-02-01, "lot-a"}' in details.stdout
    assert '5 HOOL {50.00 USD, 2024-02-01, "lot-a"}' in _row(tmp_path, "Buy at cost")
