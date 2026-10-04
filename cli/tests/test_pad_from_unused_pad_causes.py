"""`add balance --pad-from` explains an unused pad truthfully (w1/116).

Any `Unused Pad` used to read as "book balance already matches": the write
retried without its pad and said so. But a pad goes unused for other reasons —
an existing pad already fills the assertion (padding real money), a staged pad
elsewhere is still waiting for its balance, or an intermediate assertion
consumes the pad before the one it was meant for. Each now gets its real cause.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TWO_CURRENCIES = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Checking USD,EUR
2026-01-01 open Equity:Opening
2026-01-01 open Equity:Other
2026-01-01 open Income:Salary
2026-01-05 * "Pay"
  Assets:Bank:Checking  1000.00 USD
  Income:Salary
2026-01-10 * "Euro"
  Assets:Bank:Checking  50 EUR
  Equity:Opening
2026-02-28 pad Assets:Bank:Checking Equity:Opening
2026-03-01 balance Assets:Bank:Checking  2000 USD
"""

STAGED_PAD = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Bank:Savings USD
2026-01-01 open Equity:Opening
2026-01-05 * "Seed"
  Assets:Bank:Savings  100 USD
  Equity:Opening
2026-01-31 pad Assets:Cash Equity:Opening
"""

INTERMEDIATE = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank:Savings USD
2026-01-01 open Equity:Opening
2026-02-01 balance Assets:Bank:Savings 0 USD
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
        timeout=120,
    )


def _ledger(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(text, encoding="utf-8")
    return path


def _balance(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "--json", "--file", str(ledger), "add", "balance", *args)


def test_an_existing_pad_filling_the_assertion_is_reported_with_its_amount(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, TWO_CURRENCIES)

    done = _balance(
        tmp_path,
        ledger,
        "--date",
        "2026-03-01",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "200 EUR",
        "--pad-from",
        "Equity:Opening",
    )

    assert done.returncode == 0, done.stderr
    data = json.loads(done.stdout)["data"]
    assert data["written"] == 1
    [warning] = data["warnings"]
    assert "already matches" not in warning
    assert "150 EUR" in warning
    assert f"{ledger}:12" in warning
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0


def test_an_existing_pad_from_another_account_refuses(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, TWO_CURRENCIES)
    before = ledger.read_bytes()

    done = _balance(
        tmp_path,
        ledger,
        "--date",
        "2026-03-01",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "200 EUR",
        "--pad-from",
        "Equity:Other",
    )

    assert done.returncode == 1, done.stdout
    error = json.loads(done.stderr)["error"]
    assert f"{ledger}:12" in error["message"]
    assert "already matches" not in json.dumps(error)
    assert ledger.read_bytes() == before


def test_a_staged_pad_is_named_instead_of_a_fabricated_balance_failure(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, STAGED_PAD)
    before = ledger.read_bytes()

    done = _balance(
        tmp_path,
        ledger,
        "--date",
        "2026-04-02",
        "--account",
        "Assets:Bank:Savings",
        "--amount",
        "200 USD",
        "--pad-from",
        "Equity:Opening",
    )

    assert done.returncode == 1, done.stdout
    error = json.loads(done.stderr)["error"]
    text = json.dumps(error)
    assert "staged pad" in error["message"]
    assert "2026-01-31 pad Assets:Cash Equity:Opening" in text
    assert f"{ledger}:8" in text
    assert "Balance failed" not in text
    assert ledger.read_bytes() == before


def test_an_intermediate_assertion_is_named_not_already_matches(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, INTERMEDIATE)

    done = _balance(
        tmp_path,
        ledger,
        "--date",
        "2026-03-01",
        "--pad-date",
        "2026-01-15",
        "--account",
        "Assets:Bank:Savings",
        "--amount",
        "700 USD",
        "--pad-from",
        "Equity:Opening",
    )

    assert done.returncode == 1, done.stdout
    text = json.dumps(json.loads(done.stderr)["error"])
    assert "already matches" not in text
    assert f"{ledger}:4" in text
    assert "Date the pad after 2026-02-01" in text


def test_a_pad_after_the_intermediate_assertion_still_succeeds(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, INTERMEDIATE)

    done = _balance(
        tmp_path,
        ledger,
        "--date",
        "2026-03-01",
        "--pad-date",
        "2026-02-15",
        "--account",
        "Assets:Bank:Savings",
        "--amount",
        "700 USD",
        "--pad-from",
        "Equity:Opening",
    )

    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["written"] == 2
