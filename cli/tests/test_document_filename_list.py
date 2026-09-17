"""Document list filename must match relative add --path (w3/244)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
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


def test_relative_document_path_round_trips_list(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"x")
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "document",
        "--date",
        "2024-03-01",
        "--account",
        "Assets:Bank:Checking",
        "--path",
        "receipt.pdf",
    )
    assert added.returncode == 0, added.stderr
    added_name = json.loads(added.stdout)["data"]["directive"]["filename"]
    assert added_name == "receipt.pdf"

    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "document")
    assert listed.returncode == 0, listed.stderr
    rows = json.loads(listed.stdout)["data"]
    assert rows
    assert rows[0]["filename"] == "receipt.pdf"


def test_absolute_document_path_still_lists(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    receipt = tmp_path / "abs-receipt.pdf"
    receipt.write_bytes(b"x")
    added = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "document",
        "--date",
        "2024-03-02",
        "--account",
        "Assets:Bank:Checking",
        "--path",
        str(receipt),
    )
    assert added.returncode == 0, added.stderr
    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "document")
    assert listed.returncode == 0, listed.stderr
    names = [row["filename"] for row in json.loads(listed.stdout)["data"]]
    assert str(receipt) in names or "abs-receipt.pdf" in names
