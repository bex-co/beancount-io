"""`bea-engine report --kind capital-gains`: realized gain/loss per reduction (w22/m4/t001).

A closed lot is a reducing posting that carries both cost and price;
FIFO vs specific-lot is the ledger's own booking, read from the
matched cost. Proceeds and basis stay in their own currencies and the
gain is their difference only when those agree; the one-year boundary
is a bare day count.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

CLI_ROOT = Path(__file__).resolve().parents[1]

FIFO = """\
option "operating_currency" "USD"
option "booking_method" "FIFO"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Gains USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Checking
2026-02-02 * "Buy"
  Assets:Brokerage  10 VTI {120 USD}
  Assets:Checking
2026-03-02 * "Sell"
  Assets:Brokerage  -15 VTI {} @ 150 USD
  Assets:Checking  2250 USD
  Income:Gains
"""

SPECIFIC = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Brokerage USD,VTI
2024-01-01 open Assets:IRA USD,VTI
2024-01-01 open Assets:Checking USD
2024-01-01 open Income:Gains USD
2024-01-15 * "Buy old"
  Assets:Brokerage  10 VTI {100 USD, 2024-01-15}
  Assets:Checking
2026-01-02 * "Buy new"
  Assets:Brokerage  10 VTI {150 USD, 2026-01-02}
  Assets:Checking
2026-03-02 * "Sell specific new lot"
  Assets:Brokerage  -4 VTI {150 USD, 2026-01-02} @ 160 USD
  Assets:Checking  640 USD
  Income:Gains
2026-04-02 * "Transfer to IRA"
  Assets:IRA  2 VTI {100 USD, 2024-01-15}
  Assets:Brokerage
2026-05-02 * "Sell old lot"
  Assets:Brokerage  -3 VTI {100 USD, 2024-01-15} @ 160 USD
  Assets:Checking  480 USD
  Income:Gains
"""

LOSS = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Gains USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-03-02 * "Sell at a loss"
  Assets:Brokerage  -10 VTI {150 USD} @ 140 USD
  Assets:Checking  1400 USD
  Income:Gains
"""


def _engine(ledger: Path, *args: str) -> dict[str, Any]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            "capital-gains",
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True, payload
    return payload["data"]


def _engine_raw(ledger: Path, *args: str) -> tuple[int, dict[str, Any]]:
    proc = subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            "report",
            "--file",
            str(ledger),
            "--kind",
            "capital-gains",
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    return proc.returncode, json.loads(proc.stdout)


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def test_fifo_attributes_oldest_first(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, FIFO))
    rows = data["rows"]
    assert [(row["acquired"], row["quantity"], row["proceeds"], row["basis"], row["gain"]) for row in rows] == [
        (
            "2026-01-02",
            {"number": "10", "currency": "VTI"},
            {"number": "1500", "currency": "USD"},
            {"number": "1000", "currency": "USD"},
            {"number": "500", "currency": "USD"},
        ),
        (
            "2026-02-02",
            {"number": "5", "currency": "VTI"},
            {"number": "750", "currency": "USD"},
            {"number": "600", "currency": "USD"},
            {"number": "150", "currency": "USD"},
        ),
    ]
    assert data["totals"] == {"one_year_or_less": {"USD": "650"}, "more_than_one_year": {}, "holding_unknown": {}}


def test_specific_lot_attributes_the_named_lot(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, SPECIFIC))
    rows = data["rows"]
    # The transfer reduces a lot without a price: a movement, not a sale.
    assert len(rows) == 2
    first, second = rows
    assert first["acquired"] == "2026-01-02"
    assert first["basis"] == {"number": "600", "currency": "USD"}
    assert first["gain"] == {"number": "40", "currency": "USD"}
    assert first["held_days"] == 59
    assert first["long_held"] is False
    assert second["acquired"] == "2024-01-15"
    assert second["held_days"] == 838
    assert second["long_held"] is True
    assert second["gain"] == {"number": "180", "currency": "USD"}
    assert data["totals"] == {
        "one_year_or_less": {"USD": "40"},
        "more_than_one_year": {"USD": "180"},
        "holding_unknown": {},
    }


def test_loss_is_a_negative_gain(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, LOSS))
    (row,) = data["rows"]
    assert row["proceeds"] == {"number": "1400", "currency": "USD"}
    assert row["basis"] == {"number": "1500", "currency": "USD"}
    assert row["gain"] == {"number": "-100", "currency": "USD"}
    assert data["totals"]["one_year_or_less"] == {"USD": "-100"}


def test_date_bounds_are_inclusive(tmp_path: Path) -> None:
    ledger = _write(tmp_path, SPECIFIC)
    assert len(_engine(ledger, "--from-date", "2026-03-02", "--to-date", "2026-03-02")["rows"]) == 1
    assert len(_engine(ledger, "--from-date", "2026-03-03")["rows"]) == 1
    assert _engine(ledger, "--to-date", "2026-03-01")["rows"] == []
    assert len(_engine(ledger)["rows"]) == 2


def test_invalid_bounds_are_refused(tmp_path: Path) -> None:
    ledger = _write(tmp_path, FIFO)
    code, payload = _engine_raw(ledger, "--from-date", "2026-13-01")
    assert code == 2
    assert payload["error"]["message"] == "Invalid --from-date '2026-13-01'. Use YYYY-MM-DD."
    code, payload = _engine_raw(ledger, "--from-date", "2026-05-01", "--to-date", "2026-01-01")
    assert code == 2
    assert payload["error"]["message"] == "--from-date '2026-05-01' is after --to-date '2026-01-01'."


def test_conversion_is_refused(tmp_path: Path) -> None:
    code, payload = _engine_raw(_write(tmp_path, FIFO), "--conversion", "USD")
    assert code == 2
    assert payload["error"]["message"] == (
        "capital-gains reports in each lot's cost currency and takes no --conversion."
    )


def test_account_filter_prunes(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, SPECIFIC), "--account", "Assets:IRA")
    assert data["rows"] == []
