"""`bea report capital-gains` text and JSON (w22/m4/t002).

The range bounds both the rows and the bucketed totals; text renders
the shared heading, one row per closed lot, and the one-year buckets.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from tests.report_helpers import bea, write_ledger

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Brokerage USD,VTI
2024-01-01 open Assets:Checking USD
2024-01-01 open Income:Gains USD
2024-01-15 * "Buy old"
  Assets:Brokerage  10 VTI {100 USD, 2024-01-15}
  Assets:Checking
2026-01-02 * "Buy new"
  Assets:Brokerage  10 VTI {150 USD, 2026-01-02}
  Assets:Checking
2026-03-02 * "Sell new"
  Assets:Brokerage  -4 VTI {150 USD, 2026-01-02} @ 160 USD
  Assets:Checking  640 USD
  Income:Gains
2026-05-02 * "Sell old"
  Assets:Brokerage  -3 VTI {100 USD, 2024-01-15} @ 160 USD
  Assets:Checking  480 USD
  Income:Gains
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return bea(list(args), tmp_path)


def _write(tmp_path: Path, text: str) -> Path:
    return write_ledger(tmp_path, text)


def test_capital_gains_text_table(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "capital-gains")
    assert proc.returncode == 0, proc.stderr
    assert "Capital Gains — 2024-01-15 through 2026-05-02" in proc.stdout
    assert "Valuation: units; account: all" in proc.stdout
    assert "59 days (short)" in proc.stdout
    assert "838 days (long)" in proc.stdout
    assert "One year or less:" in proc.stdout
    assert "More than one year:" in proc.stdout
    assert "Holding unknown" not in proc.stdout


def test_capital_gains_range_bounds_rows_and_totals(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "report",
        "capital-gains",
        "--from-date",
        "2026-05-01",
    )
    assert proc.returncode == 0, proc.stderr
    assert "838 days (long)" in proc.stdout
    assert "59 days (short)" not in proc.stdout
    assert "180 USD" in proc.stdout
    assert "40 USD" not in proc.stdout


def test_capital_gains_json(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "capital-gains")
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert "display_precision" not in payload["data"]
    rows = payload["data"]["rows"]
    assert [(row["sold"], row["gain"]) for row in rows] == [
        ("2026-03-02", {"number": "40", "currency": "USD"}),
        ("2026-05-02", {"number": "180", "currency": "USD"}),
    ]
    assert payload["data"]["totals"]["more_than_one_year"] == {"USD": "180"}


def test_capital_gains_empty(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "capital-gains", "--to-date", "2025-01-01")
    assert proc.returncode == 0, proc.stderr
    assert "No sales." in proc.stdout


def test_capital_gains_refuses_bad_range(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "capital-gains", "--from-date", "not-a-date")
    assert proc.returncode != 0
    assert "Invalid --from-date" in proc.stderr
