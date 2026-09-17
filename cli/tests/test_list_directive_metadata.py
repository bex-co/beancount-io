"""list commodity/note/event/open/custom/document include user metadata (w3/289)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 commodity HOOL
  name: "Hollowood"
  asset-class: "stock"
2020-01-01 open Assets:Cash USD
  friendly: "Cash"
2020-01-01 note Assets:Cash "hello"
  author: "qa"
2020-01-01 event "location" "SF"
  source: "manual"
2020-01-01 document Assets:Cash "receipt.pdf"
  scanned: TRUE
2020-02-01 custom "budget" TRUE 1000
  note: "q1"
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


def test_list_directives_include_user_metadata(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"%PDF")

    cases = {
        "commodity": ("name", "Hollowood"),
        "note": ("author", "qa"),
        "event": ("source", "manual"),
        "open": ("friendly", "Cash"),
        "custom": ("note", "q1"),
        "document": ("scanned", True),
    }
    for kind, (key, expected) in cases.items():
        result = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind)
        assert result.returncode == 0, f"{kind}: {result.stderr or result.stdout}"
        rows = json.loads(result.stdout)["data"]
        assert rows, kind
        assert rows[0].get("meta", {}).get(key) == expected, (kind, rows[0])
        assert "filename" not in rows[0].get("meta", {})
        assert "lineno" not in rows[0].get("meta", {})
