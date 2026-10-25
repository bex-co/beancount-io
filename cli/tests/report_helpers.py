"""Shared subprocess runners for the capital-gains tests (w22/m4/t005).

One isolated environment builder, one `bea-engine` runner, one `bea`
runner, and one ledger writer — the three gains test files used to
carry their own copies.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

CLI_ROOT = Path(__file__).resolve().parents[1]


def run_env(tmp_path: Path) -> dict[str, str]:
    """An environment with isolated config, cache, and data directories."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(CLI_ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def write_ledger(tmp_path: Path, text: str) -> Path:
    """Write a ledger to the test's scratch directory."""
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def _run(argv: list[str], env: dict[str, str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, env=env, cwd=cwd, capture_output=True, text=True, timeout=300, check=False)


def engine(argv: list[str], tmp_path: Path) -> subprocess.CompletedProcess[str]:
    """Run `bea-engine` on the project interpreter."""
    return _run(
        ["uv", "run", "--quiet", "--project", str(CLI_ROOT), "--no-sync", "python", "-m", "bea_engine", *argv],
        run_env(tmp_path),
        CLI_ROOT,
    )


def bea(argv: list[str], tmp_path: Path) -> subprocess.CompletedProcess[str]:
    """Run `bea` from the test's scratch directory."""
    return _run([sys.executable, "-m", "cli.main", *argv], run_env(tmp_path), tmp_path)


def engine_json(argv: list[str], tmp_path: Path) -> dict[str, Any]:
    """Run `bea-engine`, assert success, and return the parsed payload."""
    proc = engine(argv, tmp_path)
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True, payload
    return payload
