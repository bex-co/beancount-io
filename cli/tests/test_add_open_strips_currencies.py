"""add open --currency strips padding and rejects blank-only tokens (w3/341)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
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
        timeout=60,
    )


def test_add_open_strips_and_drops_blank_currencies(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    spaced = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "open",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Spaced",
        "--currency",
        " USD ",
        "--currency",
        "EUR",
    )
    assert spaced.returncode == 0, spaced.stderr or spaced.stdout
    assert "open Assets:Spaced USD,EUR" in ledger.read_text()

    mixed = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "open",
        "--date",
        "2024-02-02",
        "--account",
        "Assets:Mixed",
        "--currency",
        "   ",
        "--currency",
        "USD",
    )
    assert mixed.returncode == 0, mixed.stderr or mixed.stdout
    assert "open Assets:Mixed USD\n" in ledger.read_text()

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "open", "--account", "Spaced")
    assert listed.returncode == 0
    rows = json.loads(listed.stdout)["data"]
    assert rows[0]["currencies"] == ["USD", "EUR"]

    blank_only = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "open",
        "--date",
        "2024-02-03",
        "--account",
        "Assets:Blank",
        "--currency",
        "   ",
    )
    assert blank_only.returncode == 2
    assert "blank" in (blank_only.stderr + blank_only.stdout).lower()
