"""add open --booking writes FIFO/STRICT onto the open line (w3/306)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
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


def test_add_open_booking_fifo(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "open",
        "--date",
        "2020-01-01",
        "--account",
        "Assets:Broker",
        "--currency",
        "HOOL",
        "--booking",
        "FIFO",
    )
    assert result.returncode == 0, result.stderr or result.stdout
    text = ledger.read_text()
    assert 'open Assets:Broker HOOL "FIFO"' in text or "open Assets:Broker HOOL FIFO" in text

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "open")
    assert listed.returncode == 0, listed.stderr or listed.stdout
    import json

    rows = json.loads(listed.stdout)["data"]
    assert any(row["account"] == "Assets:Broker" and row.get("booking") == "FIFO" for row in rows)
