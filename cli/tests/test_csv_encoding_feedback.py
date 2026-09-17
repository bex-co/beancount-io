"""Import discovery must name UTF-8 failures, not pretend columns are empty (w3/227)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


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


@pytest.fixture
def books(tmp_path: Path) -> Path:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "init",
            str(tmp_path / "books"),
            "--currency",
            "USD",
            "--date",
            "2024-01-01",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return tmp_path / "books" / "main.bean"


def test_latin1_csv_auto_names_utf8_failure(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(b"Date,Description,Amount\n2024-03-10,Caf\xe9,-4.50\n")
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(books),
            "import",
            str(export),
            "--csv",
            "auto",
            "--account",
            "Assets:Checking",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 2, result.stdout
    assert "not valid UTF-8" in result.stderr
    assert "(none)" not in result.stderr
    assert "Name them with --csv" not in result.stderr
