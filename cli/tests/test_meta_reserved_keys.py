"""--meta reserved keys get a specific usage error (w3/284)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
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


def test_reserved_meta_keys_named(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    for key in ("filename", "lineno"):
        result = _bea(
            tmp_path,
            "--json",
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2020-05-01",
            "--narration",
            "m",
            "--meta",
            f"{key}:x",
            "--posting",
            "Assets:Cash -1 USD",
            "--posting",
            "Expenses:Food 1 USD",
        )
        assert result.returncode == 2, result.stderr
        error = json.loads(result.stderr)["error"]
        assert "reserved" in error["message"].casefold()
        assert "key:value" not in error["message"]


def test_uppercase_meta_key_names_pattern(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-05-01",
        "--narration",
        "m",
        "--meta",
        "Filename:x",
        "--posting",
        "Assets:Cash -1 USD",
        "--posting",
        "Expenses:Food 1 USD",
    )
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert "lowercase" in error["message"].casefold() or "[a-z]" in error["message"]
