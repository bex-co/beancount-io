"""--json format -i on an empty tree must emit an envelope (w3/249)."""

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


def test_json_in_place_empty_dir_emits_envelope(tmp_path: Path) -> None:
    empty = tmp_path / "emptydir"
    empty.mkdir()
    result = _bea(tmp_path, "--json", "format", "-i", str(empty))
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    data = payload["data"]
    assert data.get("scanned") == 0
    assert data.get("formatted") == []
    assert data.get("in_place") is True
