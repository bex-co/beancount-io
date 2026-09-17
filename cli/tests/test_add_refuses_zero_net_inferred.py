"""Refuse zero-net adds with an inferred balancing leg (w3/339)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

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


def test_add_refuses_zero_net_inferred_balancing_posting(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    before = ledger.read_text()

    refused = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-01",
        "--narration",
        "z",
        "--posting",
        "Expenses:Food 0 USD",
        "--posting",
        "Assets:Cash",
    )
    assert refused.returncode == 2, refused.stderr or refused.stdout
    assert "zero-net" in (refused.stderr + refused.stdout).lower()
    assert ledger.read_text() == before

    explicit = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-01",
        "--narration",
        "z",
        "--posting",
        "Expenses:Food 0 USD",
        "--posting",
        "Assets:Cash 0 USD",
    )
    assert explicit.returncode == 0, explicit.stderr or explicit.stdout
    listed = _bea(tmp_path, "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0
    assert "Assets:Cash" in listed.stdout
    assert "Expenses:Food" in listed.stdout

    inferred = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-02",
        "--narration",
        "food",
        "--posting",
        "Expenses:Food 5 USD",
        "--posting",
        "Assets:Cash",
    )
    assert inferred.returncode == 0, inferred.stderr or inferred.stdout
