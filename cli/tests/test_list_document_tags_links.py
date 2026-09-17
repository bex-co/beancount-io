"""list document human table shows tags and links (w3/316)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2024-06-01 document Assets:Cash "receipts/a.pdf" #trip ^inv-001
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
        timeout=30,
    )


def test_list_document_human_shows_tags_and_links(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    receipts = tmp_path / "receipts"
    receipts.mkdir()
    (receipts / "a.pdf").write_bytes(b"%PDF")
    human = _bea(tmp_path, "--file", str(ledger), "list", "document")
    assert human.returncode == 0, human.stderr or human.stdout
    assert "#trip" in human.stdout
    assert "^inv-001" in human.stdout
