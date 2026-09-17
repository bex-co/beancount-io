"""`list open` says an unrestricted account takes any currency (w3/361)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2020-01-01 open Assets:Cash USD
2020-01-01 open Assets:Broker
2020-01-01 open Assets:Multi USD,EUR
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


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _rows(stdout: str) -> dict[str, str]:
    """The CURRENCIES cell per account; a blank cell reads as the empty string."""
    rows: dict[str, str] = {}
    for line in stdout.splitlines():
        if not line.startswith("2020-"):
            continue
        parts = line.split(maxsplit=2)
        rows[parts[1]] = parts[2].strip() if len(parts) > 2 else ""
    return rows


def test_unrestricted_open_says_any(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "list", "open")
    assert result.returncode == 0, result.stderr
    rows = _rows(result.stdout)
    assert rows["Assets:Broker"] == "(any)"


def test_restricted_opens_are_unchanged(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "list", "open")
    assert result.returncode == 0, result.stderr
    rows = _rows(result.stdout)
    assert rows["Assets:Cash"] == "USD"
    assert rows["Assets:Multi"] == "USD, EUR"


def test_json_keeps_the_empty_list(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "--file", str(_ledger(tmp_path)), "list", "open")
    assert result.returncode == 0, result.stderr
    currencies = {row["account"]: row["currencies"] for row in json.loads(result.stdout)["data"]}
    assert currencies["Assets:Broker"] == []
    assert currencies["Assets:Cash"] == ["USD"]
