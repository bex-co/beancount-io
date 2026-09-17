"""list open exposes booking method when present (w3/290)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Brokerage HOOL "FIFO"
2020-01-01 open Assets:Cash USD
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


def test_list_open_includes_booking_method(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "list", "open")
    assert result.returncode == 0, result.stderr or result.stdout
    by_account = {row["account"]: row for row in json.loads(result.stdout)["data"]}
    assert by_account["Assets:Brokerage"]["booking"] == "FIFO"
    assert by_account["Assets:Cash"]["booking"] is None

    human = _bea(tmp_path, "--file", str(ledger), "list", "open")
    assert human.returncode == 0, human.stderr or human.stdout
    assert "BOOKING" in human.stdout
    assert "FIFO" in human.stdout
