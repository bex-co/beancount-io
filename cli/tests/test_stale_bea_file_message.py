"""Stale $BEA_FILE must not suggest cwd main.bean discovery (w3/340)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-03-01 * "Coffee"
  Expenses:Food  4.50 USD
  Assets:Cash
"""


def _bea(tmp_path: Path, env_extra: dict[str, str], *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        **env_extra,
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_stale_bea_file_error_omits_cwd_discovery_hint(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    missing = tmp_path / "missing.bean"
    result = _bea(tmp_path, {"BEA_FILE": str(missing)}, "list", "transaction")
    assert result.returncode == 2, result.stderr or result.stdout
    text = result.stdout + result.stderr
    assert "$BEA_FILE" in text
    assert "Unset or fix BEA_FILE" in text or "fix BEA_FILE" in text
    assert "run from a directory containing" not in text

    ok = _bea(tmp_path, {"BEA_FILE": str(tmp_path / "main.bean")}, "list", "transaction")
    assert ok.returncode == 0, ok.stderr or ok.stdout
    assert "Coffee" in ok.stdout
