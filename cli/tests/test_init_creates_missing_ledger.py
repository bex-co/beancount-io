"""bea init must create a ledger that does not exist yet (regression after w3/264)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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


def test_init_creates_main_bean_in_empty_directory(tmp_path: Path) -> None:
    books = tmp_path / "books"
    result = _bea(tmp_path, "--json", "init", str(books), "--currency", "USD", "--date", "2026-08-01")
    assert result.returncode == 0, result.stderr or result.stdout
    ledger = books / "main.bean"
    assert ledger.is_file()
    data = json.loads(result.stdout)["data"]
    assert data["created"] == str(ledger)
    assert data["currency"] == "USD"
    assert "Assets:Checking" in data["accounts"]
