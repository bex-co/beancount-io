"""format -i must name the path on non-UTF-8 decode failure (w3/251)."""

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


def test_in_place_names_binary_bean_path(tmp_path: Path) -> None:
    tree = tmp_path / "fmtdir"
    tree.mkdir()
    (tree / "good.bean").write_text(
        '2024-01-01 open Assets:X USD\n2024-01-02 * "ok"\n  Assets:X 1 USD\n  Equity:Y -1 USD\n'
    )
    bad = tree / "bin.bean"
    bad.write_bytes(b"2024-01-01 open Assets:X USD\n\x00\xff\xfe")
    result = _bea(tmp_path, "--json", "format", "-i", str(tree))
    assert result.returncode != 0
    error = json.loads(result.stderr)["error"]
    assert "bin.bean" in error["message"]
    assert "UTF-8" in error["message"] or "utf-8" in error["message"].casefold()
