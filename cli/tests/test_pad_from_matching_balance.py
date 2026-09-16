"""Matching --pad-from must not circular-hint Unused Pad (w3/224)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  3357.83 USD
  Equity:Opening-Balances
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_matching_pad_from_writes_balance_alone(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--json",
        "--file",
        str(ledger),
        "add",
        "balance",
        "--date",
        "2024-03-10",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "3357.83 USD",
        "--pad-from",
        "Equity:Opening-Balances",
    )
    assert result.returncode == 0, result.stderr
    envelope = json.loads(result.stdout)
    assert envelope["data"]["written"] == 1
    assert any("omit" in w.lower() or "omitted" in w.lower() for w in envelope["data"]["warnings"])
    assert "pad-from" in " ".join(envelope["data"]["warnings"]).lower()
    text = ledger.read_text()
    assert "2024-03-10 balance Assets:Bank:Checking" in text and "3357.83 USD" in text
    assert "pad Assets:Bank:Checking" not in text
    assert "Add both directives atomically" not in result.stderr


def test_mismatching_pad_from_still_writes_both(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--json",
        "--file",
        str(ledger),
        "add",
        "balance",
        "--date",
        "2024-03-10",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "3000.00 USD",
        "--pad-from",
        "Equity:Opening-Balances",
    )
    assert result.returncode == 0, result.stderr
    envelope = json.loads(result.stdout)
    assert envelope["data"]["written"] == 2
    text = ledger.read_text()
    assert "pad Assets:Bank:Checking" in text
    assert "2024-03-10 balance Assets:Bank:Checking" in text and "3000.00 USD" in text
