"""--output to a directory must be a clear usage error (w3/250)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Cash  1 USD
  Equity:Opening-Balances
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


def test_json_format_output_dir_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    outdir = tmp_path / "outdir"
    outdir.mkdir()
    result = _bea(tmp_path, "--json", "--file", str(ledger), "format", "-o", str(outdir))
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "directory" in error["message"].casefold()
    assert "Errno" not in error["message"]
    assert "Is a directory" not in error["message"] or "must be a file" in error["message"].casefold()


def test_json_query_output_dir_is_usage_error(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    outdir = tmp_path / "outdir"
    outdir.mkdir()
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "query",
        "SELECT account LIMIT 1",
        "-o",
        str(outdir),
    )
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "directory" in error["message"].casefold()
    assert ".tmp" not in error["message"]
    assert "Errno" not in error["message"]
