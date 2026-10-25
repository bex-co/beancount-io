"""Capital-gains fixtures: partial lots, multi-currency, and the booked tie-out (w22/m4/t003).

The milestone fixture — three buys and two partial sells — reports the
expected per-lot figures, and every fixture's totals equal the booked
`Income:CapitalGains` postings for the same range, per currency.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

CLI_ROOT = Path(__file__).resolve().parents[1]

# Three buys and two partial sells (FIFO): the first sale closes the
# January lot and halves the February lot; the second sale closes the
# rest of February and halves the March lot.
PARTIAL = """\
option "operating_currency" "USD"
option "booking_method" "FIFO"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:CapitalGains USD
2026-01-05 * "Buy"
  Assets:Brokerage  10 VTI {100 USD}
  Assets:Checking
2026-02-05 * "Buy"
  Assets:Brokerage  10 VTI {120 USD}
  Assets:Checking
2026-03-05 * "Buy"
  Assets:Brokerage  10 VTI {140 USD}
  Assets:Checking
2026-04-05 * "Sell fifteen"
  Assets:Brokerage  -15 VTI {} @ 150 USD
  Assets:Checking  2250 USD
  Income:CapitalGains
2026-05-05 * "Sell ten"
  Assets:Brokerage  -10 VTI {} @ 160 USD
  Assets:Checking  1600 USD
  Income:CapitalGains
"""

MULTICURRENCY = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage EUR,VTI,USD
2026-01-01 open Assets:Checking USD,EUR
2026-01-01 open Income:CapitalGains USD,EUR
2026-01-02 * "Buy dollars"
  Assets:Brokerage  10 VTI {150 USD, 2026-01-02}
  Assets:Checking
2026-01-03 * "Buy euros"
  Assets:Brokerage  10 VTI {140 EUR, 2026-01-03}
  Assets:Checking
2026-03-02 * "Sell dollars"
  Assets:Brokerage  -4 VTI {150 USD, 2026-01-02} @ 160 USD
  Assets:Checking  640 USD
  Income:CapitalGains
2026-03-03 * "Sell euros"
  Assets:Brokerage  -6 VTI {140 EUR, 2026-01-03} @ 150 EUR
  Assets:Checking  900 EUR
  Income:CapitalGains
"""


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(CLI_ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _engine(ledger: Path, tmp_path: Path, *args: str) -> dict[str, Any]:
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
        env=_env(tmp_path),
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


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def _booked_gains(ledger: Path, tmp_path: Path, year: str) -> dict[str, Decimal]:
    """Negated `Income:CapitalGains` balances for the year, per currency."""
    proc = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--file",
            str(ledger),
            "--json",
            "balance",
            "CapitalGains",
            "--time",
            year,
            "--conversion",
            "units",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]

    def find(node: dict[str, Any]) -> dict[str, Any] | None:
        if node["account"] == "Income:CapitalGains":
            return node
        for child in node["children"]:
            found = find(child)
            if found is not None:
                return found
        return None

    node = find(data["income"])
    assert node is not None
    return {currency: -Decimal(number) for currency, number in node["balance_children"].items()}


def _reported_totals(data: dict[str, Any]) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = {}
    for bucket in ("one_year_or_less", "more_than_one_year", "holding_unknown"):
        for currency, number in data["totals"][bucket].items():
            totals[currency] = totals.get(currency, Decimal(0)) + Decimal(number)
    return totals


def test_partial_sales_split_lots(tmp_path: Path) -> None:
    data = _engine(_write(tmp_path, PARTIAL), tmp_path)
    rows = data["rows"]
    assert [
        (row["acquired"], row["sold"], row["quantity"], row["proceeds"], row["basis"], row["gain"]) for row in rows
    ] == [
        (
            "2026-01-05",
            "2026-04-05",
            {"number": "10", "currency": "VTI"},
            {"number": "1500", "currency": "USD"},
            {"number": "1000", "currency": "USD"},
            {"number": "500", "currency": "USD"},
        ),
        (
            "2026-02-05",
            "2026-04-05",
            {"number": "5", "currency": "VTI"},
            {"number": "750", "currency": "USD"},
            {"number": "600", "currency": "USD"},
            {"number": "150", "currency": "USD"},
        ),
        (
            "2026-02-05",
            "2026-05-05",
            {"number": "5", "currency": "VTI"},
            {"number": "800", "currency": "USD"},
            {"number": "600", "currency": "USD"},
            {"number": "200", "currency": "USD"},
        ),
        (
            "2026-03-05",
            "2026-05-05",
            {"number": "5", "currency": "VTI"},
            {"number": "800", "currency": "USD"},
            {"number": "700", "currency": "USD"},
            {"number": "100", "currency": "USD"},
        ),
    ]
    assert data["totals"]["one_year_or_less"] == {"USD": "950"}


def test_partial_sales_tie_to_booked_gains(tmp_path: Path) -> None:
    ledger = _write(tmp_path, PARTIAL)
    data = _engine(ledger, tmp_path, "--from-date", "2026-01-01", "--to-date", "2026-12-31")
    assert _reported_totals(data) == _booked_gains(ledger, tmp_path, "2026")
    assert _reported_totals(data) == {"USD": Decimal("950")}


def test_multicurrency_rows_stay_native_and_tie_out(tmp_path: Path) -> None:
    ledger = _write(tmp_path, MULTICURRENCY)
    data = _engine(ledger, tmp_path)
    rows = data["rows"]
    assert [(row["proceeds"], row["basis"], row["gain"]) for row in rows] == [
        (
            {"number": "640", "currency": "USD"},
            {"number": "600", "currency": "USD"},
            {"number": "40", "currency": "USD"},
        ),
        (
            {"number": "900", "currency": "EUR"},
            {"number": "840", "currency": "EUR"},
            {"number": "60", "currency": "EUR"},
        ),
    ]
    assert _reported_totals(data) == _booked_gains(ledger, tmp_path, "2026")
    assert _reported_totals(data) == {"USD": Decimal("40"), "EUR": Decimal("60")}
