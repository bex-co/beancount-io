"""JSON check must refuse bean-check-only flags as usage errors (w3/222)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Checking  1 USD
  Equity:Opening-Balances
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


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


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


@pytest.mark.parametrize("extra", ["-v", "--auto", "--not-a-real-flag"])
def test_json_check_refuses_native_only_flags(ledger: Path, extra: str) -> None:
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "check", extra)
    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert extra in error["message"]
    assert "Drop --json" in error["message"]
    assert "engine did not answer" not in error["message"]


def test_json_check_without_extra_args_still_emits_envelope(ledger: Path) -> None:
    result = _bea(ledger.parent, "--json", "--file", str(ledger), "check")
    assert result.returncode == 0, result.stderr
    envelope = json.loads(result.stdout)
    assert envelope["data"]["valid"] is True


def test_human_check_verbose_still_runs_bean_check(ledger: Path) -> None:
    result = _bea(ledger.parent, "--file", str(ledger), "check", "-v")
    assert result.returncode == 0, result.stderr
    assert "Operation:" in result.stderr or "Operation:" in result.stdout
