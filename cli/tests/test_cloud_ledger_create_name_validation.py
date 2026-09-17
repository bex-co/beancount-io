"""`cloud ledger create` checks the name before credentials (w3/356)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run signed out: BEA_CONFIG_DIR points at an empty directory."""
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
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_invalid_name_is_a_usage_error_not_an_auth_error(tmp_path: Path) -> None:
    result = _bea(tmp_path, "cloud", "ledger", "create", "UPPERCASE")
    assert result.returncode == 2, result.stderr
    assert "not a valid ledger name" in result.stderr
    assert "lowercase letters, digits, hyphens and underscores" in result.stderr
    assert "Not logged in" not in result.stderr


def test_the_error_suggests_a_usable_name(tmp_path: Path) -> None:
    result = _bea(tmp_path, "cloud", "ledger", "create", "My Ledger")
    assert result.returncode == 2, result.stderr
    assert "Try 'my-ledger'." in result.stderr


def test_json_callers_get_the_usage_category(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "cloud", "ledger", "create", "Not A Slug")
    assert result.returncode == 2
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert error["exit_code"] == 2


def test_a_name_over_the_length_limit_is_refused(tmp_path: Path) -> None:
    result = _bea(tmp_path, "cloud", "ledger", "create", "a" * 101)
    assert result.returncode == 2, result.stderr
    assert "at most 100 characters" in result.stderr


def test_a_valid_name_still_reaches_the_auth_gate(tmp_path: Path) -> None:
    # Signed out, so this stops at credentials — it never reaches the service.
    result = _bea(tmp_path, "cloud", "ledger", "create", "ok-name_1")
    assert result.returncode == 3, result.stdout + result.stderr
    assert "not a valid ledger name" not in result.stderr
