"""--into under an include glob may create a new matching file (w3/228)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

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


def test_into_creates_file_covered_by_include_glob(tmp_path: Path) -> None:
    books = tmp_path / "books"
    (books / "txns").mkdir(parents=True)
    (books / "main.bean").write_text(
        'option "operating_currency" "USD"\ninclude "accounts.bean"\ninclude "txns/*.bean"\n'
    )
    (books / "accounts.bean").write_text(
        "2024-01-01 open Assets:Bank:Checking USD\n"
        "2024-01-01 open Expenses:Food USD\n"
        "2024-01-01 open Equity:Opening-Balances USD\n"
        '2024-01-01 * "Opening"\n'
        "  Assets:Bank:Checking  100 USD\n"
        "  Equity:Opening-Balances\n"
    )
    (books / "txns" / "a.bean").write_text('2024-02-01 * "A"\n  Expenses:Food  1 USD\n  Assets:Bank:Checking\n')
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--json",
            "--file",
            str(books / "main.bean"),
            "add",
            "transaction",
            "--date",
            "2024-02-02",
            "--narration",
            "B",
            "--posting",
            "Expenses:Food 2 USD",
            "--posting",
            "Assets:Bank:Checking",
            "--into",
            "txns/b.bean",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert "include directive" not in result.stderr
    written = (books / "txns" / "b.bean").read_text()
    assert '2024-02-02 * "B"' in written
