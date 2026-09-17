"""Required add string fields reject empty values (w3/255)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
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


def test_empty_required_strings_are_usage_errors(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    before = LEDGER
    ledger.write_text(before)
    cases = [
        ("event", ["--date", "2024-05-01", "--type", "", "--description", "x"]),
        ("note", ["--date", "2024-05-01", "--account", "Assets:Cash", "--comment", ""]),
        ("custom", ["--date", "2024-05-03", "--type", "", "--value", "text:x"]),
        ("document", ["--date", "2024-05-04", "--account", "Assets:Cash", "--path", ""]),
    ]
    for name, args in cases:
        result = _bea(tmp_path, "--json", "--file", str(ledger), "add", name, *args)
        assert result.returncode == 2, (name, result.stderr)
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage", name
        assert "non-empty" in error["message"].casefold() or "empty" in error["message"].casefold()
        assert ledger.read_text() == before
