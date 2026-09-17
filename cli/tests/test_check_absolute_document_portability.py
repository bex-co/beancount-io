"""Absolute document paths outside the ledger tree fail check (w3/351)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
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


def test_check_rejects_absolute_documents_outside_ledger_tree(tmp_path: Path) -> None:
    orig = tmp_path / "orig"
    copy = tmp_path / "copy-only"
    docs = orig / "docs"
    docs.mkdir(parents=True)
    copy.mkdir()
    attachment = docs / "invoice.pdf"
    attachment.write_bytes(b"%PDF-1.4 fake")
    abs_path = str(attachment.resolve())
    (orig / "main.bean").write_text(LEDGER + f'2020-03-01 document Expenses:Food "{abs_path}"\n')
    (copy / "main.bean").write_text((orig / "main.bean").read_text())

    orig_ok = _bea(tmp_path, "--file", str(orig / "main.bean"), "check")
    assert orig_ok.returncode == 0, orig_ok.stderr or orig_ok.stdout

    copied = _bea(tmp_path, "--file", str(copy / "main.bean"), "check")
    assert copied.returncode == 1, copied.stderr or copied.stdout
    assert (
        "outside the ledger" in (copied.stderr + copied.stdout).lower()
        or "portable" in (copied.stderr + copied.stdout).lower()
    )

    (copy / "main.bean").write_text(LEDGER + '2020-03-01 document Expenses:Food "docs/invoice.pdf"\n')
    missing = _bea(tmp_path, "--file", str(copy / "main.bean"), "check")
    assert missing.returncode == 1

    refused = _bea(
        tmp_path,
        "--file",
        str(orig / "main.bean"),
        "add",
        "document",
        "--date",
        "2020-04-01",
        "--account",
        "Expenses:Food",
        "--path",
        abs_path,
    )
    assert refused.returncode == 2
    assert "relative" in (refused.stderr + refused.stdout).lower()
