"""Directory --file hints prefer an existing main.beancount (w3/343)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
"""


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


def test_file_directory_hint_uses_existing_beancount(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.beancount").write_text(LEDGER)

    result = _bea(tmp_path, "--file", str(books), "check")
    assert result.returncode == 2
    text = result.stdout + result.stderr
    assert f"--file {books / 'main.beancount'}" in text or f"--file '{books / 'main.beancount'}'" in text
    assert "main.bean'" not in text and "main.bean " not in text.split("for example", 1)[-1]

    ok = _bea(tmp_path, "--file", str(books / "main.beancount"), "check")
    assert ok.returncode == 0, ok.stderr or ok.stdout
