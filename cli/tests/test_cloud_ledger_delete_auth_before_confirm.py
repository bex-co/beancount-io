"""cloud ledger delete must fail auth before asking for --yes (w3/337)."""

from __future__ import annotations

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
        timeout=60,
    )


def test_cloud_ledger_delete_auth_before_confirm(tmp_path: Path) -> None:
    unsigned = _bea(tmp_path, "cloud", "ledger", "delete", "user/name")
    assert unsigned.returncode == 3, unsigned.stderr or unsigned.stdout
    text = unsigned.stdout + unsigned.stderr
    assert "Not logged in" in text
    assert "--yes" not in text

    bad_name = _bea(tmp_path, "cloud", "ledger", "delete", "not-a-full-name")
    assert bad_name.returncode == 2, bad_name.stderr or bad_name.stdout
