"""A mapped CSV currency cell must be one commodity token (w1/060).

The cell went straight into both postings' amounts and was printed bare, so a
bank row whose currency held line breaks and ledger text imported as several
transactions and events — a valid ledger, so preview, apply and `bea check`
all exited 0. The cell is now refused with its row and column before any
preview or write; valid commodities, including on accounts that permit any
commodity, keep importing.
"""

from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
include "accounts.bean"
"""
ACCOUNTS = """2025-01-01 open Assets:Cash
2025-01-01 open Expenses:Food
2025-01-01 open Equity:Opening
"""
MAPPING = "date=Date,narration=Description,amount=Amount,currency=Currency"
INJECTED = 'USD\n  Equity:Opening\n2025-01-02 event "marker" "injected"\n2025-05-01 * "extra"'


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
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    (tmp_path / "accounts.bean").write_text(ACCOUNTS, encoding="utf-8")
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _csv(tmp_path: Path, rows: list[tuple[str, str, str, str]]) -> Path:
    path = tmp_path / "bank.csv"
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(["Date", "Description", "Amount", "Currency"])
        writer.writerows(rows)
    return path


def _import(tmp_path: Path, ledger: Path, source: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        MAPPING,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *extra,
    )


@pytest.mark.parametrize("apply", [False, True], ids=["preview", "apply"])
@pytest.mark.parametrize(
    "currency", [INJECTED, "US D", "EUR,GBP", "USD\nEUR"], ids=["directives", "space", "comma", "newline"]
)
def test_a_currency_cell_that_is_not_one_commodity_is_refused(
    tmp_path: Path, ledger: Path, currency: str, apply: bool
) -> None:
    source = _csv(tmp_path, [("2025-05-01", "Shop", "-5", "EUR"), ("2025-05-02", "Cafe", "-3", currency)])
    result = _import(tmp_path, ledger, source, *(["--apply"] if apply else []))
    assert result.returncode == 2, result.stdout + result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert error["message"].startswith("Row 2 (line 3), column 'Currency': ")
    assert "is not one commodity" in error["message"]
    assert result.stdout == ""
    assert ledger.read_text(encoding="utf-8") == LEDGER
    assert (tmp_path / "accounts.bean").read_text(encoding="utf-8") == ACCOUNTS


def test_valid_commodities_import_on_unrestricted_accounts(tmp_path: Path, ledger: Path) -> None:
    rows = [
        ("2025-05-01", "Shop", "-5", "USD"),
        ("2025-05-02", "Cafe", "-3", "EUR"),
        ("2025-05-03", "Fund", "-2", "VFIAX"),
        ("2025-05-04", "Stock", "-1", "NT.TO"),
    ]
    result = _import(tmp_path, ledger, _csv(tmp_path, rows), "--apply")
    assert result.returncode == 0, result.stderr
    added = ledger.read_text(encoding="utf-8").removeprefix(LEDGER)
    for _date, _narration, amount, commodity in rows:
        assert re.search(rf"\n  Assets:Cash +{amount} {re.escape(commodity)}\n", added), added
    assert added.count("Assets:Cash") == len(rows)
    assert "event" not in added
    assert (tmp_path / "accounts.bean").read_text(encoding="utf-8") == ACCOUNTS
