"""Reject date-shaped --meta values that are not valid calendar dates (w3/347)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
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


def test_add_meta_rejects_invalid_calendar_date(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    before = ledger.read_text()

    bad = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-08-01",
        "-n",
        "bad",
        "--meta",
        "received: 2020-13-01",
        "-p",
        "Expenses:Food 1 USD",
        "-p",
        "Assets:Cash",
    )
    assert bad.returncode == 2, bad.stderr or bad.stdout
    assert "calendar date" in (bad.stderr + bad.stdout).lower() or "not a valid" in (bad.stderr + bad.stdout).lower()
    assert ledger.read_text() == before

    good = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-08-01",
        "-n",
        "ok",
        "--meta",
        "received: 2020-01-15",
        "-p",
        "Expenses:Food 1 USD",
        "-p",
        "Assets:Cash",
    )
    assert good.returncode == 0, good.stderr or good.stdout
    assert 'received: "2020-01-15"' not in ledger.read_text()
    assert "received: 2020-01-15" in ledger.read_text()


def _add_with_meta(tmp_path: Path, ledger: Path, meta: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        *("--file", str(ledger), "add", "transaction", "--date", "2026-01-05", "--payee", "P"),
        *("--posting", "Expenses:Food 5 USD", "--posting", "Assets:Cash", "--meta", meta),
    )


@pytest.mark.parametrize("value", ["2026/02/30", "2026-2-30", "2026/13/1"])
def test_slash_and_unpadded_impossible_dates_are_refused(tmp_path: Path, value: str) -> None:
    """w1/164: Beancount's date grammar takes `/` and unpadded parts; they were stored as text."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    bad = _add_with_meta(tmp_path, ledger, f"when:{value}")

    assert bad.returncode == 2, bad.stderr or bad.stdout
    assert "not a valid calendar date" in bad.stderr
    assert ledger.read_text() == LEDGER


def test_a_valid_slash_date_is_still_a_date(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    good = _add_with_meta(tmp_path, ledger, "when:2026/2/3")

    assert good.returncode == 0, good.stderr or good.stdout
    assert "when: 2026-02-03" in ledger.read_text()
