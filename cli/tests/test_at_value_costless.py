"""at_value must price costless @ lots when a price exists (w3/241)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Assets:Investments:HOOL HOOL
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
2024-03-01 price HOOL 10.5 USD
2024-03-03 * "buy"
  Assets:Investments:HOOL  2 HOOL @ 10.5 USD
  Assets:Bank:Checking
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


def test_at_value_prices_costless_lots(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    at_value = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "--conversion", "at_value")
    assert at_value.returncode == 0, at_value.stderr
    assert "Investments" in at_value.stdout
    assert "21.0 USD" in at_value.stdout
    # Priced costless lots should not leave bare HOOL on the asset line.
    investments = at_value.stdout.split("Investments", 1)[1].split("Liabilities", 1)[0]
    assert "HOOL" not in investments or "21.0 USD" in investments
    assert "2 HOOL" not in investments

    usd = _bea(tmp_path, "--file", str(ledger), "report", "balance-sheet", "--conversion", "USD")
    assert usd.returncode == 0, usd.stderr
    assert "21.0 USD" in usd.stdout
