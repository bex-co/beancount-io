"""A period holding no foreign currency needs no foreign price (w5/790).

A settled pre-period currency trade leaves the clamp's summary pair split:
`Earnings:Previous` holds +100 USD while `Opening-Balances` holds the
offsetting -100 USD. Judged one by one, each leg demands a USD price; judged
by their combined balance the period values cleanly, and a made-up USD price
changes no total.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "EUR"
option "conversion_currency" "EUR"

2026-01-01 open Assets:Bank EUR
2026-01-01 open Assets:Wallet EUR, USD
2026-01-01 open Expenses:Food EUR, USD
2026-01-01 open Equity:Opening-Balances EUR, USD

2026-01-01 * "Seed"
  Assets:Bank 1000.00 EUR
  Equity:Opening-Balances

2026-01-10 * "Buy USD"
  Assets:Wallet 100.00 USD @ 0.92 EUR
  Assets:Bank

2026-01-12 * "Dinner"
  Expenses:Food 100.00 USD @ 0.92 EUR
  Assets:Wallet -100.00 USD @ 0.92 EUR

2026-02-10 * "Coffee"
  Expenses:Food 5.00 EUR
  Assets:Bank
"""


def _run(tmp_path: Path, *args: str, as_json: bool = False) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    command = [sys.executable, "-m", "cli.main"]
    if as_json:
        command.append("--json")
    return subprocess.run(
        [*command, "-f", "main.bean", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def test_cut_equity_pair_values_without_foreign_price(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    sheet = _run(tmp_path, "report", "balance-sheet", "-t", "2026-02", as_json=True)
    assert sheet.returncode == 0, sheet.stderr
    data = json.loads(sheet.stdout)["data"]

    assert data["valuation"] == "complete"
    assert data["missing_prices"] == []
    assert data["equity_reconciled"] is True
    assert data["net_worth"] == {"EUR": "903.0000"}

    balance = _run(tmp_path, "balance", "-t", "2026-02")
    assert balance.returncode == 0, balance.stderr

    trial = _run(tmp_path, "report", "trial-balance", "-t", "2026-02", as_json=True)
    assert trial.returncode == 0, trial.stderr
    assert json.loads(trial.stdout)["data"]["valuation"] == "complete"


def test_made_up_foreign_price_changes_no_total(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    plain = _run(tmp_path, "report", "balance-sheet", "-t", "2026-02", as_json=True)
    assert plain.returncode == 0, plain.stderr

    priced = LEDGER.replace('2026-02-10 * "Coffee"', '2026-01-11 price USD 0.50 EUR\n\n2026-02-10 * "Coffee"')
    (tmp_path / "main.bean").write_text(priced)
    with_price = _run(tmp_path, "report", "balance-sheet", "-t", "2026-02", as_json=True)
    assert with_price.returncode == 0, with_price.stderr
    whole = _run(tmp_path, "report", "balance-sheet", as_json=True)
    assert whole.returncode == 0, whole.stderr

    priced_data = json.loads(with_price.stdout)["data"]
    plain_data = json.loads(plain.stdout)["data"]
    whole_data = json.loads(whole.stdout)["data"]

    # Priced, the spent dollars need no plug, so the period splits equity as
    # the whole ledger does: `Opening-Balances` at its own -1,000.00 EUR and
    # the trade's difference from the price in the adjustment (w1/298).
    opening = next(node for node in priced_data["equity"]["children"] if node["account"] == "Equity:Opening-Balances")
    assert opening["balance"] == {"EUR": "-1000.00"}
    assert priced_data["valuation_adjustment"] == whole_data["valuation_adjustment"] == {"EUR": "42.0000"}
    # Only the equity split moves with the price; every total is identical to
    # the cent.
    assert priced_data.pop("equity") != plain_data.pop("equity")
    assert priced_data.pop("valuation_adjustment") != plain_data.pop("valuation_adjustment")
    assert priced_data == plain_data
