"""Multi-file format without -i must be a clear bea usage error (w3/239)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
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


def test_multi_file_stdout_is_usage_error(tmp_path: Path) -> None:
    a = tmp_path / "a.bean"
    b = tmp_path / "b.bean"
    a.write_text(LEDGER)
    b.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "format", str(a), str(b))
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "--in-place" in error["message"] or "-i" in error["message"]
    assert "bean-format" not in error["message"]


def test_multi_file_in_place_still_works(tmp_path: Path) -> None:
    a = tmp_path / "a.bean"
    b = tmp_path / "b.bean"
    a.write_text("2024-01-01 open Assets:Cash USD\n")
    b.write_text("2024-01-01 open Assets:Bank USD\n")
    result = _bea(tmp_path, "format", "-i", str(a), str(b))
    assert result.returncode == 0, result.stderr
