"""Cwd discovery accepts main.beancount when main.bean is absent (w3/307)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
"""


def _bea(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(cwd / "config"),
        XDG_CACHE_HOME=str(cwd / "cache"),
        XDG_DATA_HOME=str(cwd / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    env.pop("BEA_FILE", None)
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_cwd_discovers_main_beancount(tmp_path: Path) -> None:
    (tmp_path / "main.beancount").write_text(LEDGER)
    result = _bea(tmp_path, "--json", "list", "open")
    assert result.returncode == 0, result.stderr or result.stdout
    rows = json.loads(result.stdout)["data"]
    assert any(row["account"] == "Assets:Cash" for row in rows)


def test_cwd_prefers_main_bean_when_both_exist(tmp_path: Path) -> None:
    (tmp_path / "main.beancount").write_text(LEDGER)
    (tmp_path / "main.bean").write_text('option "operating_currency" "USD"\n2020-01-01 open Assets:Preferred USD\n')
    result = _bea(tmp_path, "--json", "list", "open")
    assert result.returncode == 0, result.stderr or result.stdout
    rows = json.loads(result.stdout)["data"]
    assert any(row["account"] == "Assets:Preferred" for row in rows)
    assert not any(row["account"] == "Assets:Cash" for row in rows)
