"""`bea treeify` fails loudly when upstream finds no column to render (w1/m23/t006)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

ALIGNED = "Assets:Bank:Checking               100\nAssets:Cash                       25\n"


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_treeify_no_column_exits_nonzero_and_names_target(tmp_path: Path) -> None:
    result = _bea(tmp_path, "treeify", stdin="hello\nworld\n")
    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    assert "Could not find any valid column in input" in result.stderr
    assert "no hierarchical column" in result.stderr


def test_treeify_success_path_renders_tree(tmp_path: Path) -> None:
    result = _bea(tmp_path, "treeify", stdin=ALIGNED)
    assert result.returncode == 0, result.stderr
    assert "`-- Assets" in result.stdout
