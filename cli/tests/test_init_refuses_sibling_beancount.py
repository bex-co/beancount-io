"""init must not create main.bean beside existing main.beancount (w3/346)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXISTING = 'option "title" "My Books"\n2020-01-01 open Assets:Cash USD\n'


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


def test_init_refuses_beside_existing_main_beancount(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    beancount = books / "main.beancount"
    beancount.write_text(EXISTING)
    before = beancount.read_bytes()

    result = _bea(tmp_path, "--no-input", "init", str(books), "--currency", "USD")
    assert result.returncode == 4, result.stderr or result.stdout
    assert "main.beancount" in (result.stderr + result.stdout)
    assert not (books / "main.bean").exists()
    assert beancount.read_bytes() == before

    empty = tmp_path / "empty"
    empty.mkdir()
    ok = _bea(tmp_path, "--no-input", "init", str(empty), "--currency", "USD")
    assert ok.returncode == 0, ok.stderr or ok.stdout
    assert (empty / "main.bean").is_file()
