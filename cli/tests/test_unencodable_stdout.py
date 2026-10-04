"""A write that landed exits 0 even when stdout cannot encode its path (w1/104).

stdout is strict by default, so under an ASCII locale (or Windows cp1252 with
CJK paths) the confirmation naming a non-ASCII ledger raised after the write,
exited 1, and a retry duplicated the entry.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[bytes]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        PYTHONIOENCODING="ascii",
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        timeout=120,
    )


def test_a_write_to_a_non_ascii_path_exits_zero_once(tmp_path: Path) -> None:
    books = tmp_path / "ü"
    books.mkdir()
    ledger = books / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Bank USD\n2024-01-01 open Expenses:Café USD\n',
        encoding="utf-8",
    )
    args = ["--file", str(ledger), "add", "transaction", "--date", "2024-02-01", "--narration", "x"]
    args += ["--posting", "Expenses:Café 1 USD", "--posting", "Assets:Bank"]

    done = _bea(tmp_path, *args)

    assert done.returncode == 0, done.stderr
    assert b"Added 1 transaction" in done.stdout
    assert b"\\xfc" in done.stdout  # escaped, not a crash
    assert ledger.read_text(encoding="utf-8").count('2024-02-01 * "x"') == 1
