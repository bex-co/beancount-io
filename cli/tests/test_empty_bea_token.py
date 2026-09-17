"""Empty BEA_TOKEN= must read as not logged in (w3/271)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
        timeout=30,
    )


def test_empty_bea_token_is_not_logged_in(tmp_path: Path) -> None:
    unset = _bea(tmp_path, {}, "cloud", "status")
    empty = _bea(tmp_path, {"BEA_TOKEN": ""}, "cloud", "status")
    assert unset.returncode == 3
    assert empty.returncode == 3
    assert "Not logged in" in empty.stderr
    assert "whitespace" not in empty.stderr.casefold()


def test_whitespace_token_still_named(tmp_path: Path) -> None:
    spaced = _bea(tmp_path, {"BEA_TOKEN": " "}, "cloud", "status")
    assert spaced.returncode == 3
    assert "whitespace" in spaced.stderr.casefold() or "control" in spaced.stderr.casefold()
