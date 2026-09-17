"""list pad --account matches SOURCE as well as ACCOUNT (w3/285)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 pad Assets:Cash Equity:Opening
2024-01-03 balance Assets:Cash 100 USD
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


def test_list_pad_account_matches_source(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    by_source = _bea(tmp_path, "--json", "--file", str(ledger), "list", "pad", "--account", "Equity")
    assert by_source.returncode == 0, by_source.stderr
    rows = json.loads(by_source.stdout)["data"]
    assert len(rows) == 1
    assert rows[0]["source_account"] == "Equity:Opening"

    by_padded = _bea(tmp_path, "--json", "--file", str(ledger), "list", "pad", "--account", "Cash")
    assert by_padded.returncode == 0, by_padded.stderr
    assert len(json.loads(by_padded.stdout)["data"]) == 1
